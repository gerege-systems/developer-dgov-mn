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

const actor = "AA0000001"

func activeAcc() domain.WalletAccount {
	return domain.WalletAccount{ID: "acc1", OwnerType: domain.OwnerPerson, OwnerID: actor, Status: domain.WalletActive, BalanceMinor: 50000}
}

func TestDepositPersonHappyPath(t *testing.T) {
	m := &mocks.WalletRepository{}
	m.On("OpenOrGetAccount", mock.Anything, actor, domain.OwnerPerson, actor).Return(activeAcc(), nil)
	m.On("Deposit", mock.Anything, actor, repointerface.WalletDepositInput{
		AccountID: "acc1", AmountMinor: 5000, ExternalRef: "ref1", Channel: "bank_gateway", IdempotencyKey: "idem1",
	}).Return(domain.WalletTxn{ID: "t1", Type: domain.TxnDeposit, AmountMinor: 5000, RunningBalanceMinor: 55000}, nil)

	uc := wallet.NewUsecase(m)
	res, err := uc.Deposit(context.Background(), wallet.DepositRequest{
		ActorSubject: actor, OwnerType: domain.OwnerPerson, OwnerID: actor,
		AmountMinor: 5000, ExternalRef: "ref1", Channel: "bank_gateway", IdempotencyKey: "idem1",
	})
	require.NoError(t, err)
	assert.Equal(t, int64(55000), res.Txn.RunningBalanceMinor)
	m.AssertExpectations(t)
}

func TestDepositValidation(t *testing.T) {
	uc := wallet.NewUsecase(&mocks.WalletRepository{})

	_, err := uc.Deposit(context.Background(), wallet.DepositRequest{
		ActorSubject: actor, OwnerType: domain.OwnerPerson, OwnerID: actor, AmountMinor: 0,
	})
	assert.True(t, apperror.IsType(err, apperror.ErrTypeBadRequest), "zero amount → BadRequest")

	_, err = uc.Deposit(context.Background(), wallet.DepositRequest{
		ActorSubject: actor, OwnerType: domain.OwnerPerson, OwnerID: "BB0000002", AmountMinor: 100,
	})
	assert.True(t, apperror.IsType(err, apperror.ErrTypeForbidden), "other's person wallet → Forbidden")
}

func TestWithdrawPersonWithFee(t *testing.T) {
	m := &mocks.WalletRepository{}
	m.On("GetAccountByOwner", mock.Anything, actor, domain.OwnerPerson, actor).Return(activeAcc(), nil)
	// 1% (100bps) of 10000 = 100
	rule := &domain.FeeRule{Method: domain.FeeMethodPercent, PercentBPS: 100}
	m.On("ActiveFeeRule", mock.Anything, domain.TxnWithdrawal, domain.OwnerPerson, "portal").Return(rule, nil)
	m.On("Withdraw", mock.Anything, actor, repointerface.WalletWithdrawInput{
		AccountID: "acc1", AmountMinor: 10000, FeeMinor: 100, Channel: "portal",
	}).Return(domain.WalletTxn{ID: "t2", Type: domain.TxnWithdrawal, AmountMinor: 10000}, nil)

	uc := wallet.NewUsecase(m)
	res, err := uc.Withdraw(context.Background(), wallet.WithdrawRequest{
		ActorSubject: actor, OwnerType: domain.OwnerPerson, OwnerID: actor, AmountMinor: 10000, Channel: "portal",
	})
	require.NoError(t, err)
	assert.Equal(t, "t2", res.Txn.ID)
	m.AssertExpectations(t)
}

func TestWithdrawOrgRoleGate(t *testing.T) {
	// Гишүүн → татгалзана; repo.Withdraw огт дуудагдахгүй
	m := &mocks.WalletRepository{}
	m.On("MembershipRole", mock.Anything, actor, "ORG1").Return(domain.RoleMember, nil)

	uc := wallet.NewUsecase(m)
	_, err := uc.Withdraw(context.Background(), wallet.WithdrawRequest{
		ActorSubject: actor, OwnerType: domain.OwnerOrganization, OwnerID: "ORG1", AmountMinor: 100,
	})
	assert.True(t, apperror.IsType(err, apperror.ErrTypeForbidden))
	m.AssertNotCalled(t, "Withdraw", mock.Anything, mock.Anything, mock.Anything)
	m.AssertExpectations(t)
}

func TestWithdrawOrgAllowedRole(t *testing.T) {
	orgAcc := domain.WalletAccount{ID: "oacc", OwnerType: domain.OwnerOrganization, OwnerID: "ORG1", Status: domain.WalletActive, BalanceMinor: 9000}
	m := &mocks.WalletRepository{}
	m.On("MembershipRole", mock.Anything, actor, "ORG1").Return(domain.RoleCEO, nil)
	m.On("GetAccountByOwner", mock.Anything, actor, domain.OwnerOrganization, "ORG1").Return(orgAcc, nil)
	m.On("ActiveFeeRule", mock.Anything, domain.TxnWithdrawal, domain.OwnerOrganization, "").Return(nil, nil)
	m.On("Withdraw", mock.Anything, actor, repointerface.WalletWithdrawInput{
		AccountID: "oacc", AmountMinor: 2000, FeeMinor: 0,
	}).Return(domain.WalletTxn{ID: "t3"}, nil)

	uc := wallet.NewUsecase(m)
	res, err := uc.Withdraw(context.Background(), wallet.WithdrawRequest{
		ActorSubject: actor, OwnerType: domain.OwnerOrganization, OwnerID: "ORG1", AmountMinor: 2000,
	})
	require.NoError(t, err)
	assert.Equal(t, "t3", res.Txn.ID)
	m.AssertExpectations(t)
}

func TestWithdrawInsufficientMapped(t *testing.T) {
	m := &mocks.WalletRepository{}
	m.On("GetAccountByOwner", mock.Anything, actor, domain.OwnerPerson, actor).Return(activeAcc(), nil)
	m.On("ActiveFeeRule", mock.Anything, domain.TxnWithdrawal, domain.OwnerPerson, "").Return(nil, nil)
	m.On("Withdraw", mock.Anything, actor, mock.Anything).Return(domain.WalletTxn{}, domain.ErrInsufficientFunds)

	uc := wallet.NewUsecase(m)
	_, err := uc.Withdraw(context.Background(), wallet.WithdrawRequest{
		ActorSubject: actor, OwnerType: domain.OwnerPerson, OwnerID: actor, AmountMinor: 999999,
	})
	assert.True(t, apperror.IsType(err, apperror.ErrTypeBadRequest))
	m.AssertExpectations(t)
}

func TestGetBalanceNotFound(t *testing.T) {
	m := &mocks.WalletRepository{}
	m.On("GetAccountByOwner", mock.Anything, actor, domain.OwnerPerson, actor).Return(domain.WalletAccount{}, domain.ErrWalletNotFound)

	uc := wallet.NewUsecase(m)
	_, err := uc.GetBalance(context.Background(), wallet.OwnerRequest{
		ActorSubject: actor, OwnerType: domain.OwnerPerson, OwnerID: actor,
	})
	assert.True(t, apperror.IsType(err, apperror.ErrTypeNotFound))
	m.AssertExpectations(t)
}
