// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package domain_test

import (
	"testing"

	"eidtemplate/internal/business/domain"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func i64(v int64) *int64 { return &v }

func TestFeeRuleCompute(t *testing.T) {
	tests := []struct {
		name string
		rule domain.FeeRule
		amt  int64
		want int64
	}{
		{"flat", domain.FeeRule{Method: domain.FeeMethodFlat, FlatMinor: 500}, 10000, 500},
		{"percent 1% (100bps)", domain.FeeRule{Method: domain.FeeMethodPercent, PercentBPS: 100}, 10000, 100},
		{"percent floor rounding", domain.FeeRule{Method: domain.FeeMethodPercent, PercentBPS: 100}, 199, 1}, // 199*100/10000=1.99→1
		{"percent below min → min", domain.FeeRule{Method: domain.FeeMethodPercent, PercentBPS: 100, MinMinor: i64(300)}, 10000, 300},
		{"percent above max → max", domain.FeeRule{Method: domain.FeeMethodPercent, PercentBPS: 1000, MaxMinor: i64(500)}, 10000, 500},
		{"flat negative guarded to 0", domain.FeeRule{Method: domain.FeeMethodFlat, FlatMinor: -100}, 10000, 0},
		{"zero amount percent", domain.FeeRule{Method: domain.FeeMethodPercent, PercentBPS: 100}, 0, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, tt.rule.Compute(tt.amt))
		})
	}
}

func TestWalletAccountHelpers(t *testing.T) {
	a := domain.WalletAccount{Status: domain.WalletActive, BalanceMinor: 1000, HoldMinor: 300}
	assert.Equal(t, int64(700), a.Available())
	assert.True(t, a.IsActive())
	assert.False(t, domain.WalletAccount{Status: domain.WalletFrozen}.IsActive())
}

func TestRoleMatrix(t *testing.T) {
	tests := []struct {
		role        string
		canTransact bool
		canReverse  bool
	}{
		{domain.RoleOwner, true, true},
		{domain.RoleCEO, true, true},
		{domain.RoleAccountant, true, false},
		{domain.RoleMember, false, false},
		{"unknown", false, false},
	}
	for _, tt := range tests {
		t.Run(tt.role, func(t *testing.T) {
			assert.Equal(t, tt.canTransact, domain.CanTransact(tt.role))
			assert.Equal(t, tt.canReverse, domain.CanReverse(tt.role))
		})
	}
}

func TestPostingsAreBalanced(t *testing.T) {
	dep, err := domain.DepositPosting("A", 1000)
	require.NoError(t, err)
	assert.True(t, dep.Balanced())
	assert.Equal(t, int64(1000), dep.NetForAccount("A")) // орлого +

	wd, err := domain.WithdrawalPosting("A", 400)
	require.NoError(t, err)
	assert.True(t, wd.Balanced())
	assert.Equal(t, int64(-400), wd.NetForAccount("A")) // зарлага −

	fee, err := domain.FeePosting("A", "", 50)
	require.NoError(t, err)
	assert.True(t, fee.Balanced())
	assert.Equal(t, domain.GLFeeIncome, fee[1].GLAccount) // default GL
	assert.Equal(t, int64(-50), fee.NetForAccount("A"))

	tr, err := domain.TransferPosting("A", "B", 700)
	require.NoError(t, err)
	assert.True(t, tr.Balanced())
	assert.Len(t, tr, 4)
	assert.Equal(t, int64(-700), tr.NetForAccount("A"))
	assert.Equal(t, int64(700), tr.NetForAccount("B"))
}

func TestPostingErrors(t *testing.T) {
	_, err := domain.DepositPosting("A", 0)
	assert.ErrorIs(t, err, domain.ErrInvalidAmount)
	_, err = domain.WithdrawalPosting("A", -5)
	assert.ErrorIs(t, err, domain.ErrInvalidAmount)
	_, err = domain.FeePosting("A", "", 0)
	assert.ErrorIs(t, err, domain.ErrInvalidAmount)
	_, err = domain.TransferPosting("A", "A", 100)
	assert.ErrorIs(t, err, domain.ErrSameAccountTransfer)
}

func TestEnsureWithdrawable(t *testing.T) {
	active := func(bal, hold int64) domain.WalletAccount {
		return domain.WalletAccount{Status: domain.WalletActive, BalanceMinor: bal, HoldMinor: hold}
	}
	tests := []struct {
		name        string
		acc         domain.WalletAccount
		amount, fee int64
		wantErr     error
	}{
		{"ok", active(1000, 0), 900, 50, nil},
		{"exact available", active(1000, 0), 950, 50, nil},
		{"insufficient with fee", active(1000, 0), 960, 50, domain.ErrInsufficientFunds},
		{"hold reduces available", active(1000, 800), 250, 0, domain.ErrInsufficientFunds},
		{"not active", domain.WalletAccount{Status: domain.WalletFrozen, BalanceMinor: 1000}, 100, 0, domain.ErrAccountNotActive},
		{"invalid amount", active(1000, 0), 0, 0, domain.ErrInvalidAmount},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := domain.EnsureWithdrawable(tt.acc, tt.amount, tt.fee)
			if tt.wantErr == nil {
				assert.NoError(t, err)
				return
			}
			assert.ErrorIs(t, err, tt.wantErr)
		})
	}
}
