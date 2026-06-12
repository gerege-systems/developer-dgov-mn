// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package wallet

import (
	"context"
	"time"

	"eidtemplate/internal/apperror"
	"eidtemplate/internal/business/domain"
	repointerface "eidtemplate/internal/datasources/repositories/interface"
)

// Transfer / Hold / Release / Reverse-ийн Request / Response төрлүүд.
type (
	TransferRequest struct {
		ActorSubject   string
		OwnerType      string
		OwnerID        string
		ToAccountNo    string
		AmountMinor    int64
		Channel        string
		ExternalRef    string
		IdempotencyKey string
	}
	HoldRequest struct {
		ActorSubject string
		OwnerType    string
		OwnerID      string
		AmountMinor  int64
		ExternalRef  string
		ExpiresAt    *time.Time
	}
	HoldResponse struct {
		Hold domain.AccountHold
	}
	ReleaseRequest struct {
		ActorSubject string
		OwnerType    string
		OwnerID      string
		HoldID       string
	}
	SettleRequest struct {
		ActorSubject string
		OwnerType    string
		OwnerID      string
		HoldID       string
		CaptureMinor *int64 // nil = бүтэн capture; 0 = зөвхөн release
	}
	ReverseRequest struct {
		ActorSubject string
		OwnerType    string
		OwnerID      string
		TxnID        string
	}
	GatewayTopupRequest struct {
		AccountNo   string
		AmountMinor int64
		ExternalRef string
		Channel     string
	}
	GatewayTopupResponse struct {
		TxnID string
	}
)

func (u *usecase) Transfer(ctx context.Context, req TransferRequest) (TxnResponse, error) {
	if err := validateOwner(req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return TxnResponse{}, err
	}
	if req.AmountMinor <= 0 || req.AmountMinor > domain.MaxAmountMinor {
		return TxnResponse{}, apperror.BadRequest("дүн эерэг байх ёстой")
	}
	if req.ToAccountNo == "" {
		return TxnResponse{}, apperror.BadRequest("хүлээн авагчийн дансны дугаар шаардлагатай")
	}
	if err := u.authorizeTransact(ctx, req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return TxnResponse{}, mapErr(err, "transfer: authorize")
	}
	acc, err := u.repo.GetAccountByOwner(ctx, req.ActorSubject, req.OwnerType, req.OwnerID)
	if err != nil {
		return TxnResponse{}, mapErr(err, "transfer: account")
	}
	fee, err := u.computeFee(ctx, domain.TxnTransferOut, req.OwnerType, req.Channel, req.AmountMinor)
	if err != nil {
		return TxnResponse{}, mapErr(err, "transfer: fee")
	}
	txn, err := u.repo.Transfer(ctx, req.ActorSubject, repointerface.WalletTransferInput{
		FromAccountID: acc.ID, ToAccountNo: req.ToAccountNo, AmountMinor: req.AmountMinor, FeeMinor: fee,
		Channel: req.Channel, ExternalRef: req.ExternalRef, IdempotencyKey: req.IdempotencyKey,
	})
	if err != nil {
		return TxnResponse{}, mapErr(err, "transfer")
	}
	return TxnResponse{Txn: txn}, nil
}

func (u *usecase) Hold(ctx context.Context, req HoldRequest) (HoldResponse, error) {
	if err := validateOwner(req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return HoldResponse{}, err
	}
	if req.AmountMinor <= 0 || req.AmountMinor > domain.MaxAmountMinor {
		return HoldResponse{}, apperror.BadRequest("дүн эерэг байх ёстой")
	}
	if err := u.authorizeTransact(ctx, req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return HoldResponse{}, mapErr(err, "hold: authorize")
	}
	acc, err := u.repo.GetAccountByOwner(ctx, req.ActorSubject, req.OwnerType, req.OwnerID)
	if err != nil {
		return HoldResponse{}, mapErr(err, "hold: account")
	}
	hold, err := u.repo.Hold(ctx, req.ActorSubject, repointerface.WalletHoldInput{
		AccountID: acc.ID, AmountMinor: req.AmountMinor, ExternalRef: req.ExternalRef, ExpiresAt: req.ExpiresAt,
	})
	if err != nil {
		return HoldResponse{}, mapErr(err, "hold")
	}
	return HoldResponse{Hold: hold}, nil
}

