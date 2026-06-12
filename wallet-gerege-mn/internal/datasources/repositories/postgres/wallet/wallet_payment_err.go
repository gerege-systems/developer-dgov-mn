// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package wallet

import (
	"strings"

	"eidtemplate/internal/business/domain"
)

// mapPaymentErr нь pay_request функцийн RAISE мессежийг domain sentinel руу
// буулгана; нэхэмжлэх-специфик бус бол wallet_transfer-ийн mapper-т шилжүүлнэ.
func mapPaymentErr(err error) error {
	if err == nil {
		return nil
	}
	s := err.Error()
	switch {
	case strings.Contains(s, "request_not_found"):
		return domain.ErrRequestNotFound
	case strings.Contains(s, "request_not_payable"):
		return domain.ErrRequestNotPayable
	case strings.Contains(s, "request_expired"):
		return domain.ErrRequestExpired
	case strings.Contains(s, "cannot_pay_self"):
		return domain.ErrCannotPaySelf
	case strings.Contains(s, "payer_wallet_not_found"):
		return domain.ErrWalletNotFound
	}
	return mapPGWalletErr(err)
}
