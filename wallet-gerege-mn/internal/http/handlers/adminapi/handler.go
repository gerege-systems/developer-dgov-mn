// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Package adminapi нь wallet.gerege.mn-ийн super-admin HTTP API (тусдаа service,
// cmd/admin). Admin username/password-аар нэвтэрч admin JWT (isAdmin) авна;
// дараа нь client/account/fee-rule удирдлага, тайлан, reconcile, audit. Superuser
// DSN-ээр RLS тойрно. Алдаа: {"error": "..."}.
package adminapi

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"eidtemplate/internal/business/domain"
	"eidtemplate/pkg/helpers"
	"eidtemplate/pkg/jwt"

	"github.com/gofiber/fiber/v3"
)

// Store нь admin-ийн шаардлагатай repo үйлдлүүд (postgres/wallet.Repository).
type Store interface {
	GetAdmin(ctx context.Context, username string) (domain.WalletAdmin, error)
	TouchAdminLogin(ctx context.Context, username string) error
	ListClients(ctx context.Context) ([]domain.WalletClient, error)
	CreateClient(ctx context.Context, clientID, name, secretHash string) error
	SetClientActive(ctx context.Context, clientID string, active bool) error
	SetClientIPs(ctx context.Context, clientID, allowedIPs string) error
	SetClientWebhook(ctx context.Context, clientID, url, secret string) error
	ListAllAccounts(ctx context.Context, offset, limit int) ([]domain.WalletAccount, error)
	GetAccountByNo(ctx context.Context, accountNo string) (domain.WalletAccount, error)
	GetOwnerProfile(ctx context.Context, ownerID string) (domain.WalletOwnerProfile, bool, error)
	SetAccountStatus(ctx context.Context, accountNo, status string) error
	ListFeeRules(ctx context.Context) ([]domain.FeeRule, error)
	SetFeeRuleActive(ctx context.Context, code string, active bool) error
	ListAudit(ctx context.Context, limit int) ([]domain.AuditRow, error)
	AdminListPaymentRequests(ctx context.Context, offset, limit int) ([]domain.PaymentRequest, error)
	Reconcile(ctx context.Context) ([]domain.ReconDiscrepancy, error)
	TrialBalance(ctx context.Context, date time.Time) ([]domain.TrialBalanceRow, error)
	DailyTurnover(ctx context.Context, from, to time.Time) ([]domain.DailyTurnoverRow, error)
	AccountStatement(ctx context.Context, accountNo string, from, to time.Time) ([]domain.AccountStatementRow, error)
}

// Handler нь admin endpoint-уудыг үйлчилнэ.
type Handler struct {
	store      Store
	jwtService jwt.JWTService
}

// NewHandler нь store + jwt service-ээр handler үүсгэнэ.
func NewHandler(store Store, jwtService jwt.JWTService) *Handler {
	return &Handler{store: store, jwtService: jwtService}
}

// Register нь /admin/* маршрутуудыг холбоно. authMiddleware-ийг login-аас бусдад тавина.
func (h *Handler) Register(app *fiber.App, authMiddleware fiber.Handler) {
	app.Post("/admin/auth/login", h.Login)
	g := app.Group("/admin", authMiddleware)
	g.Get("/me", h.Me)
	g.Get("/clients", h.ListClients)
	g.Post("/clients", h.CreateClient)
	g.Patch("/clients/:id", h.SetClientActive)
	g.Put("/clients/:id/ips", h.SetClientIPs)
	g.Put("/clients/:id/webhook", h.SetClientWebhook)
	g.Get("/accounts", h.ListAccounts)
	g.Get("/accounts/:account_no", h.GetAccount)
	g.Patch("/accounts/:account_no", h.SetAccountStatus)
	g.Get("/fee-rules", h.ListFeeRules)
	g.Patch("/fee-rules/:code", h.SetFeeRuleActive)
	g.Post("/reconcile", h.Reconcile)
	g.Get("/audit", h.Audit)
	g.Get("/payments", h.ListPayments)
	g.Get("/reports/trial-balance", h.TrialBalance)
	g.Get("/reports/turnover", h.Turnover)
	g.Get("/reports/statement", h.Statement)
}