func (u *usecase) ReleaseHold(ctx context.Context, req ReleaseRequest) error {
	if err := validateOwner(req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return err
	}
	if err := u.authorizeTransact(ctx, req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return mapErr(err, "release: authorize")
	}
	acc, err := u.repo.GetAccountByOwner(ctx, req.ActorSubject, req.OwnerType, req.OwnerID)
	if err != nil {
		return mapErr(err, "release: account")
	}
	if err := u.repo.ReleaseHold(ctx, req.ActorSubject, acc.ID, req.HoldID); err != nil {
		return mapErr(err, "release")
	}
	return nil
}

func (u *usecase) SettleHold(ctx context.Context, req SettleRequest) (TxnResponse, error) {
	if err := validateOwner(req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return TxnResponse{}, err
	}
	if req.CaptureMinor != nil && *req.CaptureMinor < 0 {
		return TxnResponse{}, apperror.BadRequest("дүн сөрөг байж болохгүй")
	}
	if err := u.authorizeTransact(ctx, req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return TxnResponse{}, mapErr(err, "settle: authorize")
	}
	acc, err := u.repo.GetAccountByOwner(ctx, req.ActorSubject, req.OwnerType, req.OwnerID)
	if err != nil {
		return TxnResponse{}, mapErr(err, "settle: account")
	}
	txn, err := u.repo.SettleHold(ctx, req.ActorSubject, acc.ID, req.HoldID, req.CaptureMinor)
	if err != nil {
		return TxnResponse{}, mapErr(err, "settle")
	}
	return TxnResponse{Txn: txn}, nil
}

func (u *usecase) Reverse(ctx context.Context, req ReverseRequest) (TxnResponse, error) {
	if err := validateOwner(req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return TxnResponse{}, err
	}
	if err := u.authorizeReverse(ctx, req.ActorSubject, req.OwnerType, req.OwnerID); err != nil {
		return TxnResponse{}, mapErr(err, "reverse: authorize")
	}
	acc, err := u.repo.GetAccountByOwner(ctx, req.ActorSubject, req.OwnerType, req.OwnerID)
	if err != nil {
		return TxnResponse{}, mapErr(err, "reverse: account")
	}
	txn, err := u.repo.Reverse(ctx, req.ActorSubject, acc.ID, req.TxnID)
	if err != nil {
		return TxnResponse{}, mapErr(err, "reverse")
	}
	return TxnResponse{Txn: txn}, nil
}

// GatewayTopup нь банкны gateway-ээр баталгаажсан (HMAC нь HTTP давхаргад
// шалгагдсан) цэнэглэлтийг постоно. external_ref-ээр idempotent.
func (u *usecase) GatewayTopup(ctx context.Context, req GatewayTopupRequest) (GatewayTopupResponse, error) {
	if req.AmountMinor <= 0 || req.AmountMinor > domain.MaxAmountMinor {
		return GatewayTopupResponse{}, apperror.BadRequest("дүн эерэг байх ёстой")
	}
	if req.AccountNo == "" {
		return GatewayTopupResponse{}, apperror.BadRequest("дансны дугаар шаардлагатай")
	}
	if req.ExternalRef == "" {
		return GatewayTopupResponse{}, apperror.BadRequest("гүйлгээний reference шаардлагатай")
	}
	channel := req.Channel
	if channel == "" {
		channel = "bank_gateway"
	}
	txnID, err := u.repo.GatewayDeposit(ctx, repointerface.WalletGatewayDepositInput{
		AccountNo: req.AccountNo, AmountMinor: req.AmountMinor, ExternalRef: req.ExternalRef, Channel: channel,
	})
	if err != nil {
		return GatewayTopupResponse{}, mapErr(err, "gateway topup")
	}
	return GatewayTopupResponse{TxnID: txnID}, nil
}

// authorizeReverse нь байгууллагын хэтэвчид reversal хийх role эрхийг шалгана
// (CanReverse: Эзэмшигч/Захирал). Хувь хүний хэтэвчид эзэн өөрөө хийнэ.
func (u *usecase) authorizeReverse(ctx context.Context, actor, ownerType, ownerID string) error {
	if ownerType != domain.OwnerOrganization {
		return nil
	}
	role, err := u.repo.MembershipRole(ctx, actor, ownerID)
	if err != nil {
		return err
	}
	if !domain.CanReverse(role) {
		return domain.ErrRoleForbidden
	}
	return nil
}
