// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Package wallet нь wallet ledger-ийн use case давхарга — хэтэвч нээх/харах,
// цэнэглэх, зарлага гаргах, гүйлгээний түүх. Owner (person/organization)
// шалгалт, байгууллагын role gate (P8), fee_rule-аар шимтгэл тооцох логикийг
// энд хийж, атомар хадгалалтыг repository-д даатгана.
package wallet

import (
	"context"
	"errors"
	"fmt"

	"eidtemplate/internal/apperror"
	"eidtemplate/internal/business/domain"
	repointerface "eidtemplate/internal/datasources/repositories/interface"
)

// Usecase нь wallet-ийн оролтын хил. Method бүр Request авч Response буцаана.
type Usecase interface {
	// GetOrOpenWallet нь owner-ийн идэвхтэй хэтэвчийг буцаана, байхгүй бол нээнэ.
	GetOrOpenWallet(ctx context.Context, req OwnerRequest) (WalletResponse, error)
	// GetBalance нь owner-ийн хэтэвчний үлдэгдэл/боломжит дүнг буцаана.
	GetBalance(ctx context.Context, req OwnerRequest) (WalletResponse, error)
	// Deposit нь цэнэглэлт (банкны gateway-аар баталгаажсан) бичнэ.
	Deposit(ctx context.Context, req DepositRequest) (TxnResponse, error)
	// Withdraw нь зарлага бичнэ; org бол role gate, шимтгэлийг fee_rule-аар тооцно.
	Withdraw(ctx context.Context, req WithdrawRequest) (TxnResponse, error)
	// ListTransactions нь гүйлгээний түүхийг хуудаслан буцаана.
	ListTransactions(ctx context.Context, req HistoryRequest) (HistoryResponse, error)
	// Transfer нь эх дансаас хүлээн авагчийн account_no руу шилжүүлнэ; org бол
	// role gate (CanTransact), шимтгэлийг fee_rule-аар тооцно.
	Transfer(ctx context.Context, req TransferRequest) (TxnResponse, error)
	// Hold нь дансны мөнгийг түр барьцаална.
	Hold(ctx context.Context, req HoldRequest) (HoldResponse, error)
	// ReleaseHold нь барьцааг суллана.
	ReleaseHold(ctx context.Context, req ReleaseRequest) error
	// SettleHold нь барьцааг бодит зарлага болгож хаана (capture). org бол role
	// gate (CanTransact). withdrawal гүйлгээг буцаана.
	SettleHold(ctx context.Context, req SettleRequest) (TxnResponse, error)
	// Reverse нь гүйлгээг буцаана; org бол role gate (CanReverse: Эзэмшигч/Захирал).
	Reverse(ctx context.Context, req ReverseRequest) (TxnResponse, error)
	// GatewayTopup нь банкны gateway-ээр (HMAC баталгаажсан) цэнэглэлтийг постоно.
	// external_ref-ээр idempotent. Иргэний actor шаардахгүй (server-to-server).
	GatewayTopup(ctx context.Context, req GatewayTopupRequest) (GatewayTopupResponse, error)
	// UpsertProfile нь эзний (иргэн) display/KYC snapshot-ийг бичнэ. Owner =
	// ActorSubject; me.gerege.mn иргэний токеноор push хийнэ.
	UpsertProfile(ctx context.Context, req ProfileRequest) error
}

// ProfileRequest нь эзний display/KYC snapshot-ийн оролт (PUT /wallet/profile).
type ProfileRequest struct {
	ActorSubject string
	FullName     string
	GivenName    string
	FamilyName   string
	NationalID   string
	Phone        string
	Email        string
	KYCVerified  bool
	Source       string
}

// Request / Response төрлүүд. ActorSubject нь нэвтэрсэн иргэний OIDC sub.
// OwnerType нь person|organization; person үед OwnerID = ActorSubject байх ёстой.
type (
	OwnerRequest struct {
		ActorSubject string
		OwnerType    string
		OwnerID      string
	}
	WalletResponse struct {
		Account domain.WalletAccount
	}
	DepositRequest struct {
		ActorSubject   string
		OwnerType      string
		OwnerID        string
		AmountMinor    int64
		ExternalRef    string
		Channel        string
		IdempotencyKey string
	}
	WithdrawRequest struct {
		ActorSubject   string
		OwnerType      string
		OwnerID        string
		AmountMinor    int64
		ExternalRef    string
		Channel        string
		IdempotencyKey string
	}
	TxnResponse struct {
		Txn domain.WalletTxn
	}
	HistoryRequest struct {
		ActorSubject string
		OwnerType    string
		OwnerID      string
		Offset       int
		Limit        int
	}
	HistoryResponse struct {
		Transactions []domain.WalletTxn
	}
)

