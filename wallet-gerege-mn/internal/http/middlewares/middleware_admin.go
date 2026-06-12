// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package middlewares

import (
	"net/http"
	"strings"

	"eidtemplate/pkg/jwt"

	"github.com/gofiber/fiber/v3"
)

// NewAdminMiddleware нь super-admin JWT (isAdmin=true)-ийг шалгаж claim-ийг
// c.Locals("admin")-д хадгална. Зөвхөн wallet-ийн admin login-аас гарсан токен
// нэвтэрнэ. Алдаа: {"error": ...} 401/403.
func NewAdminMiddleware(jwtService jwt.JWTService) fiber.Handler {
	return func(c fiber.Ctx) error {
		header := c.Get("Authorization")
		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "missing bearer token"})
		}
		claims, err := jwtService.ParseToken(parts[1])
		if err != nil || claims.UserID == "" {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "invalid or expired token"})
		}
		if !claims.IsAdmin {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "admin privileges required"})
		}
		c.Locals("admin", claims)
		return c.Next()
	}
}
