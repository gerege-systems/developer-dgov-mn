// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// wallet.gerege.mn API entrypoint — иргэн/байгууллагын хэтэвчийн HTTP API +
// банкны gateway top-up webhook. ENV-ээс тохиргоо (config). Worker нь тусдаа
// binary (cmd/worker).
package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"eidtemplate/cmd/api/server"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	app, err := server.New(log)
	if err != nil {
		log.Error("startup failed", "error", err)
		os.Exit(1)
	}

	// Гялсхийн зогсолт — SIGINT/SIGTERM ирэхэд сонсголтыг хаана.
	go func() {
		stop := make(chan os.Signal, 1)
		signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
		<-stop
		log.Info("shutting down…")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := app.Shutdown(ctx); err != nil {
			log.Error("shutdown error", "error", err)
		}
	}()

	if err := app.Run(); err != nil {
		log.Error("server stopped", "error", err)
		os.Exit(1)
	}
}
