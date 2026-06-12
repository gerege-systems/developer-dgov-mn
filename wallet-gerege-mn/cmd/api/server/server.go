// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Package server нь wallet.gerege.mn API service-ийн Fiber серверийг угсарна:
// иргэн/байгууллагын хэтэвчийн /api/v1/wallet/* + /api/v1/org/:orgId/wallet/*
// (app_user RLS холболтоор, Bearer JWT-ээр) болон банкны gateway top-up webhook
// (/webhooks/bank/topup, HMAC). Worker (cron) тусдаа binary — cmd/worker.
package server

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	apidocs "eidtemplate/docs"
	"eidtemplate/internal/business/usecases/oauth"
	"eidtemplate/internal/business/usecases/payments"
	"eidtemplate/internal/business/usecases/wallet"
	"eidtemplate/internal/config"
	"eidtemplate/internal/datasources/drivers"
	walletpostgres "eidtemplate/internal/datasources/repositories/postgres/wallet"
	oauthapi "eidtemplate/internal/http/handlers/oauthapi"
	paymentsapi "eidtemplate/internal/http/handlers/v1/paymentsapi"
	walletapi "eidtemplate/internal/http/handlers/v1/walletapi"
	"eidtemplate/internal/http/middlewares"
	"eidtemplate/pkg/jwt"
	"eidtemplate/pkg/observability"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/adaptor"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"golang.org/x/time/rate"
)

// App нь сервер + амьдралын мөчлөгийг агуулна.
type App struct {
	fiber       *fiber.App
	log         *slog.Logger
	rateLimiter *middlewares.RateLimiter
	tracerStop  observability.Shutdown
}