type usecase struct {
	repo repointerface.WalletRepository
}

// NewUsecase нь wallet use case-ийг repository-оор үүсгэнэ.
func NewUsecase(repo repointerface.WalletRepository) Usecase {
	return &usecase{repo: repo}
}

func (u *usecase) GetOrOpenWallet(ctx context.Context, req OwnerRequest) (WalletResponse, error) {
	if err := validateOwner(req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return WalletResponse{}, err
	}
	if err := u.authorizeView(ctx, req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return WalletResponse{}, mapErr(err, "open wallet: authorize")
	}
	acc, err := u.repo.OpenOrGetAccount(ctx, req.ActorSubject, req.OwnerType, req.OwnerID)
	if err != nil {
		return WalletResponse{}, mapErr(err, "open wallet")
	}
	return WalletResponse{Account: acc}, nil
}

func (u *usecase) GetBalance(ctx context.Context, req OwnerRequest) (WalletResponse, error) {
	if err := validateOwner(req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return WalletResponse{}, err
	}
	if err := u.authorizeView(ctx, req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return WalletResponse{}, mapErr(err, "balance: authorize")
	}
	acc, err := u.repo.GetAccountByOwner(ctx, req.ActorSubject, req.OwnerType, req.OwnerID)
	if err != nil {
		return WalletResponse{}, mapErr(err, "get balance")
	}
	return WalletResponse{Account: acc}, nil
}

func (u *usecase) Deposit(ctx context.Context, req DepositRequest) (TxnResponse, error) {
	if err := validateOwner(req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return TxnResponse{}, err
	}
	if req.AmountMinor <= 0 || req.AmountMinor > domain.MaxAmountMinor {
		return TxnResponse{}, apperror.BadRequest("дүн эерэг байх ёстой")
	}
	acc, err := u.repo.OpenOrGetAccount(ctx, req.ActorSubject, req.OwnerType, req.OwnerID)
	if err != nil {
		return TxnResponse{}, mapErr(err, "deposit: open account")
	}
	txn, err := u.repo.Deposit(ctx, req.ActorSubject, repointerface.WalletDepositInput{
		AccountID: acc.ID, AmountMinor: req.AmountMinor, ExternalRef: req.ExternalRef,
		Channel: req.Channel, IdempotencyKey: req.IdempotencyKey,
	})
	if err != nil {
		return TxnResponse{}, mapErr(err, "deposit")
	}
	return TxnResponse{Txn: txn}, nil
}

func (u *usecase) Withdraw(ctx context.Context, req WithdrawRequest) (TxnResponse, error) {
	if err := validateOwner(req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return TxnResponse{}, err
	}
	if req.AmountMinor <= 0 || req.AmountMinor > domain.MaxAmountMinor {
		return TxnResponse{}, apperror.BadRequest("дүн эерэг байх ёстой")
	}
	if err := u.authorizeTransact(ctx, req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return TxnResponse{}, mapErr(err, "withdraw: authorize")
	}
	acc, err := u.repo.GetAccountByOwner(ctx, req.ActorSubject, req.OwnerType, req.OwnerID)
	if err != nil {
		return TxnResponse{}, mapErr(err, "withdraw: account")
	}
	fee, err := u.computeFee(ctx, domain.TxnWithdrawal, req.OwnerType, req.Channel, req.AmountMinor)
	if err != nil {
		return TxnResponse{}, mapErr(err, "withdraw: fee")
	}
	txn, err := u.repo.Withdraw(ctx, req.ActorSubject, repointerface.WalletWithdrawInput{
		AccountID: acc.ID, AmountMinor: req.AmountMinor, FeeMinor: fee, ExternalRef: req.ExternalRef,
		Channel: req.Channel, IdempotencyKey: req.IdempotencyKey,
	})
	if err != nil {
		return TxnResponse{}, mapErr(err, "withdraw")
	}
	return TxnResponse{Txn: txn}, nil
}

func (u *usecase) ListTransactions(ctx context.Context, req HistoryRequest) (HistoryResponse, error) {
	if err := validateOwner(req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return HistoryResponse{}, err
	}
	if err := u.authorizeView(ctx, req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return HistoryResponse{}, mapErr(err, "history: authorize")
	}
	acc, err := u.repo.GetAccountByOwner(ctx, req.ActorSubject, req.OwnerType, req.OwnerID)
	if err != nil {
		return HistoryResponse{}, mapErr(err, "history: account")
	}
	limit := req.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	txns, err := u.repo.ListTransactions(ctx, req.ActorSubject, acc.ID, req.Offset, limit)
	if err != nil {
		return HistoryResponse{}, mapErr(err, "history")
	}
	return HistoryResponse{Transactions: txns}, nil
}

