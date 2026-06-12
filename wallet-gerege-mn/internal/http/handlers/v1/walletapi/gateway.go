// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package walletapi

import (
	"net/http"

	"eidtemplate/internal/business/usecases/wallet"

	"github.com/gofiber/fiber/v3"
)

type gatewayTopupBody struct {
	AccountNo   string `json:"account_no"`
	AmountMinor int64  `json:"amount_minor"`
	ExternalRef string `json:"external_ref"`
	Channel     string `json:"channel"`
}

// GatewayTopup нь банкны corporate gateway-ийн top-up webhook
// (POST /webhooks/bank/topup). HMAC гарын үсэг middleware-д аль хэдийн
// шалгагдсан тул энд зөвхөн their body-г уншиж deposit постоно. external_ref-
// ээр idempotent — давтан callback 200 + ижил txn_id буцаана.
func (h *Handler) GatewayTopup(c fiber.Ctx) error {
	var body gatewayTopupBody
	if err := c.Bind().Body(&body); err != nil {
		return badBody(c)
	}
	res, err := h.uc.GatewayTopup(c.Context(), wallet.GatewayTopupRequest{
		AccountNo: body.AccountNo, AmountMinor: body.AmountMinor, ExternalRef: body.ExternalRef, Channel: body.Channel,
	})
	if err != nil {
		return respondErr(c, err)
	}
	return c.Status(http.StatusOK).JSON(fiber.Map{"txn_id": res.TxnID})
}
