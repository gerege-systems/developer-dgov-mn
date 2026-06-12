// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package middlewares

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"eidtemplate/internal/constants"
	"eidtemplate/pkg/jwt"

	"github.com/gofiber/fiber/v3"
	"github.com/redis/go-redis/v9"
)

// tokenCutoffPrefix нь auth.gerege.mn-ийн нууц үг солих/logout-ийн revocation
// тасалбарын redis key prefix (auth-ийн `pwd_cutoff:` -тэй ИЖИЛ байх ёстой).
const tokenCutoffPrefix = "pwd_cutoff:" // #nosec G101 — redis key prefix, нууц үг биш

// NewAuthMiddleware нь Bearer access токеныг шалгаж claim-уудыг Locals-д хадгална.
// verifiers нь ОЛОН эх сурвалжийн JWT service (issuer/secret) — токеныг тус бүрд
// нь оролдоно: wallet-ийн ӨӨРИЙН client_credentials токен (issuer wallet.gerege.mn)
// БОЛОН auth.gerege.mn-ийн хэрэглэгчийн токен (issuer auth.gerege.mn, хуваалцсан
// secret). Аль нэгэнд нь хүчинтэй бол нэвтэрнэ — owner нь токены subject (client_id
// эсвэл иргэний subject). redisClient өгсөн бол revocation шалгана (fail-closed).
func NewAuthMiddleware(verifiers []jwt.JWTService, redisClient *redis.Client) fiber.Handler {
	return func(c fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return abort(c, "missing authorization header")
		}
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			return abort(c, "invalid authorization header")
		}
		var claims jwt.JwtCustomClaim
		valid := false
		for _, v := range verifiers {
			if cl, err := v.ParseToken(parts[1]); err == nil && cl.UserID != "" {
				claims, valid = cl, true
				break
			}
		}
		if !valid {
			return abort(c, "invalid or expired token")
		}
		if revoked(c, redisClient, claims) {
			return abort(c, "token revoked")
		}
		c.Locals(constants.CtxAuthenticatedUserKey, claims)
		return c.Next()
	}
}

// revoked нь redis cutoff тасалбарыг шалгана: token IssuedAt ≤ cutoff бол хүчингүй.
// FAIL-CLOSED: redis тасрах/алдаа гарвал токеныг хүчингүй гэж үзнэ (auth IdP-тэй
// нэг адил). redis.Nil (тасалбар огт алга) бол л зөвшөөрнө. Redis тохируулаагүй
// (rc==nil) бол revocation-г зориудаар алгасна (config-ийн ил сонголт).
func revoked(c fiber.Ctx, rc *redis.Client, claims jwt.JwtCustomClaim) bool {
	if rc == nil || claims.IssuedAt == nil {
		return false
	}
	v, err := rc.Get(c.Context(), tokenCutoffPrefix+claims.UserID).Result()
	switch {
	case errors.Is(err, redis.Nil):
		return false // тасалбар алга → токен хүчинтэй
	case err != nil:
		return true // транспортын алдаа → fail-closed (татгалзана)
	}
	cutoff, perr := strconv.ParseInt(v, 10, 64)
	return perr == nil && claims.IssuedAt.Unix() <= cutoff
}

func abort(c fiber.Ctx, msg string) error {
	return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": msg})
}