// computeFee нь тохирох fee_rule-ийг олж шимтгэлийг тооцоолно (олдохгүй бол 0).
func (u *usecase) computeFee(ctx context.Context, txnType, ownerType, channel string, amount int64) (int64, error) {
	rule, err := u.repo.ActiveFeeRule(ctx, txnType, ownerType, channel)
	if err != nil {
		return 0, err
	}
	if rule == nil {
		return 0, nil
	}
	return rule.Compute(amount), nil
}

// authorizeTransact нь байгууллагын хэтэвчээс гүйлгээ хийх role эрхийг шалгана
// (хувь хүний хэтэвчид эзэн өөрөө бүх үйлдлийг хийнэ).
func (u *usecase) authorizeTransact(ctx context.Context, actor, ownerType, ownerID string) error {
	if ownerType != domain.OwnerOrganization {
		return nil
	}
	role, err := u.repo.MembershipRole(ctx, actor, ownerID)
	if err != nil {
		return err
	}
	if !domain.CanTransact(role) {
		return domain.ErrRoleForbidden
	}
	return nil
}

// authorizeView нь байгууллагын хэтэвч/гүйлгээг ХАРАХ role gate (M4) — RLS-аас
// гадна ИЛ шалгалт. Хувь хүний хэтэвчид эзэн өөрөө.
func (u *usecase) authorizeView(ctx context.Context, actor, ownerType, ownerID string) error {
	if ownerType != domain.OwnerOrganization {
		return nil
	}
	role, err := u.repo.MembershipRole(ctx, actor, ownerID)
	if err != nil {
		return err
	}
	if !domain.CanView(role) {
		return domain.ErrRoleForbidden
	}
	return nil
}

// validateOwner нь owner төрөл/id-ийн зөв байдлыг шалгана: person үед эзэн
// зөвхөн өөрийн хэтэвчид (OwnerID = ActorSubject), org үед id шаардлагатай.
func validateOwner(actor, ownerType, ownerID string) error {
	switch ownerType {
	case domain.OwnerPerson:
		if ownerID != actor {
			return apperror.Forbidden("зөвхөн өөрийн хэтэвчид хандах боломжтой")
		}
	case domain.OwnerOrganization:
		if ownerID == "" {
			return apperror.BadRequest("байгууллагын id шаардлагатай")
		}
	default:
		return apperror.BadRequest("owner төрөл буруу")
	}
	return nil
}

// mapErr нь domain sentinel алдааг apperror төрөл рүү буулгана; бусдыг дотоод
// алдаа болгон боож (cause-ийг логдох зорилгоор хадгална).
func mapErr(err error, op string) error {
	if err == nil {
		return nil
	}
	switch {
	case errors.Is(err, domain.ErrInvalidAmount):
		return apperror.BadRequest("дүн буруу байна")
	case errors.Is(err, domain.ErrInsufficientFunds):
		return apperror.BadRequest("үлдэгдэл хүрэлцэхгүй байна")
	case errors.Is(err, domain.ErrAccountNotActive):
		return apperror.Conflict("хэтэвч идэвхгүй байна")
	case errors.Is(err, domain.ErrWalletNotFound):
		return apperror.NotFound("хэтэвч олдсонгүй")
	case errors.Is(err, domain.ErrOrgNotFound):
		return apperror.Forbidden("байгууллагын гишүүн биш")
	case errors.Is(err, domain.ErrRoleForbidden):
		return apperror.Forbidden("энэ үйлдэлд эрх хүрэлцэхгүй")
	case errors.Is(err, domain.ErrSameAccountTransfer):
		return apperror.BadRequest("ижил данс руу шилжүүлэх боломжгүй")
	case errors.Is(err, domain.ErrMissingExternalRef):
		return apperror.BadRequest("гүйлгээний reference шаардлагатай")
	case errors.Is(err, domain.ErrIdempotencyMismatch):
		return apperror.Conflict("ижил idempotency key өөр хүсэлттэй давтагдсан")
	}
	var de *apperror.DomainError
	if errors.As(err, &de) {
		return de
	}
	return apperror.InternalCause(fmt.Errorf("%s: %w", op, err))
}
