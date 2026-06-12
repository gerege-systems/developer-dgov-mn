// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Package emvco нь EMVCo QR Code Specification for Payment Systems (MPM —
// Merchant-Presented Mode) TLV + CRC-16/CCITT кодлогч/задлагч. UPI/QPay/PromptPay
// зэрэг олон улсын QR-тэй нэг форматтай. Бид өөрийн merchant template (GUID
// 'mn.gerege.wallet') дотор payment_request id-г хадгална.
package emvco

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

// GUID нь бидний merchant account information template-ийн глобал танигч.
const GUID = "mn.gerege.wallet"

const (
	tagPayloadFormat = "00"
	tagPOIMethod     = "01" // 11=static, 12=dynamic
	tagMerchantInfo  = "26" // merchant account information template
	tagCurrency      = "53" // ISO 4217 numeric (MNT=496)
	tagAmount        = "54"
	tagCountry       = "58"
	tagMerchantName  = "59"
	tagMerchantCity  = "60"
	tagAdditional    = "62"
	tagCRC           = "63"

	subGUID = "00"
	subID   = "01"
	subRef  = "01" // additional data template доторх bill/reference

	currencyMNT = "496"
	countryMN   = "MN"
)

// ErrInvalidEMV нь буруу/тохирохгүй EMVCo payload.
var ErrInvalidEMV = errors.New("invalid emvco qr")

// PaymentQR нь нэг payment_request-ийн EMVCo талбарууд.
type PaymentQR struct {
	RequestID    string
	Dynamic      bool
	AmountMinor  int64 // dynamic-д > 0; static-д 0
	MerchantName string
	Reference    string
}

func field(id, value string) string {
	return id + fmt.Sprintf("%02d", len(value)) + value
}

func trunc(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}

// Build нь EMVCo MPM payload string үүсгэнэ (CRC-тэй).
func Build(p PaymentQR) string {
	var b strings.Builder
	b.WriteString(field(tagPayloadFormat, "01"))
	if p.Dynamic {
		b.WriteString(field(tagPOIMethod, "12"))
	} else {
		b.WriteString(field(tagPOIMethod, "11"))
	}
	merchant := field(subGUID, GUID) + field(subID, p.RequestID)
	b.WriteString(field(tagMerchantInfo, merchant))
	b.WriteString(field(tagCurrency, currencyMNT))
	if p.Dynamic && p.AmountMinor > 0 {
		b.WriteString(field(tagAmount, strconv.FormatInt(p.AmountMinor, 10)))
	}
	b.WriteString(field(tagCountry, countryMN))
	name := trunc(p.MerchantName, 25)
	if name == "" {
		name = "Gerege"
	}
	b.WriteString(field(tagMerchantName, name))
	b.WriteString(field(tagMerchantCity, "Ulaanbaatar"))
	if p.Reference != "" {
		b.WriteString(field(tagAdditional, field(subRef, trunc(p.Reference, 25))))
	}
	// CRC: '6304' нэмээд бүгдийг CRC-дэж 4 hex (том үсэг).
	payload := b.String() + tagCRC + "04"
	return payload + fmt.Sprintf("%04X", crc16(payload))
}

// Parse нь EMVCo payload-г задалж, CRC + GUID шалгаж PaymentQR буцаана.
func Parse(s string) (PaymentQR, error) {
	s = strings.TrimSpace(s)
	if len(s) < 8 {
		return PaymentQR{}, ErrInvalidEMV
	}
	// CRC шалгах: сүүлийн '63' '04' <4hex>.
	idx := strings.LastIndex(s, tagCRC+"04")
	if idx < 0 || idx+8 != len(s) {
		return PaymentQR{}, ErrInvalidEMV
	}
	want := s[idx+4:]
	got := fmt.Sprintf("%04X", crc16(s[:idx+4]))
	if !strings.EqualFold(want, got) {
		return PaymentQR{}, ErrInvalidEMV
	}
	tlv, err := parseTLV(s[:idx])
	if err != nil {
		return PaymentQR{}, err
	}
	merchant := tlv[tagMerchantInfo]
	if merchant == "" {
		return PaymentQR{}, ErrInvalidEMV
	}
	sub, err := parseTLV(merchant)
	if err != nil {
		return PaymentQR{}, err
	}
	if sub[subGUID] != GUID || sub[subID] == "" {
		return PaymentQR{}, ErrInvalidEMV
	}
	out := PaymentQR{
		RequestID:    sub[subID],
		Dynamic:      tlv[tagPOIMethod] == "12",
		MerchantName: tlv[tagMerchantName],
	}
	if tlv[tagAmount] != "" {
		out.AmountMinor, _ = strconv.ParseInt(tlv[tagAmount], 10, 64)
	}
	if add := tlv[tagAdditional]; add != "" {
		if a, e := parseTLV(add); e == nil {
			out.Reference = a[subRef]
		}
	}
	return out, nil
}

// IsEMV нь string EMVCo payload эсэхийг өнгөц шалгана (payload format = 0002 01).
func IsEMV(s string) bool {
	s = strings.TrimSpace(s)
	return strings.HasPrefix(s, "000201") && strings.Contains(s, tagCRC+"04")
}

// parseTLV нь дараалсан TLV (id 2 цифр, len 2 цифр, value)-г map болгоно.
func parseTLV(s string) (map[string]string, error) {
	out := map[string]string{}
	for len(s) >= 4 {
		id := s[:2]
		n, err := strconv.Atoi(s[2:4])
		if err != nil || 4+n > len(s) {
			return nil, ErrInvalidEMV
		}
		out[id] = s[4 : 4+n]
		s = s[4+n:]
	}
	if len(s) != 0 {
		return nil, ErrInvalidEMV
	}
	return out, nil
}

// crc16 нь CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF).
func crc16(s string) uint16 {
	crc := uint16(0xFFFF)
	for i := 0; i < len(s); i++ {
		crc ^= uint16(s[i]) << 8
		for j := 0; j < 8; j++ {
			if crc&0x8000 != 0 {
				crc = (crc << 1) ^ 0x1021
			} else {
				crc <<= 1
			}
		}
	}
	return crc
}
