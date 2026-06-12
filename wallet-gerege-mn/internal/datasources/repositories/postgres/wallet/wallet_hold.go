// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package wallet

import (
	"context"

	"eidtemplate/internal/business/domain"
	repointerface "eidtemplate/internal/datasources/repositories/interface"

	"gorm.io/gorm"
)

// ExpireHolds нь wallet_expire_holds()-г дуудаж expires_at өнгөрсөн идэвхтэй
// барьцаануудыг автоматаар чөлөөлнө (cmd/holdexpiry cron). Чөлөөлсөн барьцааны
// тоог буцаана. Функц definer тул RLS тойрно; дуудагч admin_identity/superuser.
func (r *Repository) ExpireHolds(ctx context.Context) (int, error) {
	var n int
	err := r.db.WithContext(ctx).Raw("SELECT wallet_expire_holds()").Scan(&n).Error
	return n, err
}

// Hold нь дансны мөнгийг түр барьцаална: balance хөдөлгөхгүй, зөвхөн available
// (balance − hold) буурна. Барьцаа нь GL хөдөлгөөн биш тул ledger entry
// үүсэхгүй — зөвхөн hold төрлийн wallet_txn (түүх) + account_hold мөр.
func (r *Repository) Hold(ctx context.Context, actorSubject string, in repointerface.WalletHoldInput) (domain.AccountHold, error) {
	var out domain.AccountHold
	err := r.withSubject(ctx, actorSubject, func(tx *gorm.DB) error {
		acc, err := lockAccount(tx, in.AccountID)
		if err != nil {
			return err
		}
		if err := domain.EnsureActive(acc); err != nil {
			return err
		}
		if in.AmountMinor <= 0 {
			return domain.ErrInvalidAmount
		}
		if acc.Available() < in.AmountMinor {
			return domain.ErrInsufficientFunds
		}
		holdTxnID, err := insertTxn(tx, domain.WalletTxn{
			AccountID: acc.ID, Type: domain.TxnHold, AmountMinor: in.AmountMinor,
			RunningBalanceMinor: acc.BalanceMinor, ExternalRef: in.ExternalRef, CreatedBy: actorSubject,
		})
		if err != nil {
			return err
		}
		if err := tx.Raw(`
INSERT INTO account_hold (account_id, amount_minor, hold_txn_id, external_ref, expires_at)
VALUES (?, ?, ?, NULLIF(?, ''), ?)
RETURNING *`, acc.ID, in.AmountMinor, holdTxnID, in.ExternalRef, in.ExpiresAt).Scan(&out).Error; err != nil {
			return err
		}
		return tx.Exec(
			"UPDATE wallet_account SET hold_minor = hold_minor + ?, version = version + 1, updated_at = now() WHERE id = ?",
			in.AmountMinor, acc.ID,
		).Error
	})
	return out, err
}

// ReleaseHold нь идэвхтэй барьцааг суллаж, hold_minor-ийг буцаана; release
// төрлийн wallet_txn нэмнэ. Барьцаа олдохгүй/идэвхгүй бол domain.ErrWalletNotFound.
func (r *Repository) ReleaseHold(ctx context.Context, actorSubject, accountID, holdID string) error {
	return r.withSubject(ctx, actorSubject, func(tx *gorm.DB) error {
		var hold domain.AccountHold
		res := tx.Raw("SELECT * FROM account_hold WHERE id = ? AND account_id = ? AND status = 'active'", holdID, accountID).Scan(&hold)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return domain.ErrWalletNotFound
		}
		acc, err := lockAccount(tx, hold.AccountID)
		if err != nil {
			return err
		}
		if err := tx.Exec("UPDATE account_hold SET status = 'released' WHERE id = ?", holdID).Error; err != nil {
			return err
		}
		if _, err := insertTxn(tx, domain.WalletTxn{
			AccountID: acc.ID, Type: domain.TxnRelease, AmountMinor: hold.AmountMinor,
			RunningBalanceMinor: acc.BalanceMinor, CreatedBy: actorSubject,
		}); err != nil {
			return err
		}
		return tx.Exec(
			"UPDATE wallet_account SET hold_minor = hold_minor - ?, version = version + 1, updated_at = now() WHERE id = ?",
			hold.AmountMinor, acc.ID,
		).Error
	})
}

// SettleHold нь барьцааг бодит зарлага болгож хаана (capture). Барьцааг бүтэн
// чөлөөлж (hold_minor буцаана), captureMinor хэмжээний withdrawal постоно
// (balance хасагдана; ledger Dr customer_wallet / Cr bank_settlement). Partial
// capture үед үлдэгдэл нь available руу буцна. Барьцаа аль хэдийн available-д
// тооцогдсон тул дахин insufficient шалгахгүй (capture ≤ hold ≤ balance).
func (r *Repository) SettleHold(ctx context.Context, actorSubject, accountID, holdID string, captureMinor *int64) (domain.WalletTxn, error) {
	var out domain.WalletTxn
	err := r.withSubject(ctx, actorSubject, func(tx *gorm.DB) error {
		var hold domain.AccountHold
		res := tx.Raw("SELECT * FROM account_hold WHERE id = ? AND account_id = ? AND status = 'active'", holdID, accountID).Scan(&hold)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return domain.ErrWalletNotFound
		}
		// M3: captureMinor==nil → бүтэн capture (анхдагч); *==0 → зөвхөн release
		// (мөнгө хөдөлгөхгүй); 0<*<hold → partial capture. Хязгаар хэтрэх → алдаа.
		var capture int64
		if captureMinor == nil {
			capture = hold.AmountMinor
		} else {
			capture = *captureMinor
		}
		if capture < 0 || capture > hold.AmountMinor {
			return domain.ErrInvalidAmount
		}
		acc, err := lockAccount(tx, hold.AccountID)
		if err != nil {
			return err
		}
		if err := tx.Exec("UPDATE account_hold SET status = 'settled' WHERE id = ?", holdID).Error; err != nil {
			return err
		}

		// capture==0: зөвхөн барьцаа суллах (release төрлийн txn, баланс хэвээр).
		if capture == 0 {
			txnID, err := insertTxn(tx, domain.WalletTxn{
				AccountID: acc.ID, Type: domain.TxnRelease, AmountMinor: hold.AmountMinor,
				RunningBalanceMinor: acc.BalanceMinor, ExternalRef: hold.ExternalRef, CreatedBy: actorSubject,
			})
			if err != nil {
				return err
			}
			if err := tx.Exec(
				"UPDATE wallet_account SET hold_minor = hold_minor - ?, version = version + 1, updated_at = now() WHERE id = ?",
				hold.AmountMinor, acc.ID,
			).Error; err != nil {
				return err
			}
			out, err = loadTxn(tx, txnID)
			return err
		}

		running := acc.BalanceMinor - capture
		posting, _ := domain.WithdrawalPosting(acc.ID, capture)
		txnID, err := insertTxn(tx, domain.WalletTxn{
			AccountID: acc.ID, Type: domain.TxnWithdrawal, AmountMinor: capture,
			RunningBalanceMinor: running, ExternalRef: hold.ExternalRef, CreatedBy: actorSubject,
		})
		if err != nil {
			return err
		}
		if err := postEntries(tx, txnID, posting); err != nil {
			return err
		}
		if err := tx.Exec(
			"UPDATE wallet_account SET balance_minor = balance_minor - ?, hold_minor = hold_minor - ?, version = version + 1, updated_at = now() WHERE id = ?",
			capture, hold.AmountMinor, acc.ID,
		).Error; err != nil {
			return err
		}
		out, err = loadTxn(tx, txnID)
		return err
	})
	return out, err
}
