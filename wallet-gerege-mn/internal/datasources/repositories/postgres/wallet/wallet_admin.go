// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Энэ файл нь super-admin (тусдаа admin API)-ийн repo методууд. Admin API нь
// superuser DSN-ээр холбогддог тул эдгээр нь withSubject-гүй (RLS тойрч бүх
// дансыг харна, client/fee_rule/data удирдана).
package wallet

import (
	"context"

	"eidtemplate/internal/business/domain"
)

// GetAdmin нь wallet_admin-ийг username-аар уншина.
func (r *Repository) GetAdmin(ctx context.Context, username string) (domain.WalletAdmin, error) {
	var a domain.WalletAdmin
	res := r.db.WithContext(ctx).Raw("SELECT * FROM wallet_admin WHERE username = ?", username).Scan(&a)
	if res.Error != nil {
		return a, res.Error
	}
	if res.RowsAffected == 0 {
		return a, domain.ErrAdminNotFound
	}
	return a, nil
}

// TouchAdminLogin нь last_login_at-ийг шинэчилнэ.
func (r *Repository) TouchAdminLogin(ctx context.Context, username string) error {
	return r.db.WithContext(ctx).Exec("UPDATE wallet_admin SET last_login_at = now() WHERE username = ?", username).Error
}

// ---- clients ----

func (r *Repository) ListClients(ctx context.Context) ([]domain.WalletClient, error) {
	out := make([]domain.WalletClient, 0)
	err := r.db.WithContext(ctx).Raw("SELECT * FROM wallet_client ORDER BY created_at DESC").Scan(&out).Error
	return out, err
}

func (r *Repository) SetClientActive(ctx context.Context, clientID string, active bool) error {
	return r.db.WithContext(ctx).Exec("UPDATE wallet_client SET active = ? WHERE client_id = ?", active, clientID).Error
}

// SetClientIPs нь client-ийн IP allowlist-ийг (таслалаар тусгаарласан) шинэчилнэ.
func (r *Repository) SetClientIPs(ctx context.Context, clientID, allowedIPs string) error {
	return r.db.WithContext(ctx).Exec("UPDATE wallet_client SET allowed_ips = ? WHERE client_id = ?", allowedIPs, clientID).Error
}

// CreateClient нь шинэ client-ийг (secret аль хэдийн hash хийгдсэн) бичнэ.
func (r *Repository) CreateClient(ctx context.Context, clientID, name, secretHash string) error {
	return r.db.WithContext(ctx).Exec(
		"INSERT INTO wallet_client (client_id, secret_hash, name) VALUES (?, ?, ?)", clientID, secretHash, name).Error
}

// ---- accounts (бүх данс, RLS тойрно) ----

func (r *Repository) ListAllAccounts(ctx context.Context, offset, limit int) ([]domain.WalletAccount, error) {
	type row struct {
		domain.WalletAccount
		PFullName   string `gorm:"column:p_full_name"`
		PNationalID string `gorm:"column:p_national_id"`
		PKYC        bool   `gorm:"column:p_kyc"`
	}
	var rows []row
	err := r.db.WithContext(ctx).Raw(`
SELECT a.*, p.full_name AS p_full_name, p.national_id AS p_national_id,
       COALESCE(p.kyc_verified, false) AS p_kyc
FROM wallet_account a
LEFT JOIN wallet_owner_profile p ON p.owner_id = a.owner_id
ORDER BY a.created_at DESC OFFSET ? LIMIT ?`, offset, limit).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]domain.WalletAccount, 0, len(rows))
	for _, x := range rows {
		a := x.WalletAccount
		a.OwnerName = x.PFullName
		a.OwnerNationalID = x.PNationalID
		a.OwnerKYC = x.PKYC
		out = append(out, a)
	}
	return out, nil
}

func (r *Repository) GetAccountByNo(ctx context.Context, accountNo string) (domain.WalletAccount, error) {
	type row struct {
		domain.WalletAccount
		PFullName   string `gorm:"column:p_full_name"`
		PNationalID string `gorm:"column:p_national_id"`
		PKYC        bool   `gorm:"column:p_kyc"`
	}
	var x row
	res := r.db.WithContext(ctx).Raw(`
SELECT a.*, p.full_name AS p_full_name, p.national_id AS p_national_id,
       COALESCE(p.kyc_verified, false) AS p_kyc
FROM wallet_account a
LEFT JOIN wallet_owner_profile p ON p.owner_id = a.owner_id
WHERE a.account_no = ?`, accountNo).Scan(&x)
	if res.Error != nil {
		return domain.WalletAccount{}, res.Error
	}
	if res.RowsAffected == 0 {
		return domain.WalletAccount{}, domain.ErrWalletNotFound
	}
	a := x.WalletAccount
	a.OwnerName, a.OwnerNationalID, a.OwnerKYC = x.PFullName, x.PNationalID, x.PKYC
	return a, nil
}

// AdminListPaymentRequests нь бүх QR төлбөр/нэхэмжлэхийг буцаана (superuser, RLS тойрно).
func (r *Repository) AdminListPaymentRequests(ctx context.Context, offset, limit int) ([]domain.PaymentRequest, error) {
	out := make([]domain.PaymentRequest, 0)
	err := r.db.WithContext(ctx).Raw(
		"SELECT * FROM payment_request ORDER BY created_at DESC OFFSET ? LIMIT ?", offset, limit).Scan(&out).Error
	return out, err
}

// GetOwnerProfile нь эзний бүрэн профайл (wallet_owner_profile)-ийг буцаана.
// Профайл байхгүй бол found=false (алдаа биш).
func (r *Repository) GetOwnerProfile(ctx context.Context, ownerID string) (domain.WalletOwnerProfile, bool, error) {
	var p domain.WalletOwnerProfile
	res := r.db.WithContext(ctx).Raw("SELECT * FROM wallet_owner_profile WHERE owner_id = ?", ownerID).Scan(&p)
	if res.Error != nil {
		return p, false, res.Error
	}
	return p, res.RowsAffected > 0, nil
}

// SetAccountStatus нь дансны статусыг өөрчилнө (active/frozen/closed).
func (r *Repository) SetAccountStatus(ctx context.Context, accountNo, status string) error {
	res := r.db.WithContext(ctx).Exec(
		"UPDATE wallet_account SET status = ?, version = version + 1, updated_at = now() WHERE account_no = ?", status, accountNo)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return domain.ErrWalletNotFound
	}
	return nil
}

// ---- fee rules ----

func (r *Repository) ListFeeRules(ctx context.Context) ([]domain.FeeRule, error) {
	out := make([]domain.FeeRule, 0)
	err := r.db.WithContext(ctx).Raw("SELECT * FROM fee_rule ORDER BY txn_type, priority DESC").Scan(&out).Error
	return out, err
}

func (r *Repository) SetFeeRuleActive(ctx context.Context, code string, active bool) error {
	res := r.db.WithContext(ctx).Exec("UPDATE fee_rule SET active = ?, updated_at = now() WHERE code = ?", active, code)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return domain.ErrWalletNotFound
	}
	return nil
}

// ---- audit ----

func (r *Repository) ListAudit(ctx context.Context, limit int) ([]domain.AuditRow, error) {
	out := make([]domain.AuditRow, 0)
	err := r.db.WithContext(ctx).Raw(
		"SELECT actor_subject, action, method, path, status_code, ip, latency_ms, created_at FROM api_audit_logs ORDER BY created_at DESC LIMIT ?", limit).Scan(&out).Error
	return out, err
}
