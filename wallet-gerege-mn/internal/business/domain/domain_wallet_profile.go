// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package domain

import "time"

// WalletOwnerProfile нь хэтэвчний эзний (иргэн) display/KYC snapshot
// (wallet_owner_profile). Identity-ийн эх сурвалж нь auth/me; энэ нь admin-д
// нэр/KYC харуулах денормчлол. me.gerege.mn нь иргэний токеноор push хийнэ.
type WalletOwnerProfile struct {
	OwnerID     string    `gorm:"column:owner_id" json:"owner_id"`
	FullName    string    `gorm:"column:full_name" json:"full_name,omitempty"`
	GivenName   string    `gorm:"column:given_name" json:"given_name,omitempty"`
	FamilyName  string    `gorm:"column:family_name" json:"family_name,omitempty"`
	NationalID  string    `gorm:"column:national_id" json:"national_id,omitempty"`
	Phone       string    `gorm:"column:phone" json:"phone,omitempty"`
	Email       string    `gorm:"column:email" json:"email,omitempty"`
	KYCVerified bool      `gorm:"column:kyc_verified" json:"kyc_verified"`
	Source      string    `gorm:"column:source" json:"source,omitempty"`
	UpdatedAt   time.Time `gorm:"column:updated_at" json:"updated_at"`
}

// TableName нь wallet_owner_profile хүснэгтийг зааж өгнө.
func (WalletOwnerProfile) TableName() string { return "wallet_owner_profile" }