const tzUB = "Asia/Ulaanbaatar"

// Login нь admin username/password-ийг шалгаж admin JWT (isAdmin) гаргана.
func (h *Handler) Login(c fiber.Ctx) error {
	var body struct{ Username, Password string }
	if err := c.Bind().Body(&body); err != nil {
		return bad(c, "malformed body")
	}
	admin, err := h.store.GetAdmin(c.Context(), body.Username)
	if err != nil || !admin.Active || !helpers.ValidateHash(body.Password, admin.PasswordHash) {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "invalid credentials"})
	}
	token, err := h.jwtService.GenerateToken(admin.Username, true, "")
	if err != nil {
		return fail(c)
	}
	_ = h.store.TouchAdminLogin(c.Context(), admin.Username)
	return c.JSON(fiber.Map{"token": token, "username": admin.Username, "name": admin.Name})
}

// Me нь нэвтэрсэн admin-ийг буцаана.
func (h *Handler) Me(c fiber.Ctx) error {
	return c.JSON(fiber.Map{"username": adminUser(c)})
}

func (h *Handler) ListClients(c fiber.Ctx) error {
	rows, err := h.store.ListClients(c.Context())
	if err != nil {
		return fail(c)
	}
	return c.JSON(fiber.Map{"clients": rows})
}

func (h *Handler) CreateClient(c fiber.Ctx) error {
	var body struct {
		ClientID string `json:"client_id"`
		Name     string `json:"name"`
	}
	// Зөвхөн НЭР шаардана; client_id өгөгдөөгүй бол нэрнээс автоматаар үүсгэнэ.
	if err := c.Bind().Body(&body); err != nil || strings.TrimSpace(body.Name) == "" {
		return bad(c, "name required")
	}
	clientID := strings.TrimSpace(body.ClientID)
	if clientID == "" {
		clientID = generateClientID(body.Name)
	}
	secret, err := randomSecret()
	if err != nil {
		return fail(c)
	}
	hash, err := helpers.GenerateHash(secret)
	if err != nil {
		return fail(c)
	}
	if err := h.store.CreateClient(c.Context(), clientID, strings.TrimSpace(body.Name), hash); err != nil {
		return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "could not create client (duplicate?)"})
	}
	// client_id (үүсгэсэн) + client_secret-ийг ганц удаа буцаана.
	return c.Status(http.StatusCreated).JSON(fiber.Map{"client_id": clientID, "client_secret": secret})
}

// generateClientID нь нэрнээс уншихад ойлгомжтой slug + санамсаргүй hex дагавар
// үүсгэнэ (латин бус нэр → "wc"). Жишээ: "Partner X" → "partner-x-a1b2c3".
func generateClientID(name string) string {
	slug := slugify(name)
	b := make([]byte, 3)
	if _, err := rand.Read(b); err != nil {
		return slug + "-" + strconv.FormatInt(time.Now().UnixNano()%1000000, 16)
	}
	return slug + "-" + hex.EncodeToString(b)
}

// slugify нь латин үсэг/цифрийг үлдээж бусдыг "-" болгоно; хоосон бол "wc".
func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	var b strings.Builder
	prevDash := false
	for _, r := range s {
		switch {
		case (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'):
			b.WriteRune(r)
			prevDash = false
		case !prevDash && b.Len() > 0:
			b.WriteByte('-')
			prevDash = true
		}
	}
	out := strings.Trim(b.String(), "-")
	if out == "" {
		return "wc"
	}
	if len(out) > 32 {
		out = strings.Trim(out[:32], "-")
	}
	return out
}

func (h *Handler) SetClientActive(c fiber.Ctx) error {
	var body struct{ Active bool }
	_ = c.Bind().Body(&body)
	if err := h.store.SetClientActive(c.Context(), c.Params("id"), body.Active); err != nil {
		return fail(c)
	}
	return c.JSON(fiber.Map{"client_id": c.Params("id"), "active": body.Active})
}

