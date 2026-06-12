// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Энэ файл нь wallet ledger-ийн домэйн төрлүүд, тогтмолууд, sentinel алдаа
// болон DB-гүй (цэвэр) дүрмийг агуулна. Double-entry постингийн логик нь
// domain_wallet_ledger.go-д. Дизайн: docs/WALLET_LEDGER_DESIGN.md (v1.0).
//
// Мөнгө бүх газар bigint minor unit (MNT decimal=0 тул minor = ₮). float
// хэзээ ч ашиглахгүй (P5).
package domain

import (
	"errors"
	"time"
)

// Owner төрөл — хэтэвч хувь хүн ЭСВЭЛ байгууллагынх (P8).
const (
	OwnerPerson       = "person"
	OwnerOrganization = "organization"
)

// Хэтэвчний статус.
const (
	WalletPending = "pending"
	WalletActive  = "active"
	WalletFrozen  = "frozen"
	WalletClosed  = "closed"
)

// Гүйлгээний төрөл (wallet_txn.type).
const (
	TxnDeposit     = "deposit"
	TxnWithdrawal  = "withdrawal"
	TxnTransferIn  = "transfer_in"
	TxnTransferOut = "transfer_out"
	TxnHold        = "hold"
	TxnRelease     = "release"
	TxnFee         = "fee"
	TxnReversal    = "reversal"
)

// Double-entry чиглэл.
const (
	DirectionDebit  = "DEBIT"
	DirectionCredit = "CREDIT"
)

// GL account кодууд (gl_account.code) — m21/m28 seed-тэй тохирно.
const (
	GLCustomerWallet    = "customer_wallet_liability"
	GLBankSettlement    = "bank_settlement"
	GLTransferClearing  = "internal_transfer_clearing"
	GLFeeIncome         = "fee_income"          // INCOME (m28-д ASSET/LIABILITY-аас зөв ангилсан)
	GLBankChargeExpense = "bank_charge_expense" // EXPENSE — gateway-д төлсөн шимтгэл
	GLSuspense          = "suspense_liability"  // LIABILITY — тодорхойгүй/recon түр данс
)

// Шимтгэлийн тооцооллын арга (fee_rule.method).
const (
	FeeMethodFlat    = "FLAT"
	FeeMethodPercent = "PERCENT"
)

// MaxAmountMinor нь нэг гүйлгээний дээд хязгаар (L2) — 1 их наяд ₮ (overflow/
// буруу оролтоос хамгаална). Production-д channel/KYC-аар нарийсгаж болно.
const MaxAmountMinor int64 = 1_000_000_000_000

// Байгууллагын гишүүнчлэлийн role (organization_memberships.role)-той тохирно.
const (
	RoleOwner      = "Эзэмшигч"
	RoleCEO        = "Захирал"
	RoleAccountant = "Нягтлан"
	RoleMember     = "Гишүүн"
)

// Wallet ledger-ийн sentinel алдаанууд. Usecase давхарга эдгээрийг apperror
// төрөл рүү буулгана (ж: ErrInsufficientFunds → BadRequest/Conflict).
var (
	// ErrInvalidAmount нь дүн эерэг бус (≤ 0) үед.
	ErrInvalidAmount = errors.New("amount must be positive")
	// ErrInsufficientFunds нь боломжит үлдэгдэл (balance − hold) хүрэлцэхгүй үед.
	ErrInsufficientFunds = errors.New("insufficient funds")
	// ErrAccountNotActive нь данс active бус (pending/frozen/closed) үед гүйлгээ татгалзана.
	ErrAccountNotActive = errors.New("wallet account is not active")
	// ErrUnbalancedPosting нь double-entry постингийн Σdebit ≠ Σcredit үед (P1).
	ErrUnbalancedPosting = errors.New("ledger posting is not balanced")
	// ErrRoleForbidden нь байгууллагын хэтэвчид тухайн role-д хориотой үйлдэл хийх үед.
	ErrRoleForbidden = errors.New("role not permitted for this operation")
	// ErrSameAccountTransfer нь эх ба хүлээн авагч данс ижил үед.
	ErrSameAccountTransfer = errors.New("cannot transfer to the same account")
	// ErrWalletNotFound нь данс олдоогүй үед.
	ErrWalletNotFound = errors.New("wallet account not found")
	// ErrAlreadyReversed нь аль хэдийн буцаагдсан гүйлгээг дахин буцаах гэх үед.
	ErrAlreadyReversed = errors.New("transaction already reversed")
	// ErrReversalUnsupported нь буцаалт дэмжээгүй төрлийн гүйлгээнд (ж: transfer).
	ErrReversalUnsupported = errors.New("reversal not supported for this transaction type")
	// ErrMissingExternalRef нь gateway top-up-д банкны reference дутуу үед.
	ErrMissingExternalRef = errors.New("external reference required")
	// ErrOrgNotFound нь иргэн тухайн байгууллагын гишүүн биш / олдоогүй үед.
	ErrOrgNotFound = errors.New("organization not found or not a member")
	// ErrIdempotencyMismatch нь ижил idempotency key-г ӨӨР body-той дахин
	// илгээх үед (хадгалсан request_hash таарахгүй) — M1.
	ErrIdempotencyMismatch = errors.New("idempotency key reused with a different request")
)

