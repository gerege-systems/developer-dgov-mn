// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Package payments нь QR төлбөр / нэхэмжлэх (invoice) давхарга. Хоёр QR формат:
//   (1) Native — Ed25519-гээр гарын үсэглэсэн JWT (tamper-evident, апп нийтийн
//       түлхүүрээр баталгаажуулна; QR signing key нь auth secret-ээс ТУСДАА).
//   (2) EMVCo MPM — олон улсын (UPI/QPay/PromptPay) TLV+CRC формат.
// Settlement нь wallet_transfer (double-entry, atomic). Receive талд хүлээн авагч
// GET-ээр poll хийнэ (RLS).
package payments

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"strconv"
	"strings"
	"time"

	"eidtemplate/internal/business/domain"
	"eidtemplate/pkg/emvco"

	"github.com/golang-jwt/jwt/v5"
)

// Store нь payment_request-ийн хадгалалтын метод (postgres adapter).
type Store interface {
	CreatePaymentRequest(ctx context.Context, subject, kind string, amountMinor *int64, currency, reference string, expiresAt *time.Time) (domain.PaymentRequest, error)
	GetPaymentRequest(ctx context.Context, subject, id string) (domain.PaymentRequest, error)
	ListPaymentRequests(ctx context.Context, subject string, offset, limit int) ([]domain.PaymentRequest, error)
	CancelPaymentRequest(ctx context.Context, subject, id string) error
	PayRequest(ctx context.Context, payer, requestID string, amount, fee int64, idemKey, externalRef string) (domain.WalletTxn, error)
	ResolveRequestPublic(ctx context.Context, id string) (domain.PaymentPublic, bool, error)
	ActiveFeeRule(ctx context.Context, txnType, ownerType, channel string) (*domain.FeeRule, error)
}

// Usecase нь QR төлбөрийн хил.
type Usecase struct {
	store        Store
	edPriv       ed25519.PrivateKey
	edPub        ed25519.PublicKey
	issuer       string
	merchantName string
	defaultEx    time.Duration
}

// NewUsecase нь store + QR signing seed-ээр Ed25519 key деривацлаж үүсгэнэ.
// signingSecret = JWT_SECRET (seed хоосон бол үүнээс domain-separated деривацлана).
func NewUsecase(store Store, signingSecret, qrSeed, issuer, merchantName string) *Usecase {
	var seed [32]byte
	if strings.TrimSpace(qrSeed) != "" {
		seed = sha256.Sum256([]byte(qrSeed))
	} else {
		seed = sha256.Sum256([]byte(signingSecret + "|gerege-qr-ed25519-v1"))
	}
	priv := ed25519.NewKeyFromSeed(seed[:])
	if merchantName == "" {
		merchantName = "Gerege Wallet"
	}
	return &Usecase{
		store: store, edPriv: priv, edPub: priv.Public().(ed25519.PublicKey),
		issuer: issuer, merchantName: merchantName, defaultEx: 365 * 24 * time.Hour,
	}
}

// PublicKeyB64 нь QR баталгаажуулах Ed25519 нийтийн түлхүүр (base64).
func (u *Usecase) PublicKeyB64() string { return base64.StdEncoding.EncodeToString(u.edPub) }

type CreateInput struct {
	ActorSubject string
	Kind         string
	AmountMinor  *int64
	Reference    string
	ExpiresInSec int
}

// CreateResult нь нэхэмжлэх + хоёр QR формат.
type CreateResult struct {
	Request domain.PaymentRequest
	QRToken string // native Ed25519 JWT
	EMV     string // EMVCo MPM (олон улсын)
}

func (u *Usecase) Create(ctx context.Context, in CreateInput) (CreateResult, error) {
	kind := in.Kind
	if kind != "static" && kind != "dynamic" {
		return CreateResult{}, domain.ErrInvalidAmount
	}
	var amount *int64
	var expiresAt *time.Time
	if kind == "dynamic" {
		if in.AmountMinor == nil || *in.AmountMinor <= 0 {
			return CreateResult{}, domain.ErrInvalidAmount
		}
		amount = in.AmountMinor
		sec := in.ExpiresInSec
		if sec <= 0 {
			sec = 300
		}
		exp := time.Now().Add(time.Duration(sec) * time.Second)
		expiresAt = &exp
	}
	req, err := u.store.CreatePaymentRequest(ctx, in.ActorSubject, kind, amount, "MNT", strings.TrimSpace(in.Reference), expiresAt)
	if err != nil {
		return CreateResult{}, err
	}
	token, err := u.signQR(req)
	if err != nil {
		return CreateResult{}, err
	}
	var amt int64
	if req.AmountMinor != nil {
		amt = *req.AmountMinor
	}
	emv := emvco.Build(emvco.PaymentQR{
		RequestID: req.ID, Dynamic: req.Kind == "dynamic", AmountMinor: amt,
		MerchantName: u.merchantName, Reference: req.Reference,
	})
	return CreateResult{Request: req, QRToken: token, EMV: emv}, nil
}

func (u *Usecase) Get(ctx context.Context, subject, id string) (domain.PaymentRequest, error) {
	return u.store.GetPaymentRequest(ctx, subject, id)
}

func (u *Usecase) List(ctx context.Context, subject string, offset, limit int) ([]domain.PaymentRequest, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	return u.store.ListPaymentRequests(ctx, subject, offset, limit)
}

func (u *Usecase) Cancel(ctx context.Context, subject, id string) error {
	return u.store.CancelPaymentRequest(ctx, subject, id)
}

