// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package wallet

import (
	"context"
	"strings"

	"eidtemplate/internal/business/domain"
	repointerface "eidtemplate/internal/datasources/repositories/interface"

	"gorm.io/gorm"
)

// Transfer нь P2P шилжүүлгийг wallet_transfer SECURITY DEFINER функцээр атомар
// гүйцэтгэнэ. Функц нь эх дансны эзэмшил, идэвх, үлдэгдлийг өөрөө шалгаж,
// тогтсон мессежээр алдаа RAISE хийдэг — adapter түүнийг domain алдаа руу
// буулгана. idempotency replay дэмжинэ.
func (r *Repository) Transfer(ctx context.Context, actorSubject string, in repointerface.WalletTransferInput) (domain.WalletTxn, error) {
	var out domain.WalletTxn
	err := r.withSubject(ctx, actorSubject, func(tx *gorm.DB) error {
		if txn, found, err := replay(tx, in.IdempotencyKey, actorSubject, in); err != nil {
			return err
		} else if found {
			out = txn
			return nil
		}
		var txnID string
		row := tx.Raw(
			"SELECT wallet_transfer(?, ?, ?, ?, ?, ?, ?)",
			actorSubject, in.FromAccountID, in.ToAccountNo, in.AmountMinor, in.FeeMinor, in.Channel, in.ExternalRef,
		).Row()
		if err := row.Scan(&txnID); err != nil {
			return mapPGWalletErr(err)
		}
		if err := store(tx, in.IdempotencyKey, actorSubject, txnID, in); err != nil {
			return err
		}
		var err error
		out, err = loadTxn(tx, txnID)
		return err
	})
	return out, err
}

// mapPGWalletErr нь wallet_transfer функцийн RAISE мессежийг domain sentinel
// алдаа руу буулгана (бусдыг хэвээр буцаана).
func mapPGWalletErr(err error) error {
	if err == nil {
		return nil
	}
	s := err.Error()
	switch {
	case strings.Contains(s, "wallet_insufficient_funds"):
		return domain.ErrInsufficientFunds
	case strings.Contains(s, "wallet_not_found"):
		return domain.ErrWalletNotFound
	case strings.Contains(s, "wallet_inactive"):
		return domain.ErrAccountNotActive
	case strings.Contains(s, "wallet_forbidden"):
		return domain.ErrRoleForbidden
	case strings.Contains(s, "wallet_same_account"):
		return domain.ErrSameAccountTransfer
	case strings.Contains(s, "wallet_invalid_amount"):
		return domain.ErrInvalidAmount
	case strings.Contains(s, "wallet_missing_ref"):
		return domain.ErrMissingExternalRef
	}
	return err
}
