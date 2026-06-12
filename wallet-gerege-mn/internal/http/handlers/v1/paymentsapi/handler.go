// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Package paymentsapi нь QR төлбөр / нэхэмжлэх (invoice) HTTP давхарга.
// Endpoint-ууд (бүгд Bearer токен шаардана):
//
//	POST   /payments/requests       — нэхэмжлэх/QR үүсгэх (хүлээн авагч)
//	GET    /payments/requests       — өөрийн нэхэмжлэхүүд
//	GET    /payments/requests/:id   — нэг нэхэмжлэх (receive polling — RLS)
//	DELETE /payments/requests/:id   — цуцлах
//	POST   /payments/resolve        — QR token тайлах (төлөгчид харуулах)
//	POST   /payments/pay            — QR-аар төлөх (settlement = transfer)
package paymentsapi

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"eidtemplate/internal/business/domain"
	"eidtemplate/internal/business/usecases/payments"
	"eidtemplate/internal/constants"
	"eidtemplate/pkg/jwt"

	"github.com/gofiber/fiber/v3"
)

// Handler нь payments endpoint-уудыг үйлчилнэ.
type Handler struct {
	uc *payments.Usecase
}

// NewHandler нь payments usecase-аар handler үүсгэнэ.
func NewHandler(uc *payments.Usecase) *Handler { return &Handler{uc: uc} }

// Register нь /payments/* маршрутуудыг authMiddleware-ийн дор холбоно.
func (h *Handler) Register(v1 fiber.Router, authMiddleware fiber.Handler) {
	g := v1.Group("/payments", authMiddleware)
	g.Post("/requests", h.Create)
	g.Get("/requests", h.List)
	g.Get("/requests/:id", h.Get)
	g.Delete("/requests/:id", h.Cancel)
	g.Post("/resolve", h.Resolve)
	g.Post("/pay", h.Pay)
	g.Get("/qr-pubkey", h.PubKey)
}

// PubKey нь QR баталгаажуулах Ed25519 нийтийн түлхүүрийг (base64) буцаана —
// апп-ууд QR-ийн гарын үсгийг офлайн шалгаж болно.
func (h *Handler) PubKey(c fiber.Ctx) error {
	return c.JSON(fiber.Map{"alg": "Ed25519", "public_key_b64": h.uc.PublicKeyB64()})
}

func (h *Handler) Create(c fiber.Ctx) error {
	sub, ok := subject(c)
	if !ok {
		return unauth(c)
	}
	var body struct {
		Kind         string `json:"kind"`
		AmountMinor  *int64 `json:"amount_minor"`
		Reference    string `json:"reference"`
		ExpiresInSec int    `json:"expires_in_sec"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return bad(c, "malformed body")
	}
	res, err := h.uc.Create(c.Context(), payments.CreateInput{
		ActorSubject: sub, Kind: body.Kind, AmountMinor: body.AmountMinor,
		Reference: body.Reference, ExpiresInSec: body.ExpiresInSec,
	})
	if err != nil {
		return respondErr(c, err)
	}
	r := withEffective(res.Request)
	return c.Status(http.StatusCreated).JSON(fiber.Map{
		"request":  r,
		"qr_token": res.QRToken, // native Ed25519 JWT
		"qr_emv":   res.EMV,     // EMVCo MPM (олон улсын)
	})
}

func (h *Handler) Get(c fiber.Ctx) error {
	sub, ok := subject(c)
	if !ok {
		return unauth(c)
	}
	r, err := h.uc.Get(c.Context(), sub, c.Params("id"))
	if err != nil {
		return respondErr(c, err)
	}
	return c.JSON(withEffective(r))
}

func (h *Handler) List(c fiber.Ctx) error {
	sub, ok := subject(c)
	if !ok {
		return unauth(c)
	}
	offset, _ := strconv.Atoi(c.Query("offset"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	rows, err := h.uc.List(c.Context(), sub, offset, limit)
	if err != nil {
		return respondErr(c, err)
	}
	out := make([]domain.PaymentRequest, 0, len(rows))
	for _, r := range rows {
		out = append(out, withEffective(r))
	}
	return c.JSON(fiber.Map{"requests": out})
}

func (h *Handler) Cancel(c fiber.Ctx) error {
	sub, ok := subject(c)
	if !ok {
		return unauth(c)
	}
	if err := h.uc.Cancel(c.Context(), sub, c.Params("id")); err != nil {
		return respondErr(c, err)
	}
	return c.JSON(fiber.Map{"id": c.Params("id"), "status": "canceled"})
}

func (h *Handler) Resolve(c fiber.Ctx) error {
	if _, ok := subject(c); !ok {
		return unauth(c)
	}
	var body struct {
		QRToken string `json:"qr_token"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return bad(c, "malformed body")
	}
	res, err := h.uc.Resolve(c.Context(), body.QRToken)
	if err != nil {
		return respondErr(c, err)
	}
	return c.JSON(res)
}

func (h *Handler) Pay(c fiber.Ctx) error {
	sub, ok := subject(c)
	if !ok {
		return unauth(c)
	}
	var body struct {
		QRToken     string `json:"qr_token"`
		AmountMinor int64  `json:"amount_minor"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return bad(c, "malformed body")
	}
	res, err := h.uc.Pay(c.Context(), payments.PayInput{
		ActorSubject: sub, QRToken: body.QRToken, AmountMinor: body.AmountMinor,
		IdempotencyKey: c.Get("X-Idempotency-Key"),
	})
	if err != nil {
		return respondErr(c, err)
	}
	return c.JSON(fiber.Map{
		"txn_id":     res.Txn.ID,
		"request_id": res.RequestID,
		"status":     "paid",
	})
}

// ---- helpers ----

func subject(c fiber.Ctx) (string, bool) {
	claims, ok := c.Locals(constants.CtxAuthenticatedUserKey).(jwt.JwtCustomClaim)
	if !ok || claims.UserID == "" {
		return "", false
	}
	return claims.UserID, true
}

func withEffective(r domain.PaymentRequest) domain.PaymentRequest {
	r.Status = r.EffectiveStatus(time.Now())
	return r
}

func respondErr(c fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, domain.ErrRequestNotFound), errors.Is(err, domain.ErrWalletNotFound):
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, domain.ErrRequestNotPayable):
		return c.Status(http.StatusConflict).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, domain.ErrRequestExpired):
		return c.Status(http.StatusGone).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, domain.ErrInvalidQR), errors.Is(err, domain.ErrCannotPaySelf),
		errors.Is(err, domain.ErrInvalidAmount), errors.Is(err, domain.ErrSameAccountTransfer):
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, domain.ErrAccountNotActive), errors.Is(err, domain.ErrRoleForbidden):
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, domain.ErrInsufficientFunds):
		return c.Status(http.StatusPaymentRequired).JSON(fiber.Map{"error": err.Error()})
	default:
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "internal error"})
	}
}

func bad(c fiber.Ctx, msg string) error {
	return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": msg})
}
func unauth(c fiber.Ctx) error {
	return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
}
