// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Энэ файл нь wallet өдрийн snapshot ба тайлангийн (report templates) домэйн
// төрлүүдийг агуулна. SQL тал нь migrations m29/m30 (SECURITY DEFINER функцүүд);
// дүн бүгд bigint minor unit (MNT). Дизайн: docs/WALLET_LEDGER_DESIGN.md §10.
package domain

import "time"

// WalletDailySnapshot нь нэг данс × нэг өдрийн EOD баланс + хөдөлгөөн
// (wallet_daily_snapshot, m29). opening/closing нь immutable ledger-ээс гарсан
// түүхэн нягт утга; hold нь snapshot үеийн point-in-time.
type WalletDailySnapshot struct {
	SnapshotDate time.Time `gorm:"column:snapshot_date" json:"snapshot_date"`
	AccountID    string    `gorm:"column:account_id" json:"account_id"`
	AccountNo    string    `gorm:"column:account_no" json:"account_no"`
	OwnerType    string    `gorm:"column:owner_type" json:"owner_type"`
	OwnerID      string    `gorm:"column:owner_id" json:"owner_id"`
	OpeningMinor int64     `gorm:"column:opening_minor" json:"opening_minor"`
	CreditMinor  int64     `gorm:"column:credit_minor" json:"credit_minor"`
	DebitMinor   int64     `gorm:"column:debit_minor" json:"debit_minor"`
	ClosingMinor int64     `gorm:"column:closing_minor" json:"closing_minor"`
	HoldMinor    int64     `gorm:"column:hold_minor" json:"hold_minor"`
	TxnCount     int       `gorm:"column:txn_count" json:"txn_count"`
}

// TableName нь wallet_daily_snapshot хүснэгтийг зааж өгнө.
func (WalletDailySnapshot) TableName() string { return "wallet_daily_snapshot" }

// TrialBalanceRow нь wallet_report_trial_balance()-ийн нэг GL мөр. Trial balance
// тэнцэхэд бүх мөрийн Σdebit = Σcredit. balance_minor нь тухайн төрлийн normal
// тал дахь эерэг үлдэгдэл.
type TrialBalanceRow struct {
	GLAccount    string `gorm:"column:gl_account" json:"gl_account"`
	GLType       string `gorm:"column:gl_type" json:"gl_type"`
	GLName       string `gorm:"column:gl_name" json:"gl_name"`
	DebitMinor   int64  `gorm:"column:debit_minor" json:"debit_minor"`
	CreditMinor  int64  `gorm:"column:credit_minor" json:"credit_minor"`
	BalanceMinor int64  `gorm:"column:balance_minor" json:"balance_minor"`
}

// DailyTurnoverRow нь wallet_report_daily_turnover()-ийн нэг өдрийн нэгтгэл
// (бүх дансаар, snapshot дээр тулгуурлана).
type DailyTurnoverRow struct {
	Day          time.Time `gorm:"column:day" json:"day"`
	Accounts     int       `gorm:"column:accounts" json:"accounts"`
	CreditMinor  int64     `gorm:"column:credit_minor" json:"credit_minor"`
	DebitMinor   int64     `gorm:"column:debit_minor" json:"debit_minor"`
	NetMinor     int64     `gorm:"column:net_minor" json:"net_minor"`
	ClosingMinor int64     `gorm:"column:closing_minor" json:"closing_minor"`
	TxnCount     int64     `gorm:"column:txn_count" json:"txn_count"`
}

// AccountStatementRow нь wallet_report_account_statement()-ийн нэг гүйлгээ.
type AccountStatementRow struct {
	TxnID               string    `gorm:"column:txn_id" json:"txn_id"`
	TxnAt               time.Time `gorm:"column:txn_at" json:"txn_at"`
	Type                string    `gorm:"column:type" json:"type"`
	AmountMinor         int64     `gorm:"column:amount_minor" json:"amount_minor"`
	RunningBalanceMinor int64     `gorm:"column:running_balance_minor" json:"running_balance_minor"`
	ExternalRef         string    `gorm:"column:external_ref" json:"external_ref,omitempty"`
	IsReversed          bool      `gorm:"column:is_reversed" json:"is_reversed"`
}
