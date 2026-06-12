// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package domain

import (
	"errors"
	"time"
)

// ErrClientNotFound нь client_id олдоогүй үед.
var ErrClientNotFound = errors.New("wallet client not found")

// ErrInvalidClient нь client_id/secret буруу эсвэл идэвхгүй үед.
var ErrInvalidClient = errors.New("invalid client credentials")

// ErrIPNotAllowed нь client-ийн IP whitelist-д ороогүй IP-аас хүсэлт ирэхэд.
var ErrIPNotAllowed = errors.New("client ip not allowed")

// WalletClient нь OAuth2 client_credentials бүртгэл (wallet_client). Бусад систем
// client_id + client_secret-ээр /oauth/token-оос wallet JWT авна. client_id нь
// хэтэвчний эзэн (owner) — RLS-ийн app.subject болно (client = өөрийн хэтэвч).
type WalletClient struct {
	ClientID   string     `gorm:"column:client_id" json:"client_id"`
	SecretHash string     `gorm:"column:secret_hash" json:"-"`
	Name       string     `gorm:"column:name" json:"name"`
	Active     bool       `gorm:"column:active" json:"active"`
	AllowedIPs string     `gorm:"column:allowed_ips" json:"allowed_ips"`
	WebhookURL string     `gorm:"column:webhook_url" json:"webhook_url"`
	WebhookSecret string  `gorm:"column:webhook_secret" json:"-"`
	CreatedAt  time.Time  `gorm:"column:created_at" json:"created_at"`
	LastUsedAt *time.Time `gorm:"column:last_used_at" json:"last_used_at,omitempty"`
}

// TableName нь wallet_client хүснэгтийг зааж өгнө.
func (WalletClient) TableName() string { return "wallet_client" }
