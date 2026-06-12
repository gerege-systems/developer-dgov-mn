// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package domain

import (
	"errors"
	"time"
)

// WalletAdmin нь super-admin нэвтрэлт (wallet_admin). username + bcrypt password.
type WalletAdmin struct {
	Username     string     `gorm:"column:username" json:"username"`
	PasswordHash string     `gorm:"column:password_hash" json:"-"`
	Name         string     `gorm:"column:name" json:"name"`
	Active       bool       `gorm:"column:active" json:"active"`
	CreatedAt    time.Time  `gorm:"column:created_at" json:"created_at"`
	LastLoginAt  *time.Time `gorm:"column:last_login_at" json:"last_login_at,omitempty"`
}

// TableName нь wallet_admin хүснэгтийг зааж өгнө.
func (WalletAdmin) TableName() string { return "wallet_admin" }

// ErrAdminNotFound нь admin username олдоогүй үед.
var ErrAdminNotFound = errors.New("admin not found")

// AuditRow нь api_audit_logs-ийн нэг мөр (admin харах).
type AuditRow struct {
	ActorSubject string    `gorm:"column:actor_subject" json:"actor_subject"`
	Action       string    `gorm:"column:action" json:"action"`
	Method       string    `gorm:"column:method" json:"method"`
	Path         string    `gorm:"column:path" json:"path"`
	StatusCode   int       `gorm:"column:status_code" json:"status_code"`
	IP           string    `gorm:"column:ip" json:"ip"`
	LatencyMS    int64     `gorm:"column:latency_ms" json:"latency_ms"`
	CreatedAt    time.Time `gorm:"column:created_at" json:"created_at"`
}
