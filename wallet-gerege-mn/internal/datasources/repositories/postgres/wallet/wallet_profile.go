// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package wallet

import (
	"context"

	"eidtemplate/internal/business/domain"

	"gorm.io/gorm"
)

// UpsertOwnerProfile нь эзний (иргэн) display/KYC snapshot-ийг бичнэ. withSubject
// (app_user role + app.subject) дотор тул RLS-ээр owner зөвхөн ӨӨРИЙН профайлыг
// л бичнэ — owner_id = subject (токены subject), p.OwnerID-г үл тоомсорлоно.
func (r *Repository) UpsertOwnerProfile(ctx context.Context, subject string, p domain.WalletOwnerProfile) error {
	return r.withSubject(ctx, subject, func(tx *gorm.DB) error {
		return tx.Exec(`
INSERT INTO wallet_owner_profile
  (owner_id, full_name, given_name, family_name, national_id, phone, email, kyc_verified, source, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, now())
ON CONFLICT (owner_id) DO UPDATE SET
  full_name    = EXCLUDED.full_name,
  given_name   = EXCLUDED.given_name,
  family_name  = EXCLUDED.family_name,
  national_id  = EXCLUDED.national_id,
  phone        = EXCLUDED.phone,
  email        = EXCLUDED.email,
  kyc_verified = EXCLUDED.kyc_verified,
  source       = EXCLUDED.source,
  updated_at   = now()`,
			subject, p.FullName, p.GivenName, p.FamilyName, p.NationalID,
			p.Phone, p.Email, p.KYCVerified, p.Source).Error
	})
}
