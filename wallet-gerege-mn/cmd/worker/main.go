// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// wallet.gerege.mn worker — урт ажиллах фон процесс (in-process scheduler).
// Гадны cron шаардахгүй: дотроо хуваариар wallet ledger-ийн арчилгааны
// ажлуудыг гүйцэтгэнэ:
//
//	reconcile  — ledger бүрэн бүтэн байдал, цаг тутам (зөрүү гарвал ERROR лог)
//	holdexpiry — expires_at өнгөрсөн барьцааг чөлөөлнө, 15 минут тутам
//	snapshot   — өчигдрийн (UB) өдрийн snapshot, өдөр бүр 00:30 (UB)
//
// admin_identity/superuser DSN (DB_POSTGRE_URL)-ээр SECURITY DEFINER функцүүдийг
// дуудна. SIGINT/SIGTERM-д гялсхийн зогсоно.
package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"hash/fnv"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"sync/atomic"
	"syscall"
	"time"

	"eidtemplate/internal/config"
	"eidtemplate/internal/datasources/drivers"
	walletpostgres "eidtemplate/internal/datasources/repositories/postgres/wallet"
)

const tzUB = "Asia/Ulaanbaatar"

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	if err := config.InitializeAppConfig(); err != nil {
		log.Error("config", "error", err)
		os.Exit(1)
	}
	if config.AppConfig.DBAdminURL == "" {
		log.Error("DB_POSTGRE_URL (admin/superuser) is required for the worker")
		os.Exit(1)
	}
	db, err := drivers.OpenGorm(config.AppConfig.DBAdminURL)
	if err != nil {
		log.Error("db (admin)", "error", err)
		os.Exit(1)
	}
	repo := walletpostgres.NewRepository(db)

	// HA: pg_try_advisory_lock-оор cross-process exclusion. Олон replica
	// зэрэг ажиллавал зөвхөн нэг нь cron job-ийг гүйцэтгэх. Lock тус бүрд
	// тогтмол int64 түлхүүр (FNV(job name)).
	sqlDB, err := db.DB()
	if err != nil {
		log.Error("db.DB()", "error", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Ажлууд — нэр + гүйцэтгэгч (panic-recovery, лог дотор).
	reconcile := func(ctx context.Context) {
		disc, err := repo.Reconcile(ctx)
		if err != nil {
			log.Error("reconcile failed", "error", err)
			alert(ctx, log, "⚠️ wallet reconcile QUERY FAILED: "+err.Error())
			return
		}
		if len(disc) == 0 {
			log.Info("reconcile OK — no discrepancies")
			return
		}
		for _, d := range disc {
			log.Error("reconcile discrepancy", "check", d.CheckType, "ref", d.Ref,
				"expected_minor", d.ExpectedMinor, "actual_minor", d.ActualMinor)
		}
		log.Error("reconcile FAILED", "discrepancies", len(disc))
		alert(ctx, log, "🚨 wallet ledger RECONCILE DISCREPANCY: "+strconv.Itoa(len(disc))+" row(s) — шалгана уу (гар аргаар, ledger UPDATE хийхгүй).")
	}
	holdexpiry := func(ctx context.Context) {
		n, err := repo.ExpireHolds(ctx)
		if err != nil {
			log.Error("holdexpiry failed", "error", err)
			alert(ctx, log, "⚠️ wallet holdexpiry FAILED: "+err.Error())
			return
		}
		log.Info("holds expired", "released", n)
	}
	snapshot := func(ctx context.Context) {
		date := time.Now().In(ubLoc()).AddDate(0, 0, -1) // өчигдөр (UB)
		n, err := repo.Snapshot(ctx, date)
		if err != nil {
			log.Error("snapshot failed", "date", date.Format("2006-01-02"), "error", err)
			alert(ctx, log, "⚠️ wallet snapshot FAILED ("+date.Format("2006-01-02")+"): "+err.Error())
			return
		}
		log.Info("daily snapshot written", "date", date.Format("2006-01-02"), "rows", n)
	}

	webhooks := func(ctx context.Context) { deliverWebhooks(ctx, repo, log) }

	// HA-guard: pg_try_advisory_lock-оор олон replica дунд singleton болгоно.
	reconcileLocked := withAdvisoryLock(sqlDB, log, "reconcile", reconcile)
	holdexpiryLocked := withAdvisoryLock(sqlDB, log, "holdexpiry", holdexpiry)
	snapshotLocked := withAdvisoryLock(sqlDB, log, "snapshot", snapshot)
	webhooksLocked := withAdvisoryLock(sqlDB, log, "webhooks", webhooks)

	// Эхлэхэд нэг удаа гүйцэтгэнэ (catch-up).
	log.Info("wallet worker started — running startup pass")
	safe(log, "reconcile", reconcileLocked, ctx)
	safe(log, "holdexpiry", holdexpiryLocked, ctx)
	safe(log, "snapshot", snapshotLocked, ctx)

	// Хуваарь.
	go interval(ctx, log, time.Hour, "reconcile", reconcileLocked)
	go interval(ctx, log, 15*time.Minute, "holdexpiry", holdexpiryLocked)
	go dailyAt(ctx, log, 0, 30, "snapshot", snapshotLocked) // 00:30 UB
	go interval(ctx, log, 20*time.Second, "webhooks", webhooksLocked)

	<-ctx.Done()
	log.Info("wallet worker shutting down")
}

// withAdvisoryLock нь fn-ийг pg_try_advisory_lock-аар хамгаалсан wrapper буцаана.
// Хэрэв lock авч чадахгүй бол (өөр replica гүйцэтгэж байгаа) ажлыг алгасна.
// Lock нь session-level — холболтын насанд хүчинтэй. Тиймээс ажил тус бүрт
// dedicated conn авч барина (defer Release-аар чөлөөлнө).
func withAdvisoryLock(db *sql.DB, log *slog.Logger, name string, fn func(context.Context)) func(context.Context) {
	h := fnv.New64a()
	_, _ = h.Write([]byte("wallet-worker:" + name))
	key := int64(h.Sum64()) // #nosec G115 — advisory-lock key (FNV64), signed wrap аюулгүй
	return func(ctx context.Context) {
		conn, err := db.Conn(ctx)
		if err != nil {
			log.Error("advisory lock: conn acquire failed", "job", name, "error", err)
			return
		}
		defer conn.Close()
		var acquired bool
		if err := conn.QueryRowContext(ctx, "SELECT pg_try_advisory_lock($1)", key).Scan(&acquired); err != nil {
			log.Error("advisory lock: try failed", "job", name, "error", err)
			return
		}
		if !acquired {
			log.Info("advisory lock held by another replica — skipping", "job", name)
			return
		}
		defer func() {
			if _, err := conn.ExecContext(context.Background(), "SELECT pg_advisory_unlock($1)", key); err != nil {
				log.Warn("advisory lock: release failed (session close will free it)", "job", name, "error", err)
			}
		}()
		fn(ctx)
	}
}

// safe нь ажлыг panic-recovery-тэйгээр гүйцэтгэнэ.
// jobTimeout нь M10 — нэг ажил хэт удвал тасална (давхцлаас сэргийлнэ).
const jobTimeout = 30 * time.Minute

// safe нь ажлыг panic-recovery + per-run timeout-тойгоор гүйцэтгэнэ (M10).
func safe(log *slog.Logger, name string, fn func(context.Context), ctx context.Context) {
	defer func() {
		if r := recover(); r != nil {
			log.Error("job panicked", "job", name, "panic", r)
		}
	}()
	cctx, cancel := context.WithTimeout(ctx, jobTimeout)
	defer cancel()
	fn(cctx)
}

// interval нь ажлыг d тутамд гүйцэтгэнэ (ctx цуцлагдтал).
// interval нь ажлыг d тутамд гүйцэтгэнэ. Overlap guard (M10): өмнөх ажил
// дуусаагүй бол tick-ийг алгасна (давхар full-ledger ажиллахаас сэргийлнэ).
func interval(ctx context.Context, log *slog.Logger, d time.Duration, name string, fn func(context.Context)) {
	t := time.NewTicker(d)
	defer t.Stop()
	var running atomic.Bool
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if !running.CompareAndSwap(false, true) {
				log.Warn("job still running — skipping tick", "job", name)
				continue
			}
			go func() {
				defer running.Store(false)
				safe(log, name, fn, ctx)
			}()
		}
	}
}

