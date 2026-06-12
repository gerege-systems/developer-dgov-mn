// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// wallet.gerege.mn — client_credentials үүсгэх CLI. Шинэ client_id + санамсаргүй
// client_secret үүсгэж, secret-ийг bcrypt-ээр hash-лаж wallet_client-д бичнэ.
// client_secret-ийг НЭГ Л УДАА хэвлэнэ (дахин харуулахгүй).
//
// Usage:
//
//	/app/client create <client_id> "<name>"
//
// ENV: DB_POSTGRE_URL — superuser/admin DSN (wallet_client-д INSERT эрхтэй).
package main

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"strings"

	"eidtemplate/pkg/helpers"

	"github.com/spf13/viper"
	gormpostgres "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	if len(os.Args) < 2 {
		usage()
	}
	db := connect()
	switch os.Args[1] {
	case "create": // client create <client_id> "<name>"
		if len(os.Args) < 4 {
			usage()
		}
		createClient(db, os.Args[2], os.Args[3])
	case "admin": // admin <username> ["<name>"]
		if len(os.Args) < 3 {
			usage()
		}
		name := ""
		if len(os.Args) > 3 {
			name = os.Args[3]
		}
		createAdmin(db, os.Args[2], name)
	default:
		usage()
	}
}

func usage() {
	fmt.Fprintln(os.Stderr, `usage:
  client create <client_id> "<name>"   # OAuth2 client (client_credentials)
  client admin  <username> ["<name>"]  # super-admin (admin API)`)
	os.Exit(2)
}

func connect() *gorm.DB {
	dsn, err := loadDSN()
	if err != nil {
		fmt.Fprintln(os.Stderr, "config:", err)
		os.Exit(2)
	}
	db, err := gorm.Open(gormpostgres.Open(dsn), &gorm.Config{})
	if err != nil {
		fmt.Fprintln(os.Stderr, "connect:", err)
		os.Exit(2)
	}
	return db
}

func createClient(db *gorm.DB, clientID, name string) {
	secret := mustSecret()
	hash := mustHash(secret)
	if err := db.Exec(
		"INSERT INTO wallet_client (client_id, secret_hash, name) VALUES (?, ?, ?)",
		clientID, hash, name,
	).Error; err != nil {
		fmt.Fprintln(os.Stderr, "insert:", err)
		os.Exit(1)
	}
	fmt.Println("✅ wallet client created")
	fmt.Println("client_id:     ", clientID)
	fmt.Println("client_secret: ", secret, " (нэг л удаа харагдана — аюулгүй хадгална уу)")
}

func createAdmin(db *gorm.DB, username, name string) {
	pass := mustSecret()
	hash := mustHash(pass)
	if err := db.Exec(
		"INSERT INTO wallet_admin (username, password_hash, name) VALUES (?, ?, ?)",
		username, hash, name,
	).Error; err != nil {
		fmt.Fprintln(os.Stderr, "insert:", err)
		os.Exit(1)
	}
	fmt.Println("✅ wallet super-admin created")
	fmt.Println("username: ", username)
	fmt.Println("password: ", pass, " (нэг л удаа харагдана — аюулгүй хадгална уу)")
}

func mustSecret() string {
	s, err := randomSecret()
	if err != nil {
		fmt.Fprintln(os.Stderr, "secret:", err)
		os.Exit(1)
	}
	return s
}

func mustHash(s string) string {
	h, err := helpers.GenerateHash(s)
	if err != nil {
		fmt.Fprintln(os.Stderr, "hash:", err)
		os.Exit(1)
	}
	return h
}

// randomSecret нь 32 байт санамсаргүй (URL-safe base64) secret үүсгэнэ.
func randomSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

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
	if !strings.Contains(dsn, "search_path") {
		sep := "?"
		if strings.Contains(dsn, "?") {
			sep = "&"
		}
		dsn += sep + "search_path=gerege_platform,public"
	}
	return dsn, nil
}
