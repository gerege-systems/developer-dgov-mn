// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Package walletapi нь wallet ledger-ийн BFF HTTP давхарга — frontend ledger
// хүснэгт рүү шууд хандахгүй, зөвхөн эдгээр endpoint-ийг хэрэглэнэ. Бүх
// дуудлага Bearer access токен (authMiddleware) шаардана; токены subject нь
// usecase руу актёр болж дамжина. Хувийн (`/wallet/*`) ба байгууллагын
// (`/org/:orgId/wallet/*`) хоёр route бүлэг ижил handler-уудыг хуваалцана —
// owner-ийг path-аас тодорхойлно (P8). Алдаа: {"error": "<message>"}.
package walletapi

import (
	"errors"
	"net/http"
	"strconv"

	"eidtemplate/internal/apperror"
	"eidtemplate/internal/business/domain"
	"eidtemplate/internal/business/usecases/wallet"
	"eidtemplate/internal/constants"
	"eidtemplate/pkg/jwt"

	"github.com/gofiber/fiber/v3"
)

const channelPortal = "portal"

// Handler нь wallet endpoint-уудыг үйлчилнэ. ibanCountry/ibanBankCode нь
// account_no-оос бүтэн IBAN тооцоолох env config (хоосон bankCode → IBAN-гүй).
type Handler struct {
	uc           wallet.Usecase
	ibanCountry  string
	ibanBankCode string
}

// NewHandler нь wallet usecase + IBAN config-оор handler үүсгэнэ.
func NewHandler(uc wallet.Usecase, ibanCountry, ibanBankCode string) *Handler {
	return &Handler{uc: uc, ibanCountry: ibanCountry, ibanBankCode: ibanBankCode}
}

// Register нь хэтэвчний route бүлгийг authMiddleware-ийн дор холбоно. Бие даасан
// хувилбар: client = өөрийн хэтэвч (owner = токены client_id); /org/:orgId
// маршрут БАЙХГҮЙ (org/membership энэ service-д байхгүй).
func (h *Handler) Register(v1 fiber.Router, authMiddleware fiber.Handler) {
	h.mount(v1.Group("/wallet", authMiddleware))
}

func (h *Handler) mount(r fiber.Router) {
	r.Get("/", h.GetWallet)
	r.Put("/profile", h.UpsertProfile)
	r.Get("/transactions", h.ListTransactions)
	r.Post("/withdraw", h.Withdraw)
	r.Post("/transfer", h.Transfer)
	r.Post("/holds", h.Hold)
	r.Delete("/holds/:id", h.ReleaseHold)
	r.Post("/holds/:id/settle", h.SettleHold)
	r.Post("/transactions/:id/reverse", h.Reverse)
}

