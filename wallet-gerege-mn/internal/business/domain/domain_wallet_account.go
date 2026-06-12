// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Энэ файл нь дансны дугаар (account_no) үүсгэх ба IBAN тооцоолох ЦЭВЭР (DB-гүй)
// логикийг агуулна. Дугаарлалт нь олон улсын стандартад нийцнэ:
//
//	account_no (12 цифр) = [T:1][sequence:10][Luhn:1]
//	  T        — эзний төрөл (1=person, 2=organization)
//	  sequence — Postgres wallet_account_no_seq-ээс (монотон, мөргөлдөөнгүй)
//	  Luhn     — ISO/IEC 7812 MOD-10 шалгах цифр (бичгийн алдаа илрүүлэх)
//
//	IBAN (Монгол, 20 тэмдэгт) = MN + check(2) + bankCode(4) + account_no(12)
//	  check — ISO 13616 / ISO 7064 MOD-97-10. bankCode/country нь env config.
//
// IBAN-ийг ХАДГАЛАХГҮЙ — account_no-оос config-той хослуулж тооцоолно (bank code
// өөрчлөгдвөл stale болохгүй). Дизайн: docs/WALLET_LEDGER_DESIGN.md.
package domain

import (
	"errors"
	"fmt"
	"strings"
)

// Дансны дугаарын бүтцийн тогтмолууд.
const (
	accountNoSeqDigits = 10 // sequence хэсгийн урт
	accountNoLen       = 12 // T(1) + sequence(10) + Luhn(1)
	ibanBankCodeLen    = 4  // Монгол BBAN-ийн банкны кодын урт
)

// Эзний төрлийн эхний цифр (account_no[0]).
const (
	acctTypeDigitPerson = '1'
	acctTypeDigitOrg    = '2'
)

// ErrInvalidOwnerType нь account_no үүсгэхэд танигдахгүй owner_type ирэх үед.
var ErrInvalidOwnerType = errors.New("unknown owner type for account number")

// ErrSequenceOutOfRange нь sequence 10 цифрт багтахгүй (≥ 1e10) болох үед.
var ErrSequenceOutOfRange = errors.New("account sequence out of range")

// luhnCheckDigit нь өгөгдсөн (цифр зөвхөн) payload-д залгахад Luhn (MOD-10)
// шалгалт давах нэг шалгах цифрийг буцаана. payload-ийн баруун талаас тоолж,
// шалгах цифр баруун хамгийн зах (тэгш бус байрлал) тул түүний зүүн талын
// цифрээс эхлэн нэг алгасан давхарлана.
func luhnCheckDigit(payload string) int {
	sum := 0
	double := true // шалгах цифрийн зүүн талын эхний цифрийг давхарлана
	for i := len(payload) - 1; i >= 0; i-- {
		n := int(payload[i] - '0')
		if double {
			n *= 2
			if n > 9 {
				n -= 9
			}
		}
		sum += n
		double = !double
	}
	return (10 - (sum % 10)) % 10
}

// ownerTypeDigit нь owner_type-аас эхний цифрийг буцаана.
func ownerTypeDigit(ownerType string) (byte, error) {
	switch ownerType {
	case OwnerPerson:
		return acctTypeDigitPerson, nil
	case OwnerOrganization:
		return acctTypeDigitOrg, nil
	default:
		return 0, ErrInvalidOwnerType
	}
}

// GenerateAccountNo нь эзний төрөл + sequence-ээс 12 цифрт account_no үүсгэнэ.
// sequence нь DB-ийн wallet_account_no_seq-ийн nextval (1-ээс эхэлнэ).
func GenerateAccountNo(ownerType string, seq int64) (string, error) {
	td, err := ownerTypeDigit(ownerType)
	if err != nil {
		return "", err
	}
	if seq < 0 || seq >= 1e10 {
		return "", ErrSequenceOutOfRange
	}
	payload := fmt.Sprintf("%c%0*d", td, accountNoSeqDigits, seq) // 11 цифр
	return fmt.Sprintf("%s%d", payload, luhnCheckDigit(payload)), nil
}

// isAllDigits нь мөр зөвхөн 0-9-ээс тогтсон ба хоосон биш эсэхийг буцаана.
func isAllDigits(s string) bool {
	if s == "" {
		return false
	}
	for i := 0; i < len(s); i++ {
		if s[i] < '0' || s[i] > '9' {
			return false
		}
	}
	return true
}

// iso7064Mod97 нь (зөвхөн цифрээс тогтсон) урт мөрийн MOD-97-ийг overflow-гүйгээр,
// тус бүрчлэн (piecewise) тооцоолно.
func iso7064Mod97(numeric string) int {
	rem := 0
	for i := 0; i < len(numeric); i++ {
		rem = (rem*10 + int(numeric[i]-'0')) % 97
	}
	return rem
}

// lettersToDigits нь IBAN check тооцоонд үсгийг (A=10 … Z=35) хос цифр болгоно.
func lettersToDigits(s string) string {
	var b strings.Builder
	for _, r := range s {
		switch {
		case r >= '0' && r <= '9':
			b.WriteRune(r)
		case r >= 'A' && r <= 'Z':
			fmt.Fprintf(&b, "%d", int(r-'A')+10)
		default:
			// IBAN-д зөвшөөрөгдөөгүй тэмдэгт — алгасна (хүчингүй оролтыг IBAN() барина).
		}
	}
	return b.String()
}

// IBAN нь country (2 үсэг) + bankCode (4 цифр) + account_no (12 цифр)-оос
// бүтэн Монгол IBAN-ийг (20 тэмдэгт) ISO 13616 check-тэйгээр буцаана. Оролт
// хүчингүй (хуучин формат / дутуу config) бол ХООСОН мөр буцаана — дуудагч тал
// `iban` талбарыг алгасна.
func IBAN(country, bankCode, accountNo string) string {
	country = strings.ToUpper(strings.TrimSpace(country))
	if len(country) != 2 || country[0] < 'A' || country[0] > 'Z' || country[1] < 'A' || country[1] > 'Z' {
		return ""
	}
	if len(bankCode) != ibanBankCodeLen || !isAllDigits(bankCode) {
		return ""
	}
	if len(accountNo) != accountNoLen || !isAllDigits(accountNo) {
		return ""
	}
	bban := bankCode + accountNo
	// Check digit: BBAN + country + "00"-ийг тоонд хувиргаж 98 − (mod 97).
	check := 98 - iso7064Mod97(lettersToDigits(bban+country+"00"))
	return fmt.Sprintf("%s%02d%s", country, check, bban)
}
