// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package walletapi

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"eidtemplate/internal/apperror"
	"eidtemplate/internal/business/domain"
	"eidtemplate/internal/business/usecases/wallet"
	"eidtemplate/internal/constants"
	"eidtemplate/internal/http/middlewares"
	"eidtemplate/pkg/jwt"

	"github.com/gofiber/fiber/v3"
)

// fakeUC нь wallet.Usecase-ийг дуурайж, дамжуулсан request-ийг барьж авна.
type fakeUC struct {
	acc  domain.WalletAccount
	txn  domain.WalletTxn
	hold domain.AccountHold
	err  error

	gotOwner    wallet.OwnerRequest
	gotWithdraw wallet.WithdrawRequest
	gotTransfer wallet.TransferRequest
	gotRelease  wallet.ReleaseRequest
	gotTopup    wallet.GatewayTopupRequest
}

func (f *fakeUC) GetOrOpenWallet(_ context.Context, r wallet.OwnerRequest) (wallet.WalletResponse, error) {
	f.gotOwner = r
	return wallet.WalletResponse{Account: f.acc}, f.err
}
func (f *fakeUC) GetBalance(_ context.Context, r wallet.OwnerRequest) (wallet.WalletResponse, error) {
	f.gotOwner = r
	return wallet.WalletResponse{Account: f.acc}, f.err
}
func (f *fakeUC) Deposit(_ context.Context, _ wallet.DepositRequest) (wallet.TxnResponse, error) {
	return wallet.TxnResponse{Txn: f.txn}, f.err
}
func (f *fakeUC) Withdraw(_ context.Context, r wallet.WithdrawRequest) (wallet.TxnResponse, error) {
	f.gotWithdraw = r
	return wallet.TxnResponse{Txn: f.txn}, f.err
}
func (f *fakeUC) ListTransactions(_ context.Context, _ wallet.HistoryRequest) (wallet.HistoryResponse, error) {
	return wallet.HistoryResponse{}, f.err
}
func (f *fakeUC) Transfer(_ context.Context, r wallet.TransferRequest) (wallet.TxnResponse, error) {
	f.gotTransfer = r
	return wallet.TxnResponse{Txn: f.txn}, f.err
}
func (f *fakeUC) Hold(_ context.Context, _ wallet.HoldRequest) (wallet.HoldResponse, error) {
	return wallet.HoldResponse{Hold: f.hold}, f.err
}
func (f *fakeUC) ReleaseHold(_ context.Context, r wallet.ReleaseRequest) error {
	f.gotRelease = r
	return f.err
}
func (f *fakeUC) SettleHold(_ context.Context, _ wallet.SettleRequest) (wallet.TxnResponse, error) {
	return wallet.TxnResponse{Txn: f.txn}, f.err
}
func (f *fakeUC) Reverse(_ context.Context, _ wallet.ReverseRequest) (wallet.TxnResponse, error) {
	return wallet.TxnResponse{Txn: f.txn}, f.err
}
func (f *fakeUC) GatewayTopup(_ context.Context, r wallet.GatewayTopupRequest) (wallet.GatewayTopupResponse, error) {
	f.gotTopup = r
	return wallet.GatewayTopupResponse{TxnID: "gwtxn"}, f.err
}

func (f *fakeUC) UpsertProfile(_ context.Context, _ wallet.ProfileRequest) error {
	return f.err
}

func newApp(uc wallet.Usecase, subject string) *fiber.App {
	app := fiber.New()
	inject := func(c fiber.Ctx) error {
		if subject != "" {
			c.Locals(constants.CtxAuthenticatedUserKey, jwt.JwtCustomClaim{UserID: subject})
		}
		return c.Next()
	}
	NewHandler(uc, "MN", "0050").Register(app.Group("/api/v1"), inject)
	return app
}

func do(t *testing.T, app *fiber.App, method, path, body string, headers map[string]string) (*http.Response, string) {
	t.Helper()
	var r io.Reader
	if body != "" {
		r = strings.NewReader(body)
	}
	req := httptest.NewRequest(method, path, r)
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	b, _ := io.ReadAll(resp.Body)
	return resp, string(b)
}

func TestGetWalletOwnerResolution(t *testing.T) {
	// person: owner = subject
	uc := &fakeUC{acc: domain.WalletAccount{AccountNo: "GW1"}}
	app := newApp(uc, "AA0000001")
	resp, _ := do(t, app, http.MethodGet, "/api/v1/wallet", "", nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	if uc.gotOwner.OwnerType != domain.OwnerPerson || uc.gotOwner.OwnerID != "AA0000001" {
		t.Fatalf("person owner: %+v", uc.gotOwner)
	}

	// Бие даасан хувилбар: /org/:orgId маршрут БАЙХГҮЙ (404).
	app2 := newApp(&fakeUC{}, "AA0000001")
	resp2, _ := do(t, app2, http.MethodGet, "/api/v1/org/ORG1/wallet", "", nil)
	if resp2.StatusCode != http.StatusNotFound {
		t.Fatalf("org path should be 404, got %d", resp2.StatusCode)
	}
}

func TestWithdrawBindsBodyAndIdemKey(t *testing.T) {
	uc := &fakeUC{txn: domain.WalletTxn{ID: "t1"}}
	app := newApp(uc, "AA0000001")
	resp, _ := do(t, app, http.MethodPost, "/api/v1/wallet/withdraw",
		`{"amount_minor":5000,"external_ref":"r1"}`, map[string]string{"X-Idempotency-Key": "k1"})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	got := uc.gotWithdraw
	if got.AmountMinor != 5000 || got.ExternalRef != "r1" || got.IdempotencyKey != "k1" || got.Channel != channelPortal {
		t.Fatalf("withdraw req: %+v", got)
	}
}

func TestErrorMapping(t *testing.T) {
	uc := &fakeUC{err: apperror.BadRequest("үлдэгдэл хүрэлцэхгүй байна")}
	app := newApp(uc, "AA0000001")
	resp, body := do(t, app, http.MethodPost, "/api/v1/wallet/withdraw", `{"amount_minor":1}`, nil)
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	if !strings.Contains(body, "хүрэлцэхгүй") || !strings.Contains(body, "error") {
		t.Fatalf("body = %s", body)
	}
}

func TestUnauthenticated(t *testing.T) {
	app := newApp(&fakeUC{}, "") // claim тавихгүй
	resp, _ := do(t, app, http.MethodGet, "/api/v1/wallet", "", nil)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d", resp.StatusCode)
	}
}