// SetClientIPs нь client-ийн IP allowlist-ийг тохируулна. Хоосон → хязгаарлалтгүй.
// Оролт нь IP эсвэл CIDR-ийн жагсаалт (массив эсвэл таслалаар); бүгдийг шалгана.
func (h *Handler) SetClientIPs(c fiber.Ctx) error {
	var body struct {
		AllowedIPs []string `json:"allowed_ips"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return bad(c, "allowed_ips required")
	}
	clean := make([]string, 0, len(body.AllowedIPs))
	for _, raw := range body.AllowedIPs {
		s := strings.TrimSpace(raw)
		if s == "" {
			continue
		}
		ok := false
		if strings.Contains(s, "/") {
			_, _, err := net.ParseCIDR(s)
			ok = err == nil
		} else {
			ok = net.ParseIP(s) != nil
		}
		if !ok {
			return bad(c, "буруу IP/CIDR: "+s)
		}
		clean = append(clean, s)
	}
	joined := strings.Join(clean, ",")
	if err := h.store.SetClientIPs(c.Context(), c.Params("id"), joined); err != nil {
		return fail(c)
	}
	return c.JSON(fiber.Map{"client_id": c.Params("id"), "allowed_ips": joined})
}

// SetClientWebhook нь client-ийн webhook URL-ийг тохируулна. URL тохируулбал шинэ
// webhook_secret (HMAC) үүсгэж НЭГ удаа буцаана; хоосон URL → webhook унтраана.
func (h *Handler) SetClientWebhook(c fiber.Ctx) error {
	var body struct {
		URL string `json:"url"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return bad(c, "url required")
	}
	url := strings.TrimSpace(body.URL)
	var secret string
	if url != "" {
		if !strings.HasPrefix(url, "https://") {
			return bad(c, "webhook url must be https")
		}
		s, err := randomSecret()
		if err != nil {
			return fail(c)
		}
		secret = s
	}
	if err := h.store.SetClientWebhook(c.Context(), c.Params("id"), url, secret); err != nil {
		return fail(c)
	}
	return c.JSON(fiber.Map{"client_id": c.Params("id"), "webhook_url": url, "webhook_secret": secret})
}

func (h *Handler) ListAccounts(c fiber.Ctx) error {
	offset, _ := strconv.Atoi(c.Query("offset"))
	if offset < 0 {
		offset = 0
	}
	limit, _ := strconv.Atoi(c.Query("limit"))
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := h.store.ListAllAccounts(c.Context(), offset, limit)
	if err != nil {
		return fail(c)
	}
	return c.JSON(fiber.Map{"accounts": rows})
}

func (h *Handler) GetAccount(c fiber.Ctx) error {
	acc, err := h.store.GetAccountByNo(c.Context(), c.Params("account_no"))
	if err != nil {
		return notFound(c)
	}
	// Эзний бүрэн профайл (хэрэглэгчийн мэдээлэл) — байхгүй бол null.
	var profile any
	if p, ok, perr := h.store.GetOwnerProfile(c.Context(), acc.OwnerID); perr == nil && ok {
		profile = p
	}
	return c.JSON(fiber.Map{"account": acc, "profile": profile})
}

func (h *Handler) SetAccountStatus(c fiber.Ctx) error {
	var body struct{ Status string }
	if err := c.Bind().Body(&body); err != nil {
		return bad(c, "status required")
	}
	switch body.Status {
	case "active", "frozen", "closed":
	default:
		return bad(c, "status must be active|frozen|closed")
	}
	if err := h.store.SetAccountStatus(c.Context(), c.Params("account_no"), body.Status); err != nil {
		return notFound(c)
	}
	return c.JSON(fiber.Map{"account_no": c.Params("account_no"), "status": body.Status})
}

func (h *Handler) ListFeeRules(c fiber.Ctx) error {
	rows, err := h.store.ListFeeRules(c.Context())
	if err != nil {
		return fail(c)
	}
	return c.JSON(fiber.Map{"fee_rules": rows})
}

