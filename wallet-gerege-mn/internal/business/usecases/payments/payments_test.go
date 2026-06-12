// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package payments

import (
	"context"
	"strings"
	"testing"
	"time"

	"eidtemplate/internal/business/domain"
	"eidtemplate/pkg/emvco"

	"github.com/golang-jwt/jwt/v5"
)

// fakeStore нь Store interface-ийн in-memory хэрэгжүүлэлт (DB-гүй unit тест).
type fakeStore struct {
	created  domain.PaymentRequest
	public   domain.PaymentPublic
	found    bool
	feeRule  *domain.FeeRule
	payCalls []payCall
}

type payCall struct {
	payer, requestID, idemKey, externalRef string
	amount, fee                            int64
}

func (f *fakeStore) CreatePaymentRequest(_ context.Context, subject, kind string, amountMinor *int64, currency, reference string, expiresAt *time.Time) (domain.PaymentRequest, error) {
	r := domain.PaymentRequest{
		ID: "req-123", Kind: kind, PayeeOwner: subject, PayeeAccountNo: "100000000040",
		AmountMinor: amountMinor, Currency: currency, Reference: reference,
		Status: "active", ExpiresAt: expiresAt,
	}
	f.created = r
	return r, nil
}

func (f *fakeStore) GetPaymentRequest(_ context.Context, _, _ string) (domain.PaymentRequest, error) {
	return f.created, nil
}

func (f *fakeStore) ListPaymentRequests(_ context.Context, _ string, _, _ int) ([]domain.PaymentRequest, error) {
	return []domain.PaymentRequest{f.created}, nil
}

func (f *fakeStore) CancelPaymentRequest(_ context.Context, _, _ string) error { return nil }

func (f *fakeStore) PayRequest(_ context.Context, payer, requestID string, amount, fee int64, idemKey, externalRef string) (domain.WalletTxn, error) {
	f.payCalls = append(f.payCalls, payCall{payer, requestID, idemKey, externalRef, amount, fee})
	return domain.WalletTxn{ID: "txn-1"}, nil
}

func (f *fakeStore) ResolveRequestPublic(_ context.Context, _ string) (domain.PaymentPublic, bool, error) {
	return f.public, f.found, nil
}

func (f *fakeStore) ActiveFeeRule(_ context.Context, _, _, _ string) (*domain.FeeRule, error) {
	return f.feeRule, nil
}

func newTestUsecase(store Store) *Usecase {
	return NewUsecase(store, "test-jwt-secret-at-least-32-bytes-long!!", "", "wallet.gerege.mn", "Gerege Wallet")
}

// --- Key derivation ---

func TestKeyDerivationDeterministic(t *testing.T) {
	a := NewUsecase(&fakeStore{}, "same-secret", "", "iss", "M")
	b := NewUsecase(&fakeStore{}, "same-secret", "", "iss", "M")
	if a.PublicKeyB64() != b.PublicKeyB64() {
		t.Fatal("same secret must derive same key")
	}
	c := NewUsecase(&fakeStore{}, "different-secret", "", "iss", "M")
	if a.PublicKeyB64() == c.PublicKeyB64() {
		t.Fatal("different secret must derive different key")
	}
	// qrSeed нь signingSecret-ийг дарж бичнэ.
	d := NewUsecase(&fakeStore{}, "secret-1", "shared-seed", "iss", "M")
	e := NewUsecase(&fakeStore{}, "secret-2", "shared-seed", "iss", "M")
	if d.PublicKeyB64() != e.PublicKeyB64() {
		t.Fatal("same qrSeed must derive same key regardless of signingSecret")
	}
}

// --- signQR / verifyQR ---

func TestSignVerifyRoundTrip(t *testing.T) {
	u := newTestUsecase(&fakeStore{})
	amt := int64(2500)
	req := domain.PaymentRequest{ID: "req-abc", Kind: "dynamic", PayeeAccountNo: "100000000040", AmountMinor: &amt, Currency: "MNT", Reference: "inv-9"}
	tok, err := u.signQR(req)
	if err != nil {
		t.Fatalf("signQR: %v", err)
	}
	c, err := u.verifyQR(tok)
	if err != nil {
		t.Fatalf("verifyQR: %v", err)
	}
	if c.rid != "req-abc" || c.knd != "dynamic" || c.amt != 2500 || c.ref != "inv-9" {
		t.Fatalf("claims mismatch: %+v", c)
	}
}