// WalletAccount нь хэтэвч (wallet_account). balance/hold нь derived cache (P3);
// эх сурвалж нь ledger_entry. Version нь optimistic lock (P6).
type WalletAccount struct {
	ID           string    `gorm:"column:id" json:"id"`
	AccountNo    string    `gorm:"column:account_no" json:"account_no"`
	OwnerType    string    `gorm:"column:owner_type" json:"owner_type"`
	OwnerID      string    `gorm:"column:owner_id" json:"owner_id"`
	Currency     string    `gorm:"column:currency" json:"currency"`
	Status       string    `gorm:"column:status" json:"status"`
	BalanceMinor int64     `gorm:"column:balance_minor" json:"balance_minor"`
	HoldMinor    int64     `gorm:"column:hold_minor" json:"hold_minor"`
	Version      int64     `gorm:"column:version" json:"-"`
	CreatedAt    time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at" json:"updated_at"`
	// IBAN нь account_no-оос config-той хослуулж тооцоолсон derived утга —
	// DB-д хадгалахгүй (gorm:"-"). Унших давхаргад л бөглөнө, хоосон бол алгасна.
	IBAN string `gorm:"-" json:"iban,omitempty"`

	// Admin-only: wallet_owner_profile-ээс LEFT JOIN хийсэн эзний нэр/KYC
	// (gorm:"-"; зөвхөн admin ListAllAccounts бөглөнө). national_id-г frontend
	// masked харуулна.
	OwnerName       string `gorm:"-" json:"owner_name,omitempty"`
	OwnerNationalID string `gorm:"-" json:"owner_national_id,omitempty"`
	OwnerKYC        bool   `gorm:"-" json:"owner_kyc"`
}

// TableName нь GORM-д default олон тооны нэр (wallet_accounts) биш, бодит
// хүснэгтийн нэрийг (wallet_account) ашиглуулна.
func (WalletAccount) TableName() string { return "wallet_account" }

// Available нь боломжит үлдэгдэл = баланс − барьцаа (P4).
func (a WalletAccount) Available() int64 { return a.BalanceMinor - a.HoldMinor }

// IsActive нь данс гүйлгээ хийх боломжтой эсэхийг буцаана.
func (a WalletAccount) IsActive() bool { return a.Status == WalletActive }

// WalletTxn нь гүйлгээ (wallet_txn). Append-only — засвар нь reversal (P2).
type WalletTxn struct {
	ID                  string    `gorm:"column:id" json:"id"`
	AccountID           string    `gorm:"column:account_id" json:"account_id"`
	Type                string    `gorm:"column:type" json:"type"`
	AmountMinor         int64     `gorm:"column:amount_minor" json:"amount_minor"`
	RunningBalanceMinor int64     `gorm:"column:running_balance_minor" json:"running_balance_minor"`
	ExternalRef         string    `gorm:"column:external_ref" json:"external_ref,omitempty"`
	CounterpartyTxnID   *string   `gorm:"column:counterparty_txn_id" json:"counterparty_txn_id,omitempty"`
	IsReversed          bool      `gorm:"column:is_reversed" json:"is_reversed"`
	ReversedByTxnID     *string   `gorm:"column:reversed_by_txn_id" json:"reversed_by_txn_id,omitempty"`
	Channel             string    `gorm:"column:channel" json:"channel,omitempty"`
	CreatedBy           string    `gorm:"column:created_by" json:"created_by,omitempty"`
	CreatedAt           time.Time `gorm:"column:created_at" json:"created_at"`
}

// TableName нь wallet_txn хүснэгтийг зааж өгнө.
func (WalletTxn) TableName() string { return "wallet_txn" }

// LedgerEntry нь double-entry-ийн нэг мөр. AccountID nil = дотоод GL leg (ж:
// bank_settlement) — хэрэглэгчид харагдахгүй (m22 RLS).
type LedgerEntry struct {
	ID          int64     `gorm:"column:id" json:"id"`
	TxnID       string    `gorm:"column:txn_id" json:"txn_id"`
	GLAccount   string    `gorm:"column:gl_account" json:"gl_account"`
	AccountID   *string   `gorm:"column:account_id" json:"account_id,omitempty"`
	Direction   string    `gorm:"column:direction" json:"direction"`
	AmountMinor int64     `gorm:"column:amount_minor" json:"amount_minor"`
	CreatedAt   time.Time `gorm:"column:created_at" json:"created_at"`
}

// TableName нь ledger_entry хүснэгтийг зааж өгнө.
func (LedgerEntry) TableName() string { return "ledger_entry" }

