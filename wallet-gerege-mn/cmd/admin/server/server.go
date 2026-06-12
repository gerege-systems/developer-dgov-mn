// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Package server нь wallet.gerege.mn-ийн super-admin API service (тусдаа binary).
// admin username/password-аар нэвтэрч client/account/fee-rule удирдлага, тайлан,
// reconcile, audit хийнэ. Superuser DSN (DB_POSTGRE_URL)-ээр RLS тойрно.
package server

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"eidtemplate/internal/config"
	"eidtemplate/internal/datasources/drivers"
	walletpostgres "eidtemplate/internal/datasources/repositories/postgres/wallet"
	adminapi "eidtemplate/internal/http/handlers/adminapi"
	"eidtemplate/internal/http/middlewares"
	"eidtemplate/pkg/jwt"

	"github.com/gofiber/fiber/v3"
	"golang.org/x/time/rate"
)

// App нь admin сервер.
type App struct {
	fiber       *fiber.App
	log         *slog.Logger
	rateLimiter *middlewares.RateLimiter
}

// New нь admin API серверийг угсарна.
func New(log *slog.Logger) (*App, error) {
	if err := config.InitializeAppConfig(); err != nil {
		return nil, fmt.Errorf("config: %w", err)
	}
	if config.AppConfig.DBAdminURL == "" {
		return nil, fmt.Errorf("DB_POSTGRE_URL (superuser) is required for the admin API")
	}
	db, err := drivers.OpenGorm(config.AppConfig.DBAdminURL)
	if err != nil {
		return nil, fmt.Errorf("db (admin): %w", err)
	}
	jwtService := jwt.NewJWTServiceWithRefresh(
		config.AppConfig.JWTSecret, config.AppConfig.JWTIssuer,
		config.AppConfig.JWTExpired, config.AppConfig.JWTRefreshExpired,
	)
	repo := walletpostgres.NewRepository(db)
	handler := adminapi.NewHandler(repo, jwtService)
	adminMW := middlewares.NewAdminMiddleware(jwtService)

	app := fiber.New(fiber.Config{AppName: "wallet.gerege.mn/admin"})
	app.Use(middlewares.RequestIDMiddleware())
	app.Use(middlewares.AccessLogMiddleware())

	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "wallet-admin"})
	})
	app.Get("/ready", readyHandler(db))

	// Login нь rate-limit-тэй (нууц үг brute-force).
	rl := middlewares.NewRateLimiter(rate.Limit(20.0/60.0), 10)
	app.Use("/admin/auth/login", rl.Middleware())

	handler.Register(app, adminMW)
	return &App{fiber: app, log: log, rateLimiter: rl}, nil
}

func readyHandler(db interface{ DB() (*sql.DB, error) }) fiber.Handler {
	return func(c fiber.Ctx) error {
		ctx, cancel := context.WithTimeout(c.Context(), 3*time.Second)
		defer cancel()
		sqlDB, err := db.DB()
		if err == nil {
			err = sqlDB.PingContext(ctx)
		}
		if err != nil {
			return c.Status(http.StatusServiceUnavailable).JSON(fiber.Map{"ready": false})
		}
		return c.JSON(fiber.Map{"ready": true})
	}
}

// Run нь admin серверийг сонсож эхэлнэ.
func (a *App) Run() error {
	addr := fmt.Sprintf(":%d", config.AppConfig.Port)
	a.log.Info("wallet ADMIN API listening", "addr", addr, "env", config.AppConfig.Environment)
	return a.fiber.Listen(addr)
}

// Shutdown нь серверийг гялсхийн зогсооно.
func (a *App) Shutdown(ctx context.Context) error {
	if a.rateLimiter != nil {
		a.rateLimiter.Stop()
	}
	return a.fiber.ShutdownWithContext(ctx)
}