// ResolveResult нь QR-ийг тайлж төлөгчид харуулах (DB-ээс live status).
type ResolveResult struct {
	RequestID      string `json:"request_id"`
	Kind           string `json:"kind"`
	PayeeAccountNo string `json:"payee_account_no"`
	AmountMinor    int64  `json:"amount_minor"`
	Currency       string `json:"currency"`
	Reference      string `json:"reference"`
	Status         string `json:"status"`
}

// Resolve нь QR-ийг (Ed25519 JWT эсвэл EMVCo) тайлж request_id гаргаад DB-ээс
// live мэдээллийг буцаана.
func (u *Usecase) Resolve(ctx context.Context, qr string) (ResolveResult, error) {
	rid, _, err := u.extractRID(qr)
	if err != nil {
		return ResolveResult{}, err
	}
	p, found, err := u.store.ResolveRequestPublic(ctx, rid)
	if err != nil {
		return ResolveResult{}, err
	}
	if !found {
		return ResolveResult{}, domain.ErrRequestNotFound
	}
	var amt int64
	if p.AmountMinor != nil {
		amt = *p.AmountMinor
	}
	return ResolveResult{
		RequestID: rid, Kind: p.Kind, PayeeAccountNo: p.PayeeAccountNo,
		AmountMinor: amt, Currency: p.Currency, Reference: p.Reference, Status: p.Status,
	}, nil
}

type PayInput struct {
	ActorSubject   string
	QRToken        string
	AmountMinor    int64
	IdempotencyKey string
}

type PayResult struct {
	Txn       domain.WalletTxn
	RequestID string
}

// Pay нь QR-ийг шалгаж, DB-ээс дүн/төлвийг тогтоож, нэхэмжлэхийг төлнө.
func (u *Usecase) Pay(ctx context.Context, in PayInput) (PayResult, error) {
	rid, _, err := u.extractRID(in.QRToken)
	if err != nil {
		return PayResult{}, err
	}
	p, found, err := u.store.ResolveRequestPublic(ctx, rid)
	if err != nil {
		return PayResult{}, err
	}
	if !found {
		return PayResult{}, domain.ErrRequestNotFound
	}
	amount := in.AmountMinor
	if p.Kind == "dynamic" && p.AmountMinor != nil {
		amount = *p.AmountMinor
	}
	var fee int64
	if amount > 0 {
		if rule, ferr := u.store.ActiveFeeRule(ctx, "transfer_out", "person", "qr"); ferr == nil && rule != nil {
			fee = rule.Compute(amount)
		}
	}
	ext := rid + ":" + in.IdempotencyKey
	if in.IdempotencyKey == "" {
		ext = rid + ":" + strconv.FormatInt(time.Now().UnixNano(), 36)
	}
	txn, err := u.store.PayRequest(ctx, in.ActorSubject, rid, amount, fee, in.IdempotencyKey, ext)
	if err != nil {
		return PayResult{}, err
	}
	return PayResult{Txn: txn, RequestID: rid}, nil
}

// ---- QR (Ed25519 JWT) + EMVCo ----

func (u *Usecase) extractRID(s string) (rid string, isStatic bool, err error) {
	s = strings.TrimSpace(s)
	if emvco.IsEMV(s) {
		p, e := emvco.Parse(s)
		if e != nil {
			return "", false, domain.ErrInvalidQR
		}
		return p.RequestID, !p.Dynamic, nil
	}
	c, e := u.verifyQR(s)
	if e != nil {
		return "", false, e
	}
	return c.rid, c.knd == "static", nil
}

type qrClaims struct {
	rid, knd, acc, cur, ref string
	amt                     int64
}

func (u *Usecase) signQR(r domain.PaymentRequest) (string, error) {
	exp := time.Now().Add(u.defaultEx)
	if r.ExpiresAt != nil {
		exp = *r.ExpiresAt
	}
	var amt int64
	if r.AmountMinor != nil {
		amt = *r.AmountMinor
	}
	claims := jwt.MapClaims{
		"rid": r.ID, "knd": r.Kind, "acc": r.PayeeAccountNo,
		"amt": amt, "cur": r.Currency, "ref": r.Reference,
		"iss": u.issuer, "typ": "qr", "jti": newJTI(), "exp": exp.Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodEdDSA, claims).SignedString(u.edPriv)
}

func (u *Usecase) verifyQR(token string) (qrClaims, error) {
	parsed, err := jwt.Parse(strings.TrimSpace(token), func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodEd25519); !ok {
			return nil, domain.ErrInvalidQR
		}
		return u.edPub, nil
	}, jwt.WithValidMethods([]string{"EdDSA"}))
	if err != nil || !parsed.Valid {
		return qrClaims{}, domain.ErrInvalidQR
	}
	m, ok := parsed.Claims.(jwt.MapClaims)
	if !ok || m["typ"] != "qr" {
		return qrClaims{}, domain.ErrInvalidQR
	}
	c := qrClaims{rid: str(m["rid"]), knd: str(m["knd"]), acc: str(m["acc"]), cur: str(m["cur"]), ref: str(m["ref"])}
	if c.rid == "" {
		return qrClaims{}, domain.ErrInvalidQR
	}
	if a, ok := m["amt"].(float64); ok {
		c.amt = int64(a)
	}
	return c, nil
}

func newJTI() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return strconv.FormatInt(time.Now().UnixNano(), 16)
	}
	return hex.EncodeToString(b)
}

func str(v any) string {
	s, _ := v.(string)
	return s
}
