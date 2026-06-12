// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package wallet_test

import (
	"context"
	"testing"

	"eidtemplate/internal/apperror"
	"eidtemplate/internal/business/domain"
	"eidtemplate/internal/business/usecases/wallet"
	repointerface "eidtemplate/internal/datasources/repositories/interface"
	"eidtemplate/internal/test/mocks"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestTransferPersonHappyPath(t *testing.T) {
	m := &mocks.WalletRepository{}
	m.On("GetAccountByOwner", mock.Anything, actor, domain.OwnerPerson, actor).Return(activeAcc(), nil)
	m.On("ActiveFeeRule", mock.Anything, domain.TxnTransferOut, domain.OwnerPerson, "portal").Return(nil, nil)
	m.On("Transfer", mock.Anything, actor, repointerface.WalletTransferInput{
		FromAccountID: "acc1", ToAccountNo: "GWABC", AmountMinor: 2000, Channel: "portal",
	}).Return(domain.WalletTxn{ID: "tr1", Type: domain.TxnTransferOut}, nil)

	uc := wallet.NewUsecase(m)
	res, err := uc.Transfer(context.Background(), wallet.TransferRequest{
		ActorSubject: actor, OwnerType: domain.OwnerPerson, OwnerID: actor,
		ToAccountNo: "GWABC", AmountMinor: 2000, Channel: "portal",
	})
	require.NoError(t, err)
	assert.Equal(t, "tr1", res.Txn.ID)
	m.AssertExpectations(t)
}

func TestTransferOrgRoleGate(t *testing.T) {
	m := &mocks.WalletRepository{}
	m.On("MembershipRole", mock.Anything, actor, "ORG1").Return(domain.RoleMember, nil)

	uc := wallet.NewUsecase(m)
	_, err := uc.Transfer(context.Background(), wallet.TransferRequest{
		ActorSubject: actor, OwnerType: domain.OwnerOrganization, OwnerID: "ORG1",
		ToAccountNo: "GWABC", AmountMinor: 100,
	})
	assert.True(t, apperror.IsType(err, apperror.ErrTypeForbidden))
	m.AssertNotCalled(t, "Transfer", mock.Anything, mock.Anything, mock.Anything)
}

func TestReverseOrgRoleGate(t *testing.T) {
	// Нягтлан reversal хийж чадахгүй (CanReverse=false)
	m := &mocks.WalletRepository{}
	m.On("MembershipRole", mock.Anything, actor, "ORG1").Return(domain.RoleAccountant, nil)

	uc := wallet.NewUsecase(m)
	_, err := uc.Reverse(context.Background(), wallet.ReverseRequest{
		ActorSubject: actor, OwnerType: domain.OwnerOrganization, OwnerID: "ORG1", TxnID: "t1",
	})
	assert.True(t, apperror.IsType(err, apperror.ErrTypeForbidden))
	m.AssertNotCalled(t, "Reverse", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
}

func TestReverseOrgAllowed(t *testing.T) {
	orgAcc := domain.WalletAccount{ID: "oacc", OwnerType: domain.OwnerOrganization, OwnerID: "ORG1", Status: domain.WalletActive}
	m := &mocks.WalletRepository{}
	m.On("MembershipRole", mock.Anything, actor, "ORG1").Return(domain.RoleOwner, nil)
	m.On("GetAccountByOwner", mock.Anything, actor, domain.OwnerOrganization, "ORG1").Return(orgAcc, nil)
	m.On("Reverse", mock.Anything, actor, "oacc", "t9").Return(domain.WalletTxn{ID: "rev1", Type: domain.TxnReversal}, nil)

	uc := wallet.NewUsecase(m)
	res, err := uc.Reverse(context.Background(), wallet.ReverseRequest{
		ActorSubject: actor, OwnerType: domain.OwnerOrganization, OwnerID: "ORG1", TxnID: "t9",
	})
	require.NoError(t, err)
	assert.Equal(t, "rev1", res.Txn.ID)
	m.AssertExpectations(t)
}

func TestSettleHold(t *testing.T) {
	m := &mocks.WalletRepository{}
	cap := int64(2000)
	m.On("GetAccountByOwner", mock.Anything, actor, domain.OwnerPerson, actor).Return(activeAcc(), nil)
	m.On("SettleHold", mock.Anything, actor, "acc1", "h7", mock.AnythingOfType("*int64")).
		Return(domain.WalletTxn{ID: "wd1", Type: domain.TxnWithdrawal, AmountMinor: 2000}, nil)

	uc := wallet.NewUsecase(m)
	res, err := uc.SettleHold(context.Background(), wallet.SettleRequest{
		ActorSubject: actor, OwnerType: domain.OwnerPerson, OwnerID: actor, HoldID: "h7", CaptureMinor: &cap,
	})
	require.NoError(t, err)
	assert.Equal(t, "wd1", res.Txn.ID)
	m.AssertExpectations(t)
}

func TestSettleHoldOrgRoleGate(t *testing.T) {
	m := &mocks.WalletRepository{}
	m.On("MembershipRole", mock.Anything, actor, "ORG1").Return(domain.RoleMember, nil)

	uc := wallet.NewUsecase(m)
	_, err := uc.SettleHold(context.Background(), wallet.SettleRequest{
		ActorSubject: actor, OwnerType: domain.OwnerOrganization, OwnerID: "ORG1", HoldID: "h1",
	})
	assert.True(t, apperror.IsType(err, apperror.ErrTypeForbidden))
	m.AssertNotCalled(t, "SettleHold", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
}

func TestGatewayTopup(t *testing.T) {
	m := &mocks.WalletRepository{}
	m.On("GatewayDeposit", mock.Anything, repointerface.WalletGatewayDepositInput{
		AccountNo: "GW123", AmountMinor: 50000, ExternalRef: "bankref9", Channel: "bank_gateway",
	}).Return("txn-gw", nil)

	uc := wallet.NewUsecase(m)
	res, err := uc.GatewayTopup(context.Background(), wallet.GatewayTopupRequest{
		AccountNo: "GW123", AmountMinor: 50000, ExternalRef: "bankref9",
	})
	require.NoError(t, err)
	assert.Equal(t, "txn-gw", res.TxnID)
	m.AssertExpectations(t)
}

func TestGatewayTopupValidation(t *testing.T) {
	uc := wallet.NewUsecase(&mocks.WalletRepository{})
	cases := []wallet.GatewayTopupRequest{
		{AccountNo: "GW1", AmountMinor: 0, ExternalRef: "r"},  // amount
		{AccountNo: "", AmountMinor: 100, ExternalRef: "r"},   // account_no
		{AccountNo: "GW1", AmountMinor: 100, ExternalRef: ""}, // ref
	}
	for _, req := range cases {
		_, err := uc.GatewayTopup(context.Background(), req)
		assert.True(t, apperror.IsType(err, apperror.ErrTypeBadRequest), "%+v", req)
	}
}

func TestHoldHappyPath(t *testing.T) {
	m := &mocks.WalletRepository{}
	m.On("GetAccountByOwner", mock.Anything, actor, domain.OwnerPerson, actor).Return(activeAcc(), nil)
	m.On("Hold", mock.Anything, actor, repointerface.WalletHoldInput{
		AccountID: "acc1", AmountMinor: 3000,
	}).Return(domain.AccountHold{ID: "h1", AmountMinor: 3000, Status: "active"}, nil)

	uc := wallet.NewUsecase(m)
	res, err := uc.Hold(context.Background(), wallet.HoldRequest{
		ActorSubject: actor, OwnerType: domain.OwnerPerson, OwnerID: actor, AmountMinor: 3000,
	})
	require.NoError(t, err)
	assert.Equal(t, "h1", res.Hold.ID)
	m.AssertExpectations(t)
}