func TestReleaseHoldNoContent(t *testing.T) {
	uc := &fakeUC{}
	app := newApp(uc, "AA0000001")
	resp, _ := do(t, app, http.MethodDelete, "/api/v1/wallet/holds/h9", "", nil)
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	if uc.gotRelease.HoldID != "h9" {
		t.Fatalf("hold id: %+v", uc.gotRelease)
	}
}

func TestGatewayTopupWebhook(t *testing.T) {
	const secret = "bank-secret"
	const body = `{"account_no":"GW123","amount_minor":50000,"external_ref":"bankref9"}`
	uc := &fakeUC{}

	// Redis client nil — nonce-replay шалгалт алгасна (test-д Redis-гүй).
	app := fiber.New()
	app.Post("/webhooks/bank/topup", middlewares.NewHMACMiddleware(secret, nil), NewHandler(uc, "", "").GatewayTopup)

	tsStr := strconv.FormatInt(time.Now().Unix(), 10)
	sign := func() string {
		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write([]byte(tsStr))
		mac.Write([]byte("\n"))
		mac.Write([]byte(body))
		return hex.EncodeToString(mac.Sum(nil))
	}

	// Valid signature + timestamp + nonce → 200, body parsed into usecase request
	resp, out := do(t, app, http.MethodPost, "/webhooks/bank/topup", body,
		map[string]string{
			middlewares.HMACSignatureHeader: sign(),
			middlewares.HMACTimestampHeader: tsStr,
			middlewares.HMACNonceHeader:     "nonce-ok-1",
		})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d (%s)", resp.StatusCode, out)
	}
	if uc.gotTopup.AccountNo != "GW123" || uc.gotTopup.AmountMinor != 50000 || uc.gotTopup.ExternalRef != "bankref9" {
		t.Fatalf("topup req: %+v", uc.gotTopup)
	}

	// Wrong signature → 401, usecase never called
	uc2 := &fakeUC{}
	app2 := fiber.New()
	app2.Post("/webhooks/bank/topup", middlewares.NewHMACMiddleware(secret, nil), NewHandler(uc2, "", "").GatewayTopup)
	resp2, _ := do(t, app2, http.MethodPost, "/webhooks/bank/topup", body,
		map[string]string{
			middlewares.HMACSignatureHeader: "deadbeef",
			middlewares.HMACTimestampHeader: tsStr,
			middlewares.HMACNonceHeader:     "nonce-ok-2",
		})
	if resp2.StatusCode != http.StatusUnauthorized {
		t.Fatalf("bad-sig status = %d", resp2.StatusCode)
	}
	if uc2.gotTopup.AccountNo != "" {
		t.Fatalf("usecase must not be called on bad signature")
	}

	// Stale timestamp (>5min in past) → 401
	staleTS := strconv.FormatInt(time.Now().Add(-10*time.Minute).Unix(), 10)
	staleSign := hmac.New(sha256.New, []byte(secret))
	staleSign.Write([]byte(staleTS))
	staleSign.Write([]byte("\n"))
	staleSign.Write([]byte(body))
	resp3, _ := do(t, app, http.MethodPost, "/webhooks/bank/topup", body,
		map[string]string{
			middlewares.HMACSignatureHeader: hex.EncodeToString(staleSign.Sum(nil)),
			middlewares.HMACTimestampHeader: staleTS,
			middlewares.HMACNonceHeader:     "nonce-stale",
		})
	if resp3.StatusCode != http.StatusUnauthorized {
		t.Fatalf("stale-ts status = %d", resp3.StatusCode)
	}
}

func TestTransferPersonPath(t *testing.T) {
	// Бие даасан: transfer нь хувийн (person=client_id) маршрутаар.
	uc := &fakeUC{txn: domain.WalletTxn{ID: "tr1"}}
	app := newApp(uc, "AA0000001")
	resp, _ := do(t, app, http.MethodPost, "/api/v1/wallet/transfer",
		`{"to_account_no":"GWXYZ","amount_minor":1000}`, nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	if uc.gotTransfer.OwnerType != domain.OwnerPerson || uc.gotTransfer.OwnerID != "AA0000001" || uc.gotTransfer.ToAccountNo != "GWXYZ" {
		t.Fatalf("transfer req: %+v", uc.gotTransfer)
	}
}
