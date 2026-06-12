// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package middlewares

import (
	"context"
	"log/slog"
	"strings"
	"sync"
	"time"

	"eidtemplate/internal/constants"
	"eidtemplate/pkg/jwt"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

// clientIP нь nginx reverse-proxy-гийн ард бодит гадаад IP-г буцаана:
// X-Forwarded-For (эхний IP) → X-Real-IP → шууд холболтын IP (c.IP()).
// App нь зөвхөн localhost дээр bind хийгдэж, итгэмжит nginx л дамжуулдаг тул
// эдгээр header-т итгэж болно.
func clientIP(c fiber.Ctx) string {
	if xff := c.Get("X-Forwarded-For"); xff != "" {
		if i := strings.IndexByte(xff, ','); i > 0 {
			return strings.TrimSpace(xff[:i])
		}
		return strings.TrimSpace(xff)
	}
	if xr := strings.TrimSpace(c.Get("X-Real-IP")); xr != "" {
		return xr
	}
	return c.IP()
}

// auditEntry нь api_audit_logs-д бичих нэг мөр.
type auditEntry struct {
	subject, action, method, path, ip, ua, reqID string
	status                                       int
	latency                                      int64
}

// L4: хүсэлт бүрт goroutine spawn хийхийн оронд хязгаарлагдмал buffer + цөөн
// worker. Buffer дүүрвэл мөрийг УНАГАА (audit нь best-effort; чухал замыг
// саатуулахгүй, pool-ийг starve хийхгүй).
const (
	auditBuffer  = 1024
	auditWorkers = 2
)

var (
	auditCh   chan auditEntry
	auditOnce sync.Once
)

// AuditMiddleware нь хариу буцсаны дараа append-only api_audit_logs-д мөр
// дараалалд оруулна (bounded async). authMiddleware-ийн өмнө залгана.
func AuditMiddleware(db *gorm.DB, log *slog.Logger) fiber.Handler {
	auditOnce.Do(func() {
		auditCh = make(chan auditEntry, auditBuffer)
		for i := 0; i < auditWorkers; i++ {
			go auditWorker(db, log)
		}
	})
	return func(c fiber.Ctx) error {
		started := time.Now()
		err := c.Next()

		e := auditEntry{
			action: c.Method() + " " + c.Path(), method: c.Method(), path: c.Path(),
			status: c.Response().StatusCode(), ip: clientIP(c), ua: c.Get(fiber.HeaderUserAgent),
			reqID: c.Get(fiber.HeaderXRequestID), latency: time.Since(started).Milliseconds(),
		}
		if claims, ok := c.Locals(constants.CtxAuthenticatedUserKey).(jwt.JwtCustomClaim); ok {
			e.subject = claims.UserID
		}
		select {
		case auditCh <- e: // дараалалд оров
		default:
			log.Warn("audit buffer full — dropping entry", "path", e.path)
		}
		return err
	}
}

// auditWorker нь дараалалаас уншиж api_audit_logs-д бичнэ.
func auditWorker(db *gorm.DB, log *slog.Logger) {
	for e := range auditCh {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		if err := db.WithContext(ctx).Exec(`
INSERT INTO api_audit_logs (actor_subject, action, method, path, status_code, ip, user_agent, request_id, latency_ms)
VALUES (NULLIF(?, ''), ?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), ?)`,
			e.subject, e.action, e.method, e.path, e.status, e.ip, e.ua, e.reqID, e.latency).Error; err != nil {
			log.Warn("audit log write failed", "path", e.path, "error", err)
		}
		cancel()
	}
}
