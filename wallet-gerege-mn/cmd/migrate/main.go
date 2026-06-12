// Package main is the goose-based migration runner for the gerege_platform DB.
//
// Usage:
//
//	/app/migrate up                  -- бүх migration-г apply
//	/app/migrate up-to <N>           -- N хүртэл apply
//	/app/migrate down                -- сүүлийн migration-г reverse
//	/app/migrate down-to <N>         -- N хүртэл reverse
//	/app/migrate status              -- одоогийн state
//	/app/migrate version             -- одоогийн version
//	/app/migrate create <name> sql   -- шинэ migration файл үүсгэ (dev)
//
// Хэрэглэдэг ENV хувьсагчид (.env эсвэл container env):
//
//	DB_POSTGRE_URL  — superuser connection string (CREATE ROLE/SCHEMA шаардана)
//	MIGRATIONS_DIR  — default "/app/migrations"
//
// Goose state table: public.goose_db_version (default).
package main

import (
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"os"

	_ "github.com/lib/pq"
	"github.com/pressly/goose/v3"
	"github.com/spf13/viper"
)

func main() {
	flag.Parse()
	args := flag.Args()
	if len(args) < 1 {
		fmt.Fprintln(os.Stderr, "usage: migrate <command> [args]")
		fmt.Fprintln(os.Stderr, "commands: up, up-to <N>, down, down-to <N>, status, version, create <name> sql")
		os.Exit(2)
	}

	dsn, err := loadDSN()
	if err != nil {
		exitf("config: %v", err)
	}

	dir := os.Getenv("MIGRATIONS_DIR")
	if dir == "" {
		dir = "/app/migrations"
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		exitf("sql.Open: %v", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		exitf("db.Ping: %v", err)
	}

	if err := goose.SetDialect("postgres"); err != nil {
		exitf("goose.SetDialect: %v", err)
	}

	cmd := args[0]
	cmdArgs := args[1:]
	if err := goose.Run(cmd, db, dir, cmdArgs...); err != nil {
		exitf("goose %s: %v", cmd, err)
	}
}

// loadDSN reads DB_POSTGRE_URL from viper (.env file at /app or env). Mirrors
// the api's config loader so the same backend.env feeds both binaries.
func loadDSN() (string, error) {
	viper.SetConfigName(".env")
	viper.SetConfigType("env")
	viper.AddConfigPath(".")
	viper.AddConfigPath("/app")
	viper.AutomaticEnv()
	if err := viper.ReadInConfig(); err != nil {
		var nf viper.ConfigFileNotFoundError
		if !errors.As(err, &nf) {
			return "", fmt.Errorf("viper read: %w", err)
		}
	}
	dsn := viper.GetString("DB_POSTGRE_URL")
	if dsn == "" {
		return "", errors.New("DB_POSTGRE_URL is required")
	}
	return dsn, nil
}

func exitf(format string, a ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", a...)
	os.Exit(1)
}