func TestVerifyRejectsWrongKey(t *testing.T) {
	signer := NewUsecase(&fakeStore{}, "secret-A", "", "iss", "M")
	verifier := NewUsecase(&fakeStore{}, "secret-B", "", "iss", "M")
	tok, _ := signer.signQR(domain.PaymentRequest{ID: "x", Kind: "static"})
	if _, err := verifier.verifyQR(tok); err == nil {
		t.Fatal("expected verify failure with mismatched key")
	}
}

func TestVerifyRejectsHS256(t *testing.T) {
	u := newTestUsecase(&fakeStore{})
	// EdDSA биш HS256-аар хуурамч токен үүсгэвэл татгалзана (alg-confusion хамгаалалт).
	claims := jwt.MapClaims{"rid": "x", "typ": "qr", "exp": time.Now().Add(time.Hour).Unix()}
	bad, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte("any"))
	if _, err := u.verifyQR(bad); err == nil {
		t.Fatal("expected HS256 token to be rejected")
	}
}

func TestVerifyRejectsExpired(t *testing.T) {
	u := newTestUsecase(&fakeStore{})
	req := domain.PaymentRequest{ID: "x", Kind: "dynamic"}
	past := time.Now().Add(-time.Hour)
	req.ExpiresAt = &past
	tok, _ := u.signQR(req)
	if _, err := u.verifyQR(tok); err == nil {
		t.Fatal("expected expired token to be rejected")
	}
}

func TestVerifyRejectsNonQRType(t *testing.T) {
	u := newTestUsecase(&fakeStore{})
	claims := jwt.MapClaims{"rid": "x", "typ": "session", "exp": time.Now().Add(time.Hour).Unix()}
	tok, _ := jwt.NewWithClaims(jwt.SigningMethodEdDSA, claims).SignedString(u.edPriv)
	if _, err := u.verifyQR(tok); err == nil {
		t.Fatal("expected non-qr typ token to be rejected")
	}
}

// --- extractRID: EMVCo vs JWT ---

func TestExtractRIDDetectsFormats(t *testing.T) {
	u := newTestUsecase(&fakeStore{})
	// JWT
	tok, _ := u.signQR(domain.PaymentRequest{ID: "jwt-rid", Kind: "static"})
	rid, isStatic, err := u.extractRID(tok)
	if err != nil || rid != "jwt-rid" || !isStatic {
		t.Fatalf("jwt extract: rid=%q static=%v err=%v", rid, isStatic, err)
	}
	// EMVCo
	emv := emvco.Build(emvco.PaymentQR{RequestID: "emv-rid", Dynamic: true, AmountMinor: 100, MerchantName: "M"})
	rid, isStatic, err = u.extractRID(emv)
	if err != nil || rid != "emv-rid" || isStatic {
		t.Fatalf("emv extract: rid=%q static=%v err=%v", rid, isStatic, err)
	}
	// Garbage
	if _, _, err := u.extractRID("not-a-qr"); err == nil {
		t.Fatal("expected error for garbage input")
	}
}

// --- Create ---

func TestCreateDynamicRequiresAmount(t *testing.T) {
	u := newTestUsecase(&fakeStore{})
	if _, err := u.Create(context.Background(), CreateInput{Kind: "dynamic"}); err != domain.ErrInvalidAmount {
		t.Fatalf("want ErrInvalidAmount, got %v", err)
	}
	zero := int64(0)
	if _, err := u.Create(context.Background(), CreateInput{Kind: "dynamic", AmountMinor: &zero}); err != domain.ErrInvalidAmount {
		t.Fatalf("zero amount: want ErrInvalidAmount, got %v", err)
	}
}

func TestCreateRejectsBadKind(t *testing.T) {
	u := newTestUsecase(&fakeStore{})
	if _, err := u.Create(context.Background(), CreateInput{Kind: "weird"}); err != domain.ErrInvalidAmount {
		t.Fatalf("want ErrInvalidAmount for bad kind, got %v", err)
	}
}

func TestCreateReturnsBothQRFormats(t *testing.T) {
	u := newTestUsecase(&fakeStore{})
	amt := int64(5000)
	res, err := u.Create(context.Background(), CreateInput{ActorSubject: "user-1", Kind: "dynamic", AmountMinor: &amt, Reference: "r1", ExpiresInSec: 600})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if res.QRToken == "" || res.EMV == "" {
		t.Fatal("both QRToken and EMV must be set")
	}
	// EMV нь задрах ёстой бөгөөд request_id-г агуулна.
	p, err := emvco.Parse(res.EMV)
	if err != nil || p.RequestID != "req-123" {
		t.Fatalf("EMV parse: %+v err=%v", p, err)
	}
	// QRToken нь баталгаажих ёстой.
	c, err := u.verifyQR(res.QRToken)
	if err != nil || c.rid != "req-123" {
		t.Fatalf("QRToken verify: %+v err=%v", c, err)
	}
}