type profileBody struct {
	FullName    string `json:"full_name"`
	GivenName   string `json:"given_name"`
	FamilyName  string `json:"family_name"`
	NationalID  string `json:"national_id"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	KYCVerified bool   `json:"kyc_verified"`
	Source      string `json:"source"`
}

// UpsertProfile нь PUT .../wallet/profile — эзэн өөрийн display/KYC snapshot-ийг
// бичнэ (me.gerege.mn иргэний токеноор push). Owner = токены subject.
func (h *Handler) UpsertProfile(c fiber.Ctx) error {
	subject, _, _, ok := owner(c)
	if !ok {
		return unauth(c)
	}
	var body profileBody
	if err := c.Bind().Body(&body); err != nil {
		return badBody(c)
	}
	if err := h.uc.UpsertProfile(c.Context(), wallet.ProfileRequest{
		ActorSubject: subject, FullName: body.FullName, GivenName: body.GivenName,
		FamilyName: body.FamilyName, NationalID: body.NationalID, Phone: body.Phone,
		Email: body.Email, KYCVerified: body.KYCVerified, Source: body.Source,
	}); err != nil {
		return respondErr(c, err)
	}
	return c.SendStatus(http.StatusNoContent)
}

type amountBody struct {
	AmountMinor int64  `json:"amount_minor"`
	ExternalRef string `json:"external_ref"`
}

type transferBody struct {
	ToAccountNo string `json:"to_account_no"`
	AmountMinor int64  `json:"amount_minor"`
	ExternalRef string `json:"external_ref"`
}

// GetWallet нь GET .../wallet — owner-ийн хэтэвчийг буцаана (байхгүй бол нээнэ).
func (h *Handler) GetWallet(c fiber.Ctx) error {
	subject, ownerType, ownerID, ok := owner(c)
	if !ok {
		return unauth(c)
	}
	res, err := h.uc.GetOrOpenWallet(c.Context(), wallet.OwnerRequest{ActorSubject: subject, OwnerType: ownerType, OwnerID: ownerID})
	if err != nil {
		return respondErr(c, err)
	}
	acc := res.Account
	acc.IBAN = domain.IBAN(h.ibanCountry, h.ibanBankCode, acc.AccountNo) // хүчингүй бол хоосон
	return c.Status(http.StatusOK).JSON(acc)
}

// ListTransactions нь GET .../wallet/transactions?offset&limit.
func (h *Handler) ListTransactions(c fiber.Ctx) error {
	subject, ownerType, ownerID, ok := owner(c)
	if !ok {
		return unauth(c)
	}
	offset, _ := strconv.Atoi(c.Query("offset"))
	if offset < 0 {
		offset = 0
	}
	limit, _ := strconv.Atoi(c.Query("limit"))
	res, err := h.uc.ListTransactions(c.Context(), wallet.HistoryRequest{
		ActorSubject: subject, OwnerType: ownerType, OwnerID: ownerID, Offset: offset, Limit: limit,
	})
	if err != nil {
		return respondErr(c, err)
	}
	return c.Status(http.StatusOK).JSON(fiber.Map{"transactions": res.Transactions})
}

// Withdraw нь POST .../wallet/withdraw.
func (h *Handler) Withdraw(c fiber.Ctx) error {
	subject, ownerType, ownerID, ok := owner(c)
	if !ok {
		return unauth(c)
	}
	var body amountBody
	if err := c.Bind().Body(&body); err != nil {
		return badBody(c)
	}
	res, err := h.uc.Withdraw(c.Context(), wallet.WithdrawRequest{
		ActorSubject: subject, OwnerType: ownerType, OwnerID: ownerID, AmountMinor: body.AmountMinor,
		ExternalRef: body.ExternalRef, Channel: channelPortal, IdempotencyKey: idemKey(c),
	})
	if err != nil {
		return respondErr(c, err)
	}
	return c.Status(http.StatusOK).JSON(res.Txn)
}

// Transfer нь POST .../wallet/transfer.
func (h *Handler) Transfer(c fiber.Ctx) error {
	subject, ownerType, ownerID, ok := owner(c)
	if !ok {
		return unauth(c)
	}
	var body transferBody
	if err := c.Bind().Body(&body); err != nil {
		return badBody(c)
	}
	res, err := h.uc.Transfer(c.Context(), wallet.TransferRequest{
		ActorSubject: subject, OwnerType: ownerType, OwnerID: ownerID, ToAccountNo: body.ToAccountNo,
		AmountMinor: body.AmountMinor, ExternalRef: body.ExternalRef, Channel: channelPortal, IdempotencyKey: idemKey(c),
	})
	if err != nil {
		return respondErr(c, err)
	}
	return c.Status(http.StatusOK).JSON(res.Txn)
}

// Hold нь POST .../wallet/holds.
func (h *Handler) Hold(c fiber.Ctx) error {
	subject, ownerType, ownerID, ok := owner(c)
	if !ok {
		return unauth(c)
	}
	var body amountBody
	if err := c.Bind().Body(&body); err != nil {
		return badBody(c)
	}
	res, err := h.uc.Hold(c.Context(), wallet.HoldRequest{
		ActorSubject: subject, OwnerType: ownerType, OwnerID: ownerID, AmountMinor: body.AmountMinor, ExternalRef: body.ExternalRef,
	})
	if err != nil {
		return respondErr(c, err)
	}
	return c.Status(http.StatusCreated).JSON(res.Hold)
}

// ReleaseHold нь DELETE .../wallet/holds/:id.
func (h *Handler) ReleaseHold(c fiber.Ctx) error {
	subject, ownerType, ownerID, ok := owner(c)
	if !ok {
		return unauth(c)
	}
	if err := h.uc.ReleaseHold(c.Context(), wallet.ReleaseRequest{
		ActorSubject: subject, OwnerType: ownerType, OwnerID: ownerID, HoldID: c.Params("id"),
	}); err != nil {
		return respondErr(c, err)
	}
	return c.SendStatus(http.StatusNoContent)
}

// SettleHold нь POST .../wallet/holds/:id/settle — барьцааг capture хийнэ.
// Body заавал биш: {capture_minor} (0/байхгүй → бүтэн capture).
func (h *Handler) SettleHold(c fiber.Ctx) error {
	subject, ownerType, ownerID, ok := owner(c)
	if !ok {
		return unauth(c)
	}
	var body struct {
		CaptureMinor *int64 `json:"capture_minor"`
	}
	_ = c.Bind().Body(&body) // body сонголттой
	res, err := h.uc.SettleHold(c.Context(), wallet.SettleRequest{
		ActorSubject: subject, OwnerType: ownerType, OwnerID: ownerID,
		HoldID: c.Params("id"), CaptureMinor: body.CaptureMinor,
	})
	if err != nil {
		return respondErr(c, err)
	}
	return c.Status(http.StatusOK).JSON(res.Txn)
}

// Reverse нь POST .../wallet/transactions/:id/reverse.
func (h *Handler) Reverse(c fiber.Ctx) error {
	subject, ownerType, ownerID, ok := owner(c)
	if !ok {
		return unauth(c)
	}
	res, err := h.uc.Reverse(c.Context(), wallet.ReverseRequest{
		ActorSubject: subject, OwnerType: ownerType, OwnerID: ownerID, TxnID: c.Params("id"),
	})
	if err != nil {
		return respondErr(c, err)
	}
	return c.Status(http.StatusOK).JSON(res.Txn)
}

// owner нь токены subject + path-аас owner-ийг тодорхойлно: orgId param байвал
// байгууллага, эс бөгөөс хувь хүн (өөрөө).
func owner(c fiber.Ctx) (subject, ownerType, ownerID string, ok bool) {
	claims, valid := c.Locals(constants.CtxAuthenticatedUserKey).(jwt.JwtCustomClaim)
	if !valid || claims.UserID == "" {
		return "", "", "", false
	}
	if org := c.Params("orgId"); org != "" {
		return claims.UserID, domain.OwnerOrganization, org, true
	}
	return claims.UserID, domain.OwnerPerson, claims.UserID, true
}

func idemKey(c fiber.Ctx) string { return c.Get("X-Idempotency-Key") }

func unauth(c fiber.Ctx) error {
	return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "valid Bearer access token required"})
}

func badBody(c fiber.Ctx) error {
	return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "malformed JSON body"})
}

// respondErr нь usecase-ийн apperror.DomainError-ийг HTTP статус руу буулгана.
func respondErr(c fiber.Ctx, err error) error {
	status, msg := http.StatusInternalServerError, "internal server error"
	var de *apperror.DomainError
	if errors.As(err, &de) {
		msg = de.Message
		switch de.Type {
		case apperror.ErrTypeBadRequest:
			status = http.StatusBadRequest
		case apperror.ErrTypeNotFound:
			status = http.StatusNotFound
		case apperror.ErrTypeForbidden:
			status = http.StatusForbidden
		case apperror.ErrTypeUnauthorized:
			status = http.StatusUnauthorized
		case apperror.ErrTypeConflict:
			status = http.StatusConflict
		case apperror.ErrTypeServiceUnavailable:
			status = http.StatusServiceUnavailable
		default:
			status, msg = http.StatusInternalServerError, "internal server error"
		}
	}
	return c.Status(status).JSON(fiber.Map{"error": msg})
}
