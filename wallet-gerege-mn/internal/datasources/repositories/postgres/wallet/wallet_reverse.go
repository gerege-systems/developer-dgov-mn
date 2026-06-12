// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package wallet

import (
	"context"

	"eidtemplate/internal/business/domain"

	"gorm.io/gorm"
)

// Reverse нь deposit/withdrawal/fee гүйлгээг эсрэг posting-оор буцаана. Анхны
// мөр is_reversed=true болж үлдэнэ (P2 — устгахгүй). RLS-аар актёр зөвхөн
// өөрийн дансны гүйлгээг буцаана. Баланс сөрөг болох тохиолдолд (ж: зарцуулсан
// мөнгөтэй deposit-ийг буцаах) ErrInsufficientFunds.
func (r *Repository) Reverse(ctx context.Context, actorSubject, accountID, txnID string) (domain.WalletTxn, error) {
	var out domain.WalletTxn
	err := r.withSubject(ctx, actorSubject, func(tx *gorm.DB) error {
		orig, err := loadTxn(tx, txnID)
		if err != nil {
			return err
		}
		if orig.AccountID != accountID {
			return domain.ErrWalletNotFound
		}
		if orig.IsReversed {
			return domain.ErrAlreadyReversed
		}
		posting, err := domain.ReversePosting(orig)
		if err != nil {
			return err
		}
		acc, err := lockAccount(tx, orig.AccountID)
		if err != nil {
			return err
		}
		newBal := acc.BalanceMinor + posting.NetForAccount(acc.ID)
		if newBal < 0 {
			return domain.ErrInsufficientFunds
		}
		revID, err := insertTxn(tx, domain.WalletTxn{
			AccountID: acc.ID, Type: domain.TxnReversal, AmountMinor: orig.AmountMinor,
			RunningBalanceMinor: newBal, CreatedBy: actorSubject,
		})
		if err != nil {
			return err
		}
		// АТОМАР claim (H3): is_reversed-ийг зөвхөн false байх үед true болгоно.
		// Зэрэг хоёр reversal үед хоёр дахь нь 0 мөр шинэчилнэ → ErrAlreadyReversed
		// (бүх tx буцна). Энэ нь lock-аас өмнө уншсан stale snapshot-ийн TOCTOU-г
		// хаана — постинг/баланс хөдлөхөөс ӨМНӨ claim хийгдэнэ.
		res := tx.Exec(
			"UPDATE wallet_txn SET is_reversed = true, reversed_by_txn_id = ? WHERE id = ? AND is_reversed = false",
			revID, orig.ID,
		)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected != 1 {
			return domain.ErrAlreadyReversed
		}
		if err := postEntries(tx, revID, posting); err != nil {
			return err
		}
		if err := updateBalance(tx, acc.ID, newBal); err != nil {
			return err
		}
		out, err = loadTxn(tx, revID)
		return err
	})
	return out, err
}