func TestCreateStaticHasNoAmount(t *testing.T) {
	store := &fakeStore{}
	u := newTestUsecase(store)
	_, err := u.Create(context.Background(), CreateInput{ActorSubject: "u", Kind: "static"})
	if err != nil {
		t.Fatalf("Create static: %v", err)
	}
	if store.created.AmountMinor != nil {
		t.Fatal("static request must not carry an amount")
	}
}

// --- Pay ---

func TestPayUsesDBAmountForDynamic(t *testing.T) {
	dbAmt := int64(7000)
	store := &fakeStore{
		found:  true,
		public: domain.PaymentPublic{Kind: "dynamic", PayeeAccountNo: "100000000040", AmountMinor: &dbAmt, Currency: "MNT", Status: "active"},
	}
	u := newTestUsecase(store)
	tok, _ := u.signQR(domain.PaymentRequest{ID: "req-123", Kind: "dynamic"})
	// Төлөгч өөр (бага) дүн илгээсэн ч сервер DB-ийн дүнг ашиглах ёстой.
	_, err := u.Pay(context.Background(), PayInput{ActorSubject: "payer", QRToken: tok, AmountMinor: 1})
	if err != nil {
		t.Fatalf("Pay: %v", err)
	}
	if len(store.payCalls) != 1 || store.payCalls[0].amount != 7000 {
		t.Fatalf("expected DB amount 7000, got %+v", store.payCalls)
	}
}

func TestPayComputesFeeFromRule(t *testing.T) {
	dbAmt := int64(10000)
	store := &fakeStore{
		found:   true,
		public:  domain.PaymentPublic{Kind: "dynamic", AmountMinor: &dbAmt, Currency: "MNT", Status: "active"},
		feeRule: &domain.FeeRule{Method: domain.FeeMethodPercent, PercentBPS: 100}, // 1% = 100
	}
	u := newTestUsecase(store)
	tok, _ := u.signQR(domain.PaymentRequest{ID: "req-123", Kind: "dynamic"})
	if _, err := u.Pay(context.Background(), PayInput{ActorSubject: "payer", QRToken: tok}); err != nil {
		t.Fatalf("Pay: %v", err)
	}
	if store.payCalls[0].fee != 100 {
		t.Fatalf("expected fee 100 (1%% of 10000), got %d", store.payCalls[0].fee)
	}
}

func TestPayNotFound(t *testing.T) {
	store := &fakeStore{found: false}
	u := newTestUsecase(store)
	tok, _ := u.signQR(domain.PaymentRequest{ID: "req-123", Kind: "static"})
	if _, err := u.Pay(context.Background(), PayInput{ActorSubject: "p", QRToken: tok, AmountMinor: 500}); err != domain.ErrRequestNotFound {
		t.Fatalf("want ErrRequestNotFound, got %v", err)
	}
}

func TestPayIdempotencyKeyInExternalRef(t *testing.T) {
	amt := int64(300)
	store := &fakeStore{found: true, public: domain.PaymentPublic{Kind: "dynamic", AmountMinor: &amt, Status: "active"}}
	u := newTestUsecase(store)
	tok, _ := u.signQR(domain.PaymentRequest{ID: "req-123", Kind: "dynamic"})
	_, err := u.Pay(context.Background(), PayInput{ActorSubject: "p", QRToken: tok, IdempotencyKey: "idem-xyz"})
	if err != nil {
		t.Fatalf("Pay: %v", err)
	}
	// external_ref = "<rid>:<idemKey>" тул idempotency replay-г баталгаажуулна.
	if got := store.payCalls[0].externalRef; !strings.HasPrefix(got, "req-123:") || !strings.HasSuffix(got, "idem-xyz") {
		t.Fatalf("external_ref format unexpected: %q", got)
	}
}

func TestPublicKeyB64Valid(t *testing.T) {
	u := newTestUsecase(&fakeStore{})
	if len(u.edPub) != 32 {
		t.Fatalf("ed25519 public key must be 32 bytes, got %d", len(u.edPub))
	}
	if u.PublicKeyB64() == "" {
		t.Fatal("PublicKeyB64 empty")
	}
}
