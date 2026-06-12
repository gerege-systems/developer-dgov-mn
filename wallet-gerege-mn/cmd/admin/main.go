// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// wallet.gerege.mn super-admin API entrypoint (тусдаа service). Admin frontend
// энэ рүү хандана. ENV нь /app/api-тай ижил (.env); зөвхөн DB_POSTGRE_URL
// (superuser) ашиглана.
package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"eidtemplate/cmd/admin/server"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	app, err := server.New(log)
	if err != nil {
		log.Error("admin startup failed", "error", err)
		os.Exit(1)
	}

	go func() {
		stop := make(chan os.Signal, 1)
		signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
		<-stop
		log.Info("admin shutting down…")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := app.Shutdown(ctx); err != nil {
			log.Error("shutdown error", "error", err)
		}
	}()

	if err := app.Run(); err != nil {
		log.Error("admin server stopped", "error", err)
		os.Exit(1)
	}
}
