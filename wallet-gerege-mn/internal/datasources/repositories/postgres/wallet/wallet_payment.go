// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package wallet

import (
	"context"
	"time"

	"eidtemplate/internal/business/domain"

	"gorm.io/gorm"
)

// CreatePaymentRequest нь хүлээн авагч (subject)-ийн нэрээр QR/нэхэмжлэх үүсгэнэ.
// payee_account_no-г тухайн эзний идэвхтэй хэтэвчээс олно (байхгүй бол алдаа).
func (r *Repository) CreatePaymentRequest(
	ctx context.Context, subject, kind string, amountMinor *int64,
	currency, reference string, expiresAt *time.Time,
) (domain.PaymentRequest, error) {
	var out domain.PaymentRequest
	err := r.withSubject(ctx, subject, func(tx *gorm.DB) error {
		var accountNo string
		row := tx.Raw(
			"SELECT account_no FROM wallet_account WHERE owner_id = ? AND status = 'active' ORDER BY created_at LIMIT 1",
			subject).Row()
		if err := row.Scan(&accountNo); err != nil {
			return domain.ErrWalletNotFound
		}
		status := "pending"
		if kind == "static" {
			status = "active"
		}
		return tx.Raw(`
INSERT INTO payment_request (kind, payee_owner, payee_account_no, amount_minor, currency, reference, status, expires_at, created_by)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING *`, kind, subject, accountNo, amountMinor, currency, reference, status, expiresAt, subject).Scan(&out).Error
	})
	return out, err
}

// GetPaymentRequest нь эзний нэхэмжлэхийг id-аар уншина (RLS — зөвхөн өөрийн).
func (r *Repository) GetPaymentRequest(ctx context.Context, subject, id string) (domain.PaymentRequest, error) {
	var out domain.PaymentRequest
	err := r.withSubject(ctx, subject, func(tx *gorm.DB) error {
		res := tx.Raw("SELECT * FROM payment_request WHERE id = ?", id).Scan(&out)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return domain.ErrRequestNotFound
		}
		return nil
	})
	return out, err
}

// ListPaymentRequests нь эзний нэхэмжлэхүүдийг хуудаслан буцаана.
func (r *Repository) ListPaymentRequests(ctx context.Context, subject string, offset, limit int) ([]domain.PaymentRequest, error) {
	out := make([]domain.PaymentRequest, 0)
	err := r.withSubject(ctx, subject, func(tx *gorm.DB) error {
		return tx.Raw(
			"SELECT * FROM payment_request WHERE payee_owner = ? ORDER BY created_at DESC OFFSET ? LIMIT ?",
			subject, offset, limit).Scan(&out).Error
	})
	return out, err
}

// CancelPaymentRequest нь нэхэмжлэхийг цуцална (зөвхөн active/pending).
func (r *Repository) CancelPaymentRequest(ctx context.Context, subject, id string) error {
	return r.withSubject(ctx, subject, func(tx *gorm.DB) error {
		res := tx.Exec(
			"UPDATE payment_request SET status='canceled' WHERE id = ? AND status IN ('active','pending')", id)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return domain.ErrRequestNotPayable
		}
		return nil
	})
}

// ResolveRequestPublic нь нэхэмжлэхийн ИЛ мэдээллийг (payment_request_public,
// SECURITY DEFINER) буцаана — төлөгч (payee биш) харна. found=false бол байхгүй.
func (r *Repository) ResolveRequestPublic(ctx context.Context, id string) (domain.PaymentPublic, bool, error) {
	var p domain.PaymentPublic
	res := r.db.WithContext(ctx).Raw("SELECT * FROM payment_request_public(?)", id).Scan(&p)
	if res.Error != nil {
		return p, false, res.Error
	}
	return p, res.RowsAffected > 0 && p.PayeeAccountNo != "", nil
}

type payParams struct {
	RequestID string
	Amount    int64
	Fee       int64
}

// PayRequest нь төлөгч (payer) нэхэмжлэхийг төлнө — pay_request SECURITY DEFINER
// функцээр атомар settle. fee нь fee_rule-ээс тооцоологдсон (0 бол шимтгэлгүй).
// Idempotency-Key-ээр replay.
func (r *Repository) PayRequest(ctx context.Context, payer, requestID string, amount, fee int64, idemKey, externalRef string) (domain.WalletTxn, error) {
	var out domain.WalletTxn
	params := payParams{RequestID: requestID, Amount: amount, Fee: fee}
	err := r.withSubject(ctx, payer, func(tx *gorm.DB) error {
		if txn, found, err := replay(tx, idemKey, payer, params); err != nil {
			return err
		} else if found {
			out = txn
			return nil
		}
		var txnID string
		row := tx.Raw("SELECT pay_request(?, ?, ?, ?, ?)", payer, requestID, amount, fee, externalRef).Row()
		if err := row.Scan(&txnID); err != nil {
			return mapPaymentErr(err)
		}
		if err := store(tx, idemKey, payer, txnID, params); err != nil {
			return err
		}
		var err error
		out, err = loadTxn(tx, txnID)
		return err
	})
	return out, err
}
