// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package wallet

import (
	"context"

	"eidtemplate/internal/business/domain"
)

// GetClient нь wallet_client-ийг client_id-аар уншина (token endpoint-д, auth-аас
// өмнө). wallet_client нь RLS-гүй reference data тул withSubject хэрэггүй.
func (r *Repository) GetClient(ctx context.Context, clientID string) (domain.WalletClient, error) {
	var c domain.WalletClient
	res := r.db.WithContext(ctx).Raw(
		"SELECT * FROM wallet_client WHERE client_id = ?", clientID).Scan(&c)
	if res.Error != nil {
		return c, res.Error
	}
	if res.RowsAffected == 0 {
		return c, domain.ErrClientNotFound
	}
	return c, nil
}

// TouchClientUsed нь client-ийн last_used_at-ийг шинэчилнэ (fire-and-forget).
func (r *Repository) TouchClientUsed(ctx context.Context, clientID string) error {
	return r.db.WithContext(ctx).Exec(
		"UPDATE wallet_client SET last_used_at = now() WHERE client_id = ?", clientID).Error
}