// AccountHold нь барьцаа (account_hold).
type AccountHold struct {
	ID          string     `gorm:"column:id" json:"id"`
	AccountID   string     `gorm:"column:account_id" json:"account_id"`
	AmountMinor int64      `gorm:"column:amount_minor" json:"amount_minor"`
	Status      string     `gorm:"column:status" json:"status"`
	HoldTxnID   *string    `gorm:"column:hold_txn_id" json:"hold_txn_id,omitempty"`
	ExternalRef string     `gorm:"column:external_ref" json:"external_ref,omitempty"`
	ExpiresAt   *time.Time `gorm:"column:expires_at" json:"expires_at,omitempty"`
	CreatedAt   time.Time  `gorm:"column:created_at" json:"created_at"`
}

// TableName нь account_hold хүснэгтийг зааж өгнө.
func (AccountHold) TableName() string { return "account_hold" }

// FeeRule нь globally тохируулдаг шимтгэл/payment rule (fee_rule). Хувийг
// basis point-ээр (1% = 100 bps) хадгалж integer-safe тооцоо хийнэ.
type FeeRule struct {
	ID            string     `gorm:"column:id" json:"id"`
	Code          string     `gorm:"column:code" json:"code"`
	TxnType       string     `gorm:"column:txn_type" json:"txn_type"`
	OwnerType     *string    `gorm:"column:owner_type" json:"owner_type,omitempty"`
	Channel       *string    `gorm:"column:channel" json:"channel,omitempty"`
	Method        string     `gorm:"column:method" json:"method"`
	FlatMinor     int64      `gorm:"column:flat_minor" json:"flat_minor"`
	PercentBPS    int        `gorm:"column:percent_bps" json:"percent_bps"`
	MinMinor      *int64     `gorm:"column:min_minor" json:"min_minor,omitempty"`
	MaxMinor      *int64     `gorm:"column:max_minor" json:"max_minor,omitempty"`
	GLAccount     string     `gorm:"column:gl_account" json:"gl_account"`
	Priority      int        `gorm:"column:priority" json:"priority"`
	Active        bool       `gorm:"column:active" json:"active"`
	EffectiveFrom time.Time  `gorm:"column:effective_from" json:"effective_from"`
	EffectiveTo   *time.Time `gorm:"column:effective_to" json:"effective_to,omitempty"`
}

// TableName нь fee_rule хүснэгтийг зааж өгнө.
func (FeeRule) TableName() string { return "fee_rule" }

// Compute нь өгөгдсөн дүнд (minor) ногдох шимтгэлийг integer-safe тооцоолно.
// PERCENT: amount * bps / 10000 (floor), дараа нь min/max хязгаар. Шимтгэл
// сөрөг болохгүй. Дугуйруулалт floor (тогтмол) — P5.
func (r FeeRule) Compute(amountMinor int64) int64 {
	var fee int64
	switch r.Method {
	case FeeMethodFlat:
		fee = r.FlatMinor
	case FeeMethodPercent:
		fee = amountMinor * int64(r.PercentBPS) / 10000
	}
	if r.MinMinor != nil && fee < *r.MinMinor {
		fee = *r.MinMinor
	}
	if r.MaxMinor != nil && fee > *r.MaxMinor {
		fee = *r.MaxMinor
	}
	if fee < 0 {
		fee = 0
	}
	return fee
}

// ReconDiscrepancy нь reconciliation шалгалтын илрүүлсэн нэг зөрүү (wallet_
// reconcile()-ийн мөр). Хоосон жагсаалт = ledger эрүүл.
type ReconDiscrepancy struct {
	CheckType     string `gorm:"column:check_type" json:"check_type"`
	Ref           string `gorm:"column:ref" json:"ref"`
	ExpectedMinor int64  `gorm:"column:expected_minor" json:"expected_minor"`
	ActualMinor   int64  `gorm:"column:actual_minor" json:"actual_minor"`
}

// CanTransact нь байгууллагын хэтэвчээс гүйлгээ (withdraw/transfer/hold) хийх
// эрхтэй role эсэхийг буцаана (v1.0 матриц): Эзэмшигч/Захирал/Нягтлан.
func CanTransact(role string) bool {
	return role == RoleOwner || role == RoleCEO || role == RoleAccountant
}

// CanReverse нь reversal хийх эрхтэй role эсэхийг буцаана: Эзэмшигч/Захирал.
func CanReverse(role string) bool {
	return role == RoleOwner || role == RoleCEO
}

// CanView нь байгууллагын хэтэвч/гүйлгээг ХАРАХ эрхтэй role эсэхийг буцаана.
// v1.0 матрицын дагуу (§5) бүх гишүүн (Эзэмшигч/Захирал/Нягтлан/Гишүүн) харна —
// M4: RLS-аас гадна ИЛ role gate (зөвхөн RLS дээр найдахгүй).
func CanView(role string) bool {
	return role == RoleOwner || role == RoleCEO || role == RoleAccountant || role == RoleMember
}
