// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package domain_test

import (
	"fmt"
	"testing"

	"eidtemplate/internal/business/domain"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateAccountNo(t *testing.T) {
	tests := []struct {
		name      string
		ownerType string
		seq       int64
		wantType  byte
		wantErr   bool
	}{
		{"person seq 1", domain.OwnerPerson, 1, '1', false},
		{"org seq 1", domain.OwnerOrganization, 1, '2', false},
		{"person seq 42", domain.OwnerPerson, 42, '1', false},
		{"max seq", domain.OwnerPerson, 9_999_999_999, '1', false},
		{"unknown owner", "merchant", 1, 0, true},
		{"seq out of range", domain.OwnerPerson, 1e10, 0, true},
		{"negative seq", domain.OwnerPerson, -1, 0, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := domain.GenerateAccountNo(tt.ownerType, tt.seq)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Len(t, got, 12)
			assert.Equal(t, tt.wantType, got[0], "type prefix")
			assert.Equal(t, fmt.Sprintf("%010d", tt.seq), got[1:11], "sequence segment")
			assert.True(t, luhnValid(got), "Luhn check digit must validate")

			// Детерминист — ижил оролт ижил гаралт.
			again, _ := domain.GenerateAccountNo(tt.ownerType, tt.seq)
			assert.Equal(t, got, again)
		})
	}
}

func TestIBAN(t *testing.T) {
	personAcc, err := domain.GenerateAccountNo(domain.OwnerPerson, 42)
	require.NoError(t, err)

	t.Run("valid produces a 20-char MOD-97-valid IBAN", func(t *testing.T) {
		got := domain.IBAN("MN", "0050", personAcc)
		require.Len(t, got, 20)
		assert.Equal(t, "MN", got[:2])
		assert.Equal(t, "0050"+personAcc, got[4:], "bankCode + account_no preserved")
		assert.True(t, ibanValid(got), "computed IBAN must pass MOD-97")
	})

	t.Run("lowercase country is normalised", func(t *testing.T) {
		assert.Equal(t, domain.IBAN("MN", "0050", personAcc), domain.IBAN("mn", "0050", personAcc))
	})

	bad := []struct {
		name                     string
		country, bankCode, accNo string
	}{
		{"bad country", "M1", "0050", personAcc},
		{"bank code wrong len", "MN", "050", personAcc},
		{"bank code non-numeric", "MN", "00X0", personAcc},
		{"account wrong len", "MN", "0050", "12345"},
		{"account non-numeric (old GW format)", "MN", "0050", "GW3F9A2B1C8D"},
		{"empty config", "", "", personAcc},
	}
	for _, tt := range bad {
		t.Run("invalid → empty: "+tt.name, func(t *testing.T) {
			assert.Equal(t, "", domain.IBAN(tt.country, tt.bankCode, tt.accNo))
		})
	}
}

// luhnValid нь бүтэн (шалгах цифр залгасан) дугаар Luhn давж байгааг шалгана.
func luhnValid(num string) bool {
	sum := 0
	double := false
	for i := len(num) - 1; i >= 0; i-- {
		n := int(num[i] - '0')
		if double {
			n *= 2
			if n > 9 {
				n -= 9
			}
		}
		sum += n
		double = !double
	}
	return sum%10 == 0
}

// ibanValid нь IBAN-ийг ISO 13616-ийн дагуу (rearrange + MOD-97 == 1) шалгана.
func ibanValid(iban string) bool {
	rearr := iban[4:] + iban[:4]
	rem := 0
	for _, r := range rearr {
		switch {
		case r >= '0' && r <= '9':
			rem = (rem*10 + int(r-'0')) % 97
		case r >= 'A' && r <= 'Z':
			rem = (rem*100 + int(r-'A') + 10) % 97
		default:
			return false
		}
	}
	return rem == 1
}
