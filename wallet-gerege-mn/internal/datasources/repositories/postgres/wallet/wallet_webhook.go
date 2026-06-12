// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package wallet

import (
	"context"
	"time"

	"eidtemplate/internal/business/domain"
)

// FetchDueWebhooks нь хүргэх ёстой (pending, next_attempt_at <= now) webhook-уудыг
// client-ийн secret-тэй нь хамт буцаана. Worker singleton (advisory lock) тул
// давхар хүргэлтгүй.
func (r *Repository) FetchDueWebhooks(ctx context.Context, limit int) ([]domain.WebhookDelivery, error) {
	out := make([]domain.WebhookDelivery, 0)
	err := r.db.WithContext(ctx).Raw(`
SELECT w.id, w.client_id, w.event, w.url, w.payload, w.attempts, c.webhook_secret AS secret
FROM webhook_delivery w JOIN wallet_client c ON c.client_id = w.client_id
WHERE w.status = 'pending' AND w.next_attempt_at <= now()
ORDER BY w.next_attempt_at LIMIT ?`, limit).Scan(&out).Error
	return out, err
}

// UpdateWebhookDelivery нь хүргэлтийн үр дүнг бичнэ (delivered/failed/pending+backoff).
func (r *Repository) UpdateWebhookDelivery(ctx context.Context, id, status string, attempts int, lastErr string, nextAttempt time.Time) error {
	if status == "delivered" {
		return r.db.WithContext(ctx).Exec(
			"UPDATE webhook_delivery SET status='delivered', attempts=?, last_error='', delivered_at=now() WHERE id=?",
			attempts, id).Error
	}
	return r.db.WithContext(ctx).Exec(
		"UPDATE webhook_delivery SET status=?, attempts=?, last_error=?, next_attempt_at=? WHERE id=?",
		status, attempts, lastErr, nextAttempt, id).Error
}

// SetClientWebhook нь client-ийн webhook URL + secret-ийг тохируулна (admin).
func (r *Repository) SetClientWebhook(ctx context.Context, clientID, url, secret string) error {
	return r.db.WithContext(ctx).Exec(
		"UPDATE wallet_client SET webhook_url=?, webhook_secret=? WHERE client_id=?", url, secret, clientID).Error
}
