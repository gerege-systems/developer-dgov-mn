package emvco

import (
	"strings"
	"testing"
)

// CRC-16/CCITT-FALSE-ийн каноник check утга: "123456789" → 0x29B1.
func TestCRC16Vector(t *testing.T) {
	if got := crc16("123456789"); got != 0x29B1 {
		t.Fatalf("crc16 check: want 0x29B1, got 0x%04X", got)
	}
}

func TestRoundTripDynamic(t *testing.T) {
	in := PaymentQR{RequestID: "10a1c6dd-9ca3-4f5d-83b1-e0eae5184ad9", Dynamic: true, AmountMinor: 1500, MerchantName: "ACME", Reference: "inv-7"}
	s := Build(in)
	if !IsEMV(s) {
		t.Fatalf("IsEMV false for %q", s)
	}
	out, err := Parse(s)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if out.RequestID != in.RequestID || !out.Dynamic || out.AmountMinor != 1500 || out.Reference != "inv-7" {
		t.Fatalf("roundtrip mismatch: %+v", out)
	}
}

func TestRoundTripStatic(t *testing.T) {
	in := PaymentQR{RequestID: "abc", Dynamic: false, MerchantName: "Shop"}
	out, err := Parse(Build(in))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if out.RequestID != "abc" || out.Dynamic || out.AmountMinor != 0 {
		t.Fatalf("static mismatch: %+v", out)
	}
}

func TestTamperDetected(t *testing.T) {
	s := Build(PaymentQR{RequestID: "x", Dynamic: true, AmountMinor: 100})
	// Дүнг өөрчилбөл CRC таарахгүй.
	bad := s[:len(s)-10] + "9" + s[len(s)-9:]
	if _, err := Parse(bad); err == nil {
		t.Fatal("expected CRC failure on tampered payload")
	}
}

func TestParseRejectsWrongGUID(t *testing.T) {
	s := Build(PaymentQR{RequestID: "x", Dynamic: false})
	// GUID-г өөр текстээр (ижил урт) солих → CRC бас таарахгүй болж татгалзана.
	swapped := strings.Replace(s, GUID, GUID[:len(GUID)-1]+"X", 1)
	if _, err := Parse(swapped); err == nil {
		t.Fatal("expected rejection for swapped GUID")
	}
}

func TestParseRejectsMalformed(t *testing.T) {
	for _, bad := range []string{"", "short", "0002zz6304ABCD", "000201"} {
		if _, err := Parse(bad); err == nil {
			t.Fatalf("expected error for %q", bad)
		}
	}
}

func TestIsEMVNegatives(t *testing.T) {
	jwtLike := "eyJhbGciOiJFZERTQSJ9.eyJyaWQiOiJ4In0.sig"
	if IsEMV(jwtLike) {
		t.Fatal("JWT must not be detected as EMV")
	}
	if IsEMV("") || IsEMV("000201") { // CRC tag-гүй
		t.Fatal("incomplete payloads must not be EMV")
	}
}

func TestAmountOmittedForStatic(t *testing.T) {
	// Static QR-д дүн оруулсан ч payload-д дүн орохгүй (нээлттэй дүн).
	out, err := Parse(Build(PaymentQR{RequestID: "s", Dynamic: false, AmountMinor: 9999}))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if out.AmountMinor != 0 {
		t.Fatalf("static must have no amount, got %d", out.AmountMinor)
	}
}
