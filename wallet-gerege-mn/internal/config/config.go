// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Package config нь wallet.gerege.mn service-ийн (auth-аас салгасан wallet
// микросервис) тохиргоог зөвхөн environment variable-ээс уншина. Энэ нь auth-
// ийн бүрэн config-ийн wallet-д хамаатай дэд хэсэг.
package config

import (
	"errors"
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

// Config нь wallet service-ийн ажиллах тохиргоо.
type Config struct {
	Port        int    `mapstructure:"PORT"`
	Environment string `mapstructure:"ENVIRONMENT"`
	Debug       bool   `mapstructure:"DEBUG"`

	// DBAppURL — app_user (least-priv, RLS FORCE) DSN. API энэ холболтоор иргэн/
	// байгууллагын хэтэвчийг RLS-ийн дор уншиж/бичнэ (subject app.subject-ээр).
	DBAppURL string `mapstructure:"DB_APP_URL"`
	// DBAdminURL — admin_identity/superuser DSN. Worker (reconcile/snapshot/
	// holdexpiry) энэ холболтоор SECURITY DEFINER функцүүдийг дуудна.
	DBAdminURL string `mapstructure:"DB_POSTGRE_URL"`

	DBMaxOpenConns    int `mapstructure:"DB_MAX_OPEN_CONNS"`
	DBMaxIdleConns    int `mapstructure:"DB_MAX_IDLE_CONNS"`
	DBConnMaxLifeMins int `mapstructure:"DB_CONN_MAX_LIFE_MINS"`

	// JWT — wallet.gerege.mn нь ӨӨРИЙН HS256 access токен гаргаж/шалгана (биe
	// даасан; auth-аас хамаарахгүй). JWT_SECRET нь wallet-ийн өөрийн signing
	// secret; JWT_ISSUER default "wallet.gerege.mn". client_credentials-ээр
	// гаргасан токен энэ secret/issuer-ээр баталгаажна.
	JWTSecret         string `mapstructure:"JWT_SECRET"`
	JWTIssuer         string `mapstructure:"JWT_ISSUER"`
	JWTExpired        int    `mapstructure:"JWT_EXPIRED"`
	JWTRefreshExpired int    `mapstructure:"JWT_REFRESH_EXPIRED"`

	// BcryptCost — client_secret hash-ийн bcrypt cost (0 → DefaultCost).
	BcryptCost int `mapstructure:"BCRYPT_COST"`

	// auth.gerege.mn-ийн хэрэглэгчийн токеныг ЧУ хүлээн авах (иргэн me.gerege.mn-
	// ээр нэвтэрч wallet-д хандана). AUTH_JWT_SECRET нь auth-тай хуваалцсан HS256
	// secret; AUTH_JWT_ISSUER default "auth.gerege.mn". Хоосон бол зөвхөн wallet-
	// ийн client_credentials токеныг хүлээн авна.
	AuthJWTSecret string `mapstructure:"AUTH_JWT_SECRET"`
	AuthJWTIssuer string `mapstructure:"AUTH_JWT_ISSUER"`
	// QRSigningSeed нь QR гарын үсгийн (Ed25519) тусдаа key seed. Хоосон бол
	// JWT_SECRET-ээс domain-separated деривацлана (auth secret-ээс тусдаа material).
	QRSigningSeed string `mapstructure:"QR_SIGNING_SEED"`

	// Wallet IBAN — account_no-оос бүтэн IBAN тооцоолоход (country+bankCode).
	WalletIBANCountry  string `mapstructure:"WALLET_IBAN_COUNTRY"`
	WalletIBANBankCode string `mapstructure:"WALLET_IBAN_BANK_CODE"`

	// WalletGatewayHMACSecret — банкны gateway top-up webhook-ийн HMAC. Хоосон
	// бол webhook бүртгэгдэхгүй (fail-closed).
	WalletGatewayHMACSecret string `mapstructure:"WALLET_GATEWAY_HMAC_SECRET"`

	// Observability — OTel tracing exporter (stdout|otlp|"" off) + sample ratio.
	OTelExporter    string  `mapstructure:"OTEL_EXPORTER"`
	OTelSampleRatio float64 `mapstructure:"OTEL_SAMPLE_RATIO"`

	// Redis — auth-тай хуваалцсан (token revocation denylist `pwd_cutoff:<sub>`-ийг
	// унших). Хоосон бол revocation шалгахгүй (зөвхөн гарын үсэг + exp).
	RedisHost     string `mapstructure:"REDIS_HOST"`
	RedisPassword string `mapstructure:"REDIS_PASS"`

	// AlertWebhookURL — worker нь reconcile зөрүү / job алдаа гарвал энд JSON
	// POST хийнэ (Slack/Mattermost/PagerDuty webhook). Хоосон бол зөвхөн лог.
	AlertWebhookURL string `mapstructure:"ALERT_WEBHOOK_URL"`
}

// AppConfig нь глобал тохиргоо (InitializeAppConfig-ийн дараа бэлэн).
var AppConfig Config

// InitializeAppConfig нь env (.env эсвэл орчны хувьсагч)-ээс тохиргоог ачаална.
func InitializeAppConfig() error {
	viper.SetConfigName(".env")
	viper.SetConfigType("env")
	viper.AddConfigPath(".")
	viper.AddConfigPath("/app")
	viper.AllowEmptyEnv(true)
	viper.AutomaticEnv()

	// AutomaticEnv нь зөвхөн Get()-д ажилладаг; Unmarshal-д key бүрийг тодорхой
	// BindEnv хийх ёстой — ингэснээр .env файлгүйгээр (compose env_file = container
	// env) орчны хувьсагчаас уншина.
	for _, k := range []string{
		"PORT", "ENVIRONMENT", "DEBUG",
		"DB_APP_URL", "DB_POSTGRE_URL", "DB_MAX_OPEN_CONNS", "DB_MAX_IDLE_CONNS", "DB_CONN_MAX_LIFE_MINS",
		"JWT_SECRET", "JWT_ISSUER", "JWT_EXPIRED", "JWT_REFRESH_EXPIRED", "BCRYPT_COST",
		"AUTH_JWT_SECRET", "AUTH_JWT_ISSUER", // Phase 13 dual-issuer: auth-аар олгогдсон HS256 токенуудыг хүлээж авна.
		"QR_SIGNING_SEED",
		"WALLET_IBAN_COUNTRY", "WALLET_IBAN_BANK_CODE", "WALLET_GATEWAY_HMAC_SECRET",
		"OTEL_EXPORTER", "OTEL_SAMPLE_RATIO", "REDIS_HOST", "REDIS_PASS", "ALERT_WEBHOOK_URL",
	} {
		_ = viper.BindEnv(k)
	}

	if err := viper.ReadInConfig(); err != nil {
		var notFound viper.ConfigFileNotFoundError
		if !errors.As(err, &notFound) {
			return fmt.Errorf("read config: %w", err)
		}
	}
	if err := viper.Unmarshal(&AppConfig); err != nil {
		return fmt.Errorf("unmarshal config: %w", err)
	}
	applyDefaults()

	if AppConfig.Port == 0 || AppConfig.JWTSecret == "" || AppConfig.DBAppURL == "" {
		return errors.New("PORT, JWT_SECRET, DB_APP_URL are required")
	}
	if len(AppConfig.JWTSecret) < 32 {
		return fmt.Errorf("JWT_SECRET must be ≥ 32 chars (got %d)", len(AppConfig.JWTSecret))
	}
	if AppConfig.Environment != "development" && AppConfig.Environment != "production" {
		return fmt.Errorf("ENVIRONMENT must be 'development' or 'production', got %q", AppConfig.Environment)
	}
	// H6: production-д DB холболт заавал verified TLS байх ёстой (бусад апптай нэг
	// адил) — sslmode=disable/require хүлээж авахгүй.
	if AppConfig.Environment == "production" {
		for label, dsn := range map[string]string{"DB_APP_URL": AppConfig.DBAppURL, "DB_POSTGRE_URL": AppConfig.DBAdminURL} {
			if dsn == "" {
				continue
			}
			if m := sslModeOf(dsn); m != "verify-full" && m != "verify-ca" {
				return fmt.Errorf("production %s must use sslmode=verify-full|verify-ca, got %q", label, m)
			}
		}
	}
	return nil
}

// sslModeOf нь DSN-ээс sslmode параметрийг гаргана (байхгүй бол "disable").
func sslModeOf(dsn string) string {
	for _, part := range strings.FieldsFunc(dsn, func(r rune) bool { return r == '?' || r == '&' }) {
		if v, ok := strings.CutPrefix(part, "sslmode="); ok {
			return v
		}
	}
	return "disable"
}

func applyDefaults() {
	if AppConfig.Port == 0 {
		AppConfig.Port = 8080
	}
	if AppConfig.Environment == "" {
		AppConfig.Environment = "development"
	}
	if AppConfig.DBMaxOpenConns == 0 {
		// M11: олон service нэг Postgres-д холбогддог (Σpool < max_connections байх)
		// тул default-ийг 25-аас 15 болгов. Production-д env-ээр тааруулна / PgBouncer.
		AppConfig.DBMaxOpenConns = 15
	}
	if AppConfig.DBMaxIdleConns == 0 {
		AppConfig.DBMaxIdleConns = 5
	}
	if AppConfig.DBConnMaxLifeMins == 0 {
		AppConfig.DBConnMaxLifeMins = 15
	}
	if AppConfig.JWTExpired == 0 {
		AppConfig.JWTExpired = 1
	}
	if AppConfig.JWTRefreshExpired == 0 {
		AppConfig.JWTRefreshExpired = 7
	}
	if AppConfig.WalletIBANCountry == "" {
		AppConfig.WalletIBANCountry = "MN"
	}
	if AppConfig.JWTIssuer == "" {
		AppConfig.JWTIssuer = "wallet.gerege.mn"
	}
	if AppConfig.AuthJWTIssuer == "" {
		AppConfig.AuthJWTIssuer = "auth.gerege.mn"
	}
	if AppConfig.OTelSampleRatio == 0 && AppConfig.OTelExporter != "" {
		AppConfig.OTelSampleRatio = 1.0
	}
	// search_path-ыг DSN-д баталгаажуулна (gerege_platform schema).
	AppConfig.DBAppURL = ensureSearchPath(AppConfig.DBAppURL)
	AppConfig.DBAdminURL = ensureSearchPath(AppConfig.DBAdminURL)
}

func ensureSearchPath(dsn string) string {
	if dsn == "" || strings.Contains(dsn, "search_path") {
		return dsn
	}
	sep := "?"
	if strings.Contains(dsn, "?") {
		sep = "&"
	}
	return dsn + sep + "search_path=gerege_platform,public"
}