// dailyAt нь ажлыг өдөр бүр UB цагийн hh:mm-д гүйцэтгэнэ.
func dailyAt(ctx context.Context, log *slog.Logger, hh, mm int, name string, fn func(context.Context)) {
	for {
		d := untilNext(hh, mm)
		select {
		case <-ctx.Done():
			return
		case <-time.After(d):
			safe(log, name, fn, ctx)
		}
	}
}

// untilNext нь UB цагийн дараагийн hh:mm хүртэлх хугацааг буцаана.
func untilNext(hh, mm int) time.Duration {
	loc := ubLoc()
	now := time.Now().In(loc)
	next := time.Date(now.Year(), now.Month(), now.Day(), hh, mm, 0, 0, loc)
	if !next.After(now) {
		next = next.AddDate(0, 0, 1)
	}
	return next.Sub(now)
}

func ubLoc() *time.Location {
	loc, err := time.LoadLocation(tzUB)
	if err != nil {
		return time.UTC
	}
	return loc
}

// alert нь ALERT_WEBHOOK_URL тохируулсан бол {"text": msg} JSON POST хийнэ
// (Slack/Mattermost маягтай). Тохируулаагүй бол зөвхөн лог. Бүтэлгүйтлийг
// залгина — alert амжилтгүй болсон нь worker-ийг унагаахгүй.
func alert(ctx context.Context, log *slog.Logger, msg string) {
	url := config.AppConfig.AlertWebhookURL
	if url == "" {
		return
	}
	body, _ := json.Marshal(map[string]string{"text": msg})
	cctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(cctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		log.Warn("alert build failed", "error", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Warn("alert post failed", "error", err)
		return
	}
	_ = resp.Body.Close()
}
