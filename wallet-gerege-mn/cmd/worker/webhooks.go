// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package main

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"time"

	walletpostgres "eidtemplate/internal/datasources/repositories/postgres/wallet"
)

const webhookMaxAttempts = 6

var webhookClient = &http.Client{Timeout: 10 * time.Second}

// deliverWebhooks нь хүргэх ёстой webhook-уудыг авч HMAC-SHA256 гарын үсэгтэйгээр
// POST хийнэ. Амжилтгүй бол exponential backoff-оор дахин оролдоно (max 6 удаа).
// Worker singleton (advisory lock) тул давхар хүргэхгүй.
func deliverWebhooks(ctx context.Context, repo *walletpostgres.Repository, log *slog.Logger) {
	rows, err := repo.FetchDueWebhooks(ctx, 20)
	if err != nil {
		log.Error("webhook fetch failed", "error", err)
		return
	}
	for _, w := range rows {
		attempts := w.Attempts + 1
		// SSRF guard: дотоод/loopback/private хаяг руу хүргэхгүй (admin URL тавьдаг).
		if !isSafeWebhookURL(w.URL) {
			_ = repo.UpdateWebhookDelivery(ctx, w.ID, "failed", attempts, "blocked: unsafe webhook url (private/loopback)", time.Time{})
			log.Error("webhook blocked by SSRF guard", "id", w.ID, "url", w.URL)
			continue
		}
		ok, errMsg := postWebhook(ctx, w.URL, w.Event, w.Payload, w.Secret)
		switch {
		case ok:
			_ = repo.UpdateWebhookDelivery(ctx, w.ID, "delivered", attempts, "", time.Time{})
			log.Info("webhook delivered", "id", w.ID, "client", w.ClientID, "event", w.Event)
		case attempts >= webhookMaxAttempts:
			_ = repo.UpdateWebhookDelivery(ctx, w.ID, "failed", attempts, errMsg, time.Time{})
			log.Error("webhook failed (max attempts)", "id", w.ID, "client", w.ClientID, "error", errMsg)
		default:
			backoff := time.Duration(int64(1)<<uint(attempts)) * time.Minute // 2,4,8,16,32 мин
			_ = repo.UpdateWebhookDelivery(ctx, w.ID, "pending", attempts, errMsg, time.Now().Add(backoff))
			log.Warn("webhook retry scheduled", "id", w.ID, "attempt", attempts, "next_in", backoff.String(), "error", errMsg)
		}
	}
}

func postWebhook(ctx context.Context, url, event, payload, secret string) (bool, string) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader([]byte(payload)))
	if err != nil {
		return false, err.Error()
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Webhook-Event", event)
	req.Header.Set("X-Webhook-Signature", "sha256="+hmacHex(secret, payload))
	resp, err := webhookClient.Do(req)
	if err != nil {
		return false, err.Error()
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return true, ""
	}
	return false, fmt.Sprintf("http %d", resp.StatusCode)
}

// isSafeWebhookURL нь URL https мөн host нь нийтийн (private/loopback/link-local
// биш) IP-руу зааж байгаа эсэхийг шалгана (SSRF-аас сэргийлэх).
func isSafeWebhookURL(raw string) bool {
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "https" || u.Hostname() == "" {
		return false
	}
	ips, err := net.LookupIP(u.Hostname())
	if err != nil || len(ips) == 0 {
		return false
	}
	for _, ip := range ips {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified() ||
			ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
			return false
		}
	}
	return true
}

func hmacHex(secret, body string) string {
	m := hmac.New(sha256.New, []byte(secret))
	m.Write([]byte(body))
	return hex.EncodeToString(m.Sum(nil))
}
