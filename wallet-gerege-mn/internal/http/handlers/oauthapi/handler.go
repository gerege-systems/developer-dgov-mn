// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Package oauthapi нь wallet.gerege.mn-ийн OAuth2 token endpoint
// (POST /oauth/token, grant_type=client_credentials). Бусад систем client_id +
// client_secret-ээр (form body ЭСВЭЛ HTTP Basic) wallet access токен авна.
package oauthapi

import (
	"encoding/base64"
	"net/http"
	"strings"

	"eidtemplate/internal/business/domain"
	"eidtemplate/internal/business/usecases/oauth"

	"github.com/gofiber/fiber/v3"
)

// Handler нь token endpoint-ийг үйлчилнэ.
type Handler struct {
	uc oauth.Usecase
}

// NewHandler нь oauth usecase-аар handler үүсгэнэ.
func NewHandler(uc oauth.Usecase) *Handler { return &Handler{uc: uc} }

// Register нь POST /oauth/token-ийг холбоно.
func (h *Handler) Register(app *fiber.App) {
	app.Post("/oauth/token", h.Token)
}

// Token нь client_credentials grant-аар access токен гаргана.
func (h *Handler) Token(c fiber.Ctx) error {
	if c.FormValue("grant_type") != "client_credentials" {
		return oauthErr(c, http.StatusBadRequest, "unsupported_grant_type", "grant_type must be client_credentials")
	}
	clientID := c.FormValue("client_id")
	clientSecret := c.FormValue("client_secret")
	if clientID == "" {
		if id, sec, ok := basicAuth(c.Get(fiber.HeaderAuthorization)); ok {
			clientID, clientSecret = id, sec
		}
	}

	res, err := h.uc.IssueClientToken(c.Context(), clientID, clientSecret, clientIP(c))
	if err != nil {
		switch err {
		case domain.ErrInvalidClient:
			return oauthErr(c, http.StatusUnauthorized, "invalid_client", "client authentication failed")
		case domain.ErrIPNotAllowed:
			return oauthErr(c, http.StatusForbidden, "ip_not_allowed", "request ip is not in the client allowlist")
		default:
			return oauthErr(c, http.StatusInternalServerError, "server_error", "token issuance failed")
		}
	}
	return c.Status(http.StatusOK).JSON(fiber.Map{
		"access_token": res.AccessToken,
		"token_type":   "Bearer",
		"expires_in":   res.ExpiresIn,
		"scope":        "wallet",
	})
}

// basicAuth нь "Basic base64(id:secret)" header-ийг задална.
func basicAuth(header string) (id, secret string, ok bool) {
	const prefix = "Basic "
	if !strings.HasPrefix(header, prefix) {
		return "", "", false
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(header, prefix))
	if err != nil {
		return "", "", false
	}
	id, secret, found := strings.Cut(string(raw), ":")
	return id, secret, found
}

func oauthErr(c fiber.Ctx, status int, code, desc string) error {
	return c.Status(status).JSON(fiber.Map{"error": code, "error_description": desc})
}

// clientIP нь nginx-ийн ард бодит гадаад IP-г буцаана (X-Forwarded-For эхний →
// X-Real-IP → шууд холболт). App localhost дээр л bind хийгддэг тул header-т итгэнэ.
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
