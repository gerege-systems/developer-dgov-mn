// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package middlewares

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/redis/go-redis/v9"
)

// HMAC header нэрс. Илгээгч 3-уулыг хамт явуулна:
//
//	X-Gerege-Timestamp  — unix seconds (UTC); ±skewWindow дотор байх ёстой.
//	X-Gerege-Nonce      — хүсэлт бүрт цор ганц (UUID/16+байт hex); Redis дээр
//	                      replayWindow хугацаагаар тэмдэглэнэ.
//	X-Gerege-Signature  — hex(HMAC-SHA256(secret, timestamp + "\n" + raw_body)).
const (
	HMACTimestampHeader = "X-Gerege-Timestamp"
	HMACNonceHeader     = "X-Gerege-Nonce"
	HMACSignatureHeader = "X-Gerege-Signature"

	// ±5 минутын skew зөвшөөрнө — clock-drift-д тэвчээртэй, replay window-г
	// богино байлгана.
	hmacSkewWindow = 5 * time.Minute
	// Nonce-ийг 2× skew window TTL-тэйгээр Redis-д хадгална — алгасахгүйгээр
	// replay хаахад хангалттай хугацаа.
	hmacNonceTTL = 10 * time.Minute
	// Nonce-ийн уртын хязгаар (UUID, hex, гэх мэт). DoS-аас сэргийлэх дээд
	// хэмжээ; илгээгчийн форматтай уях шаардлагагүй.
	hmacNonceMaxLen = 128
)

// NewHMACMiddleware нь webhook (банкны gateway top-up зэрэг server-to-server)
// хүсэлтийг дундын нууцаар баталгаажуулна. Timestamp ±5min, nonce-replay
// (Redis TTL), HMAC-SHA256(secret, timestamp + "\n" + body) — гурвыг хамт
// шалгана. Аль нэг нь дутуу/буруу бол 401-ээр татгалзана (fail-closed).
//
// rdb nil бол nonce-replay шалгалт алгасна (warn-level — production-д Redis
// заавал шаардлагатай). secret хоосон бол энэ middleware-ийг суулгахгүй —
// дуудагч endpoint-ийг бүртгэхгүй.
func NewHMACMiddleware(secret string, rdb *redis.Client) fiber.Handler {
	key := []byte(secret)
	return func(c fiber.Ctx) error {
		// 1) Timestamp — байгаа эсэх + skew window дотор уу.
		tsStr := c.Get(HMACTimestampHeader)
		if tsStr == "" {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "missing timestamp"})
		}
		tsSec, err := strconv.ParseInt(tsStr, 10, 64)
		if err != nil {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "invalid timestamp"})
		}
		ts := time.Unix(tsSec, 0)
		now := time.Now()
		if diff := now.Sub(ts); diff < -hmacSkewWindow || diff > hmacSkewWindow {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "timestamp out of window"})
		}

		// 2) Nonce — байх + Redis-д өмнө нь үзэгдээгүй байх.
		nonce := c.Get(HMACNonceHeader)
		if nonce == "" || len(nonce) > hmacNonceMaxLen {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "missing or oversized nonce"})
		}

		// 3) Signature — байх + recompute = provided.
		provided := c.Get(HMACSignatureHeader)
		if provided == "" {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "missing signature"})
		}
		mac := hmac.New(sha256.New, key)
		_, _ = mac.Write([]byte(tsStr))
		_, _ = mac.Write([]byte("\n"))
		_, _ = mac.Write(c.Body())
		expected := hex.EncodeToString(mac.Sum(nil))
		// hmac.Equal нь тогтмол хугацааны харьцуулалт — timing attack-аас сэргийлнэ.
		if !hmac.Equal([]byte(expected), []byte(provided)) {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "invalid signature"})
		}

		// 4) Nonce replay шалгалт — Redis SETNX-ээр (атомт), өмнө байсан бол 409.
		// Энэ алхмыг хамгийн сүүлд хийгээгүй бол нэвчүүлэгч хүчинтэй гарын
		// үсэгтэйгээр nonce-сан гаргаж DB pollution хийж болно.
		if rdb != nil {
			ctx, cancel := context.WithTimeout(c.Context(), 1*time.Second)
			defer cancel()
			key := "wallet:hmac:nonce:" + nonce
			ok, err := rdb.SetNX(ctx, key, "1", hmacNonceTTL).Result()
			if err != nil {
				// Redis алдааны үед fail-closed — replay window-руу нэвчих
				// эрсдэлийг хүлээх биш татгалзана.
				return c.Status(http.StatusServiceUnavailable).JSON(fiber.Map{"error": "nonce store unavailable"})
			}
			if !ok {
				return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "nonce already used"})
			}
		}
		return c.Next()
	}
}
