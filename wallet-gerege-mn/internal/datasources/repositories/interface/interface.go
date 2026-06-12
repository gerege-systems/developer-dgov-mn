// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Package _interface нь wallet ledger-ийн хадгалалтын gateway хийсвэрлэлийг
// агуулна (wallet.gerege.mn service-д auth-аас салгаж авсан wallet-only хувилбар).
// Package-ийн нэр "_interface" — "interface" нь Go-гийн нөөц үг.
package _interface

import (
	"context"
	"time"

	"eidtemplate/internal/business/domain"
)

// WalletDepositInput нь цэнэглэлтийн (deposit) параметрүүд. IdempotencyKey
// хоосон бус бол давхар цэнэглэлтээс хамгаална (idempotency_keys-ээр replay).
type WalletDepositInput struct {
	AccountID      string
	AmountMinor    int64
	ExternalRef    string // банкны gateway reference
	Channel        string // 'bank_gateway' г.м.
	IdempotencyKey string
}

// WalletWithdrawInput нь зарлагын (withdrawal) параметрүүд. FeeMinor > 0 бол
// тусдаа 'fee' гүйлгээ нэг DB transaction дотор нэмэгдэнэ (FeeGLAccount руу).
type WalletWithdrawInput struct {
	AccountID      string
	AmountMinor    int64
	FeeMinor       int64
	FeeGLAccount   string // хоосон бол fee_income
	ExternalRef    string
	Channel        string
	IdempotencyKey string
}

// WalletRepository нь wallet ledger-ийн хадгалалтын gateway. Бичих метод бүр нэг
// DB transaction дотор withSubject (RLS) + FOR UPDATE + double-entry постингоор
// атомар. Sentinel: domain.ErrInsufficientFunds, domain.ErrWalletNotFound г.м.
type WalletRepository interface {
	OpenOrGetAccount(ctx context.Context, actorSubject, ownerType, ownerID string) (domain.WalletAccount, error)
	GetAccountByOwner(ctx context.Context, actorSubject, ownerType, ownerID string) (domain.WalletAccount, error)
	Deposit(ctx context.Context, actorSubject string, in WalletDepositInput) (domain.WalletTxn, error)
	Withdraw(ctx context.Context, actorSubject string, in WalletWithdrawInput) (domain.WalletTxn, error)
	ListTransactions(ctx context.Context, actorSubject, accountID string, offset, limit int) ([]domain.WalletTxn, error)
	ActiveFeeRule(ctx context.Context, txnType, ownerType, channel string) (*domain.FeeRule, error)
	MembershipRole(ctx context.Context, subject, orgID string) (string, error)
	Transfer(ctx context.Context, actorSubject string, in WalletTransferInput) (domain.WalletTxn, error)
	Hold(ctx context.Context, actorSubject string, in WalletHoldInput) (domain.AccountHold, error)
	ReleaseHold(ctx context.Context, actorSubject, accountID, holdID string) error
	SettleHold(ctx context.Context, actorSubject, accountID, holdID string, captureMinor *int64) (domain.WalletTxn, error)
	Reverse(ctx context.Context, actorSubject, accountID, txnID string) (domain.WalletTxn, error)
	GatewayDeposit(ctx context.Context, in WalletGatewayDepositInput) (string, error)
	// UpsertOwnerProfile нь эзний (иргэн) display/KYC snapshot-ийг бичнэ
	// (owner_id = subject, RLS-ээр өөрийн профайл л).
	UpsertOwnerProfile(ctx context.Context, subject string, p domain.WalletOwnerProfile) error
}

// WalletGatewayDepositInput нь банкны gateway top-up-ийн параметрүүд.
type WalletGatewayDepositInput struct {
	AccountNo   string
	AmountMinor int64
	ExternalRef string // банкны гүйлгээний reference (idempotency key)
	Channel     string
}

// WalletTransferInput нь P2P шилжүүлгийн параметрүүд. ToAccountNo нь хүлээн
// авагчийн хэтэвчний дугаар.
type WalletTransferInput struct {
	FromAccountID  string
	ToAccountNo    string
	AmountMinor    int64
	FeeMinor       int64
	Channel        string
	ExternalRef    string
	IdempotencyKey string
}

// WalletHoldInput нь барьцааны параметрүүд.
type WalletHoldInput struct {
	AccountID   string
	AmountMinor int64
	ExternalRef string
	ExpiresAt   *time.Time
}
