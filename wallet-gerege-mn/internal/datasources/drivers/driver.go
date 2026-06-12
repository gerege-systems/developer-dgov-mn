// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Package drivers нь wallet service-ийн Postgres (GORM) холболтыг үүсгэнэ.
package drivers

import (
	"fmt"
	"time"

	"eidtemplate/internal/config"

	gormpostgres "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// OpenGorm нь өгөгдсөн DSN-ээр GORM холболт (pool тохиргоотой) нээнэ. API нь
// app_user (RLS), worker нь admin/superuser DSN-ийг дамжуулна.
func OpenGorm(dsn string) (*gorm.DB, error) {
	if dsn == "" {
		return nil, fmt.Errorf("empty DSN")
	}
	db, err := gorm.Open(gormpostgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("gorm open: %w", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("db handle: %w", err)
	}
	sqlDB.SetMaxOpenConns(config.AppConfig.DBMaxOpenConns)
	sqlDB.SetMaxIdleConns(config.AppConfig.DBMaxIdleConns)
	sqlDB.SetConnMaxLifetime(time.Duration(config.AppConfig.DBConnMaxLifeMins) * time.Minute)
	return db, nil
}
