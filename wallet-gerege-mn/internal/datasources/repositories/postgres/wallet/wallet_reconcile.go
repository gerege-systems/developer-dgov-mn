// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package wallet

import (
	"context"

	"eidtemplate/internal/business/domain"
)

// Reconcile нь wallet_reconcile() функцийг дуудаж ledger-ийн бүрэн бүтэн
// байдлын зөрүүнүүдийг буцаана (хоосон = эрүүл). Функц нь definer тул RLS
// тойрно; дуудагч холболт admin_identity ЭСВЭЛ superuser байх ёстой (cron
// runner — cmd/reconcile). app_user-д EXECUTE олгоогүй.
func (r *Repository) Reconcile(ctx context.Context) ([]domain.ReconDiscrepancy, error) {
	out := make([]domain.ReconDiscrepancy, 0)
	if err := r.db.WithContext(ctx).Raw("SELECT * FROM wallet_reconcile()").Scan(&out).Error; err != nil {
		return nil, err
	}
	return out, nil
}