func (h *Handler) SetFeeRuleActive(c fiber.Ctx) error {
	var body struct{ Active bool }
	_ = c.Bind().Body(&body)
	if err := h.store.SetFeeRuleActive(c.Context(), c.Params("code"), body.Active); err != nil {
		return notFound(c)
	}
	return c.JSON(fiber.Map{"code": c.Params("code"), "active": body.Active})
}

func (h *Handler) Reconcile(c fiber.Ctx) error {
	disc, err := h.store.Reconcile(c.Context())
	if err != nil {
		return fail(c)
	}
	return c.JSON(fiber.Map{"ok": len(disc) == 0, "discrepancies": disc})
}

func (h *Handler) ListPayments(c fiber.Ctx) error {
	offset, _ := strconv.Atoi(c.Query("offset"))
	if offset < 0 {
		offset = 0
	}
	limit, _ := strconv.Atoi(c.Query("limit"))
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	rows, err := h.store.AdminListPaymentRequests(c.Context(), offset, limit)
	if err != nil {
		return fail(c)
	}
	return c.JSON(fiber.Map{"payments": rows})
}

func (h *Handler) Audit(c fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit"))
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := h.store.ListAudit(c.Context(), limit)
	if err != nil {
		return fail(c)
	}
	return c.JSON(fiber.Map{"audit": rows})
}

func (h *Handler) TrialBalance(c fiber.Ctx) error {
	date := today()
	if q := c.Query("date"); q != "" {
		d, err := parseDate(q)
		if err != nil {
			return bad(c, "date must be YYYY-MM-DD")
		}
		date = d
	}
	rows, err := h.store.TrialBalance(c.Context(), date)
	if err != nil {
		return fail(c)
	}
	return c.JSON(fiber.Map{"date": date.Format("2006-01-02"), "rows": rows})
}

func (h *Handler) Turnover(c fiber.Ctx) error {
	from, to, ok := dateRange(c)
	if !ok {
		return bad(c, "from and to required (YYYY-MM-DD)")
	}
	rows, err := h.store.DailyTurnover(c.Context(), from, to)
	if err != nil {
		return fail(c)
	}
	return c.JSON(fiber.Map{"rows": rows})
}

func (h *Handler) Statement(c fiber.Ctx) error {
	accountNo := c.Query("account_no")
	if accountNo == "" {
		return bad(c, "account_no required")
	}
	from, to, ok := dateRange(c)
	if !ok {
		return bad(c, "from and to required (YYYY-MM-DD)")
	}
	rows, err := h.store.AccountStatement(c.Context(), accountNo, from, to)
	if err != nil {
		return fail(c)
	}
	return c.JSON(fiber.Map{"account_no": accountNo, "rows": rows})
}

// ---- helpers ----

func randomSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func adminUser(c fiber.Ctx) string {
	if claims, ok := c.Locals("admin").(jwt.JwtCustomClaim); ok {
		return claims.UserID
	}
	return ""
}

func ubLoc() *time.Location {
	loc, err := time.LoadLocation(tzUB)
	if err != nil {
		return time.UTC
	}
	return loc
}
func today() time.Time                      { return time.Now().In(ubLoc()) }
func parseDate(s string) (time.Time, error) { return time.ParseInLocation("2006-01-02", s, ubLoc()) }

func dateRange(c fiber.Ctx) (from, to time.Time, ok bool) {
	fq, tq := c.Query("from"), c.Query("to")
	if fq == "" || tq == "" {
		return time.Time{}, time.Time{}, false
	}
	f, err := parseDate(fq)
	if err != nil {
		return time.Time{}, time.Time{}, false
	}
	t, err := parseDate(tq)
	if err != nil {
		return time.Time{}, time.Time{}, false
	}
	return f, t, true
}

func bad(c fiber.Ctx, msg string) error {
	return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": msg})
}
func notFound(c fiber.Ctx) error {
	return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "not found"})
}
func fail(c fiber.Ctx) error {
	return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "internal error"})
}
