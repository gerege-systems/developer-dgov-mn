// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package domain

import (
	"errors"
	"time"
)

// QR төлбөр / нэхэмжлэх (invoice) sentinel алдаанууд.
var (
	ErrRequestNotFound   = errors.New("payment request not found")
	ErrRequestNotPayable = errors.New("payment request not payable")
	ErrRequestExpired    = errors.New("payment request expired")
	ErrInvalidQR         = errors.New("invalid qr token")
	ErrCannotPaySelf     = errors.New("cannot pay your own request")
)

// PaymentRequest нь QR төлбөрийн хүсэлт / нэхэмжлэх (payment_request).
//   kind='static'  — байнгын QR (дүнгүй, олон удаа)
//   kind='dynamic' — нэхэмжлэх (тогтсон дүн + хугацаа, нэг удаа)
type PaymentRequest struct {
	ID              string     `gorm:"column:id" json:"id"`
	Kind            string     `gorm:"column:kind" json:"kind"`
	PayeeOwner      string     `gorm:"column:payee_owner" json:"-"`
	PayeeAccountNo  string     `gorm:"column:payee_account_no" json:"payee_account_no"`
	AmountMinor     *int64     `gorm:"column:amount_minor" json:"amount_minor,omitempty"`
	Currency        string     `gorm:"column:currency" json:"currency"`
	Reference       string     `gorm:"column:reference" json:"reference"`
	Status          string     `gorm:"column:status" json:"status"`
	ExpiresAt       *time.Time `gorm:"column:expires_at" json:"expires_at,omitempty"`
	PaidTxnID       *string    `gorm:"column:paid_txn_id" json:"paid_txn_id,omitempty"`
	PaidBy          *string    `gorm:"column:paid_by" json:"paid_by,omitempty"`
	PaidAt          *time.Time `gorm:"column:paid_at" json:"paid_at,omitempty"`
	PaidAmountMinor *int64     `gorm:"column:paid_amount_minor" json:"paid_amount_minor,omitempty"`
	CreatedBy       string     `gorm:"column:created_by" json:"-"`
	CreatedAt       time.Time  `gorm:"column:created_at" json:"created_at"`
}

// TableName нь payment_request хүснэгтийг зааж өгнө.
func (PaymentRequest) TableName() string { return "payment_request" }

// WebhookDelivery нь нэг webhook хүргэлтийн зорилт (worker боловсруулна). Secret
// нь wallet_client-ээс JOIN хийсэн — HMAC гарын үсэгт ашиглана.
type WebhookDelivery struct {
	ID       string `gorm:"column:id"`
	ClientID string `gorm:"column:client_id"`
	Event    string `gorm:"column:event"`
	URL      string `gorm:"column:url"`
	Payload  string `gorm:"column:payload"`
	Attempts int    `gorm:"column:attempts"`
	Secret   string `gorm:"column:secret"`
}

// PaymentPublic нь QR-аар төлөгчид харуулах ИЛ мэдээлэл (PII-гүй;
// payment_request_public функцийн үр дүн).
type PaymentPublic struct {
	Kind           string `gorm:"column:kind" json:"kind"`
	PayeeAccountNo string `gorm:"column:payee_account_no" json:"payee_account_no"`
	AmountMinor    *int64 `gorm:"column:amount_minor" json:"amount_minor,omitempty"`
	Currency       string `gorm:"column:currency" json:"currency"`
	Reference      string `gorm:"column:reference" json:"reference"`
	Status         string `gorm:"column:status" json:"status"`
}

// EffectiveStatus нь хугацаа дууссан pending-ийг 'expired' гэж тооцож буцаана
// (DB-д бичихгүй; унших талын дүрслэл).
func (p PaymentRequest) EffectiveStatus(now time.Time) string {
	if p.Status == "pending" && p.ExpiresAt != nil && p.ExpiresAt.Before(now) {
		return "expired"
	}
	return p.Status
}