// New нь тохиргоог ачаалж, DB холбож, observability + route-уудыг угсарна.
func New(log *slog.Logger) (*App, error) {
	if err := config.InitializeAppConfig(); err != nil {
		return nil, fmt.Errorf("config: %w", err)
	}

	tracerStop, err := observability.SetupTracing(context.Background(), observability.TracingConfig{
		ServiceName: "wallet-gerege-mn",
		Environment: config.AppConfig.Environment,
		Exporter:    config.AppConfig.OTelExporter,
		SampleRatio: config.AppConfig.OTelSampleRatio,
	})
	if err != nil {
		return nil, fmt.Errorf("tracing: %w", err)
	}

	// API нь app_user (RLS) холболтоор хэтэвчид хандана.
	db, err := drivers.OpenGorm(config.AppConfig.DBAppURL)
	if err != nil {
		return nil, fmt.Errorf("db (app_user): %w", err)
	}
	observability.RegisterDBStatsProvider(func() *sql.DB {
		sqlDB, dbErr := db.DB()
		if dbErr != nil {
			return nil
		}
		return sqlDB
	})

	// Wallet-ийн ӨӨРИЙН JWT service — client_credentials токен гаргаж шалгана.
	walletJWT := jwt.NewJWTServiceWithRefresh(
		config.AppConfig.JWTSecret, config.AppConfig.JWTIssuer,
		config.AppConfig.JWTExpired, config.AppConfig.JWTRefreshExpired,
	)
	// Verifiers: wallet-ийн токен + (тохируулсан бол) auth.gerege.mn-ийн
	// хэрэглэгчийн токен (иргэн me-ээр нэвтэрч wallet-д хандана).
	verifiers := []jwt.JWTService{walletJWT}
	if config.AppConfig.AuthJWTSecret != "" {
		verifiers = append(verifiers, jwt.NewJWTServiceWithRefresh(
			config.AppConfig.AuthJWTSecret, config.AppConfig.AuthJWTIssuer,
			config.AppConfig.JWTExpired, config.AppConfig.JWTRefreshExpired,
		))
		log.Info("auth.gerege.mn user tokens accepted", "issuer", config.AppConfig.AuthJWTIssuer)
	}
	// Redis (сонголтоор) — token revocation denylist. Хоосон бол алгасна.
	redisClient := drivers.OpenRedis(config.AppConfig.RedisHost, config.AppConfig.RedisPassword)
	authMiddleware := middlewares.NewAuthMiddleware(verifiers, redisClient)

	repo := walletpostgres.NewRepository(db)
	uc := wallet.NewUsecase(repo)
	walletHandler := walletapi.NewHandler(uc, config.AppConfig.WalletIBANCountry, config.AppConfig.WalletIBANBankCode)
	// OAuth2 client_credentials — бусад систем client_id/secret-ээр wallet токен авна.
	oauthUC := oauth.NewUsecase(repo, walletJWT, config.AppConfig.JWTExpired*3600)
	oauthHandler := oauthapi.NewHandler(oauthUC)
	// QR төлбөр / нэхэмжлэх — QR token-ийг wallet-ийн JWT secret-ээр гарын үсэглэнэ.
	paymentsUC := payments.NewUsecase(repo, config.AppConfig.JWTSecret, config.AppConfig.QRSigningSeed, config.AppConfig.JWTIssuer, "Gerege Wallet")
	paymentsHandler := paymentsapi.NewHandler(paymentsUC)

	app := fiber.New(fiber.Config{AppName: "wallet.gerege.mn"})
	app.Use(middlewares.RequestIDMiddleware())
	app.Use(middlewares.AccessLogMiddleware())

	// Infra endpoint-ууд (auth шаардахгүй).
	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "wallet"})
	})
	app.Get("/ready", readyHandler(db))
	app.Get("/metrics", adaptor.HTTPHandler(promhttp.Handler()))
	app.Get("/openapi.yaml", func(c fiber.Ctx) error {
		c.Set("Content-Type", "application/yaml")
		return c.Send(apidocs.OpenAPISpec)
	})

	// OAuth2 token endpoint — client_credentials. Rate-limit (secret brute-force).
	tokenRL := middlewares.NewRateLimiter(rate.Limit(20.0/60.0), 10)
	app.Post("/oauth/token", tokenRL.Middleware(), oauthHandler.Token)

	// Мөнгөний endpoint-д per-IP rate limit (минутанд 60, burst 20).
	rl := middlewares.NewRateLimiter(rate.Limit(60.0/60.0), 20)

	// /api/v1: rate limit → audit (append-only api_audit_logs) → per-route auth.
	v1 := app.Group("/api/v1", rl.Middleware(), middlewares.AuditMiddleware(db, log))
	walletHandler.Register(v1, authMiddleware)
	paymentsHandler.Register(v1, authMiddleware)

	// Банкны corporate gateway top-up webhook (HMAC, Bearer биш). Secret
	// тохируулаагүй бол бүртгэхгүй (fail-closed).
	if config.AppConfig.WalletGatewayHMACSecret != "" {
		// M2: webhook-ийг ч rate limit-д оруулна (per-IP 600/min — gateway нэг IP).
		whRL := middlewares.NewRateLimiter(rate.Limit(600.0/60.0), 100)
		bankGW := app.Group("/webhooks/bank", whRL.Middleware(), middlewares.NewHMACMiddleware(config.AppConfig.WalletGatewayHMACSecret, redisClient))
		bankGW.Post("/topup", walletHandler.GatewayTopup)
		log.Info("bank-gateway top-up webhook enabled")
	} else {
		log.Info("bank-gateway webhook disabled (set WALLET_GATEWAY_HMAC_SECRET to enable)")
	}

	return &App{fiber: app, log: log, rateLimiter: rl, tracerStop: tracerStop}, nil
}

// readyHandler нь DB ping-ээр бэлэн байдлыг шалгана.
func readyHandler(db interface{ DB() (*sql.DB, error) }) fiber.Handler {
	return func(c fiber.Ctx) error {
		ctx, cancel := context.WithTimeout(c.Context(), 3*time.Second)
		defer cancel()
		sqlDB, err := db.DB()
		if err == nil {
			err = sqlDB.PingContext(ctx)
		}
		if err != nil {
			return c.Status(http.StatusServiceUnavailable).JSON(fiber.Map{"ready": false, "db": "ping_failed"})
		}
		return c.JSON(fiber.Map{"ready": true})
	}
}

// Run нь серверийг сонсож эхэлнэ (blocking).
func (a *App) Run() error {
	addr := fmt.Sprintf(":%d", config.AppConfig.Port)
	a.log.Info("wallet API listening", "addr", addr, "env", config.AppConfig.Environment)
	return a.fiber.Listen(addr)
}

// Shutdown нь серверийг гялсхийн зогсооно.
func (a *App) Shutdown(ctx context.Context) error {
	if a.rateLimiter != nil {
		a.rateLimiter.Stop()
	}
	if a.tracerStop != nil {
		_ = a.tracerStop(ctx)
	}
	return a.fiber.ShutdownWithContext(ctx)
}
