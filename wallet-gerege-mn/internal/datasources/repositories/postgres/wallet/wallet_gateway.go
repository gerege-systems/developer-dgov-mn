// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package wallet

import (
	"context"

	repointerface "eidtemplate/internal/datasources/repositories/interface"
)

// GatewayDeposit нь банкны corporate gateway top-up-ийг wallet_gateway_deposit
// SECURITY DEFINER функцээр постоно. Нэвтэрсэн иргэн байхгүй (server-to-server)
// тул RLS app.subject хэрэггүй — функц өөрөө RLS тойрно. external_ref-ээр
// idempotent (давтан callback анхны гүйлгээг буцаана).
func (r *Repository) GatewayDeposit(ctx context.Context, in repointerface.WalletGatewayDepositInput) (string, error) {
	var txnID string
	row := r.db.WithContext(ctx).Raw(
		"SELECT wallet_gateway_deposit(?, ?, ?, ?)",
		in.AccountNo, in.AmountMinor, in.ExternalRef, in.Channel,
	).Row()
	if err := row.Scan(&txnID); err != nil {
		return "", mapPGWalletErr(err)
	}
	return txnID, nil
}
