// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package wallet

import (
	"context"
	"time"

	"eidtemplate/internal/business/domain"
)

// Snapshot нь wallet_snapshot(p_date)-г дуудаж тухайн өдрийн snapshot мөрүүдийг
// тооцоолж UPSERT хийнэ (idempotent). Бичигдсэн мөрийн тоог буцаана. Функц нь
// definer тул RLS тойрно; дуудагч admin_identity/superuser (cmd/snapshot cron).
func (r *Repository) Snapshot(ctx context.Context, date time.Time) (int, error) {
	var n int
	err := r.db.WithContext(ctx).
		Raw("SELECT wallet_snapshot(?)", date.Format("2006-01-02")).Scan(&n).Error
	return n, err
}

// TrialBalance нь wallet_report_trial_balance(p_date)-г дуудаж GL trial balance-ыг
// (as-of өдөр) буцаана. Тэнцсэн бол бүх мөрийн Σdebit = Σcredit.
func (r *Repository) TrialBalance(ctx context.Context, date time.Time) ([]domain.TrialBalanceRow, error) {
	out := make([]domain.TrialBalanceRow, 0)
	if err := r.db.WithContext(ctx).
		Raw("SELECT * FROM wallet_report_trial_balance(?)", date.Format("2006-01-02")).Scan(&out).Error; err != nil {
		return nil, err
	}
	return out, nil
}

// DailyTurnover нь wallet_report_daily_turnover(p_from, p_to)-г дуудаж өдрийн
// нэгтгэсэн эргэлтийг (snapshot дээр тулгуурлан) буцаана.
func (r *Repository) DailyTurnover(ctx context.Context, from, to time.Time) ([]domain.DailyTurnoverRow, error) {
	out := make([]domain.DailyTurnoverRow, 0)
	if err := r.db.WithContext(ctx).
		Raw("SELECT * FROM wallet_report_daily_turnover(?, ?)", from.Format("2006-01-02"), to.Format("2006-01-02")).
		Scan(&out).Error; err != nil {
		return nil, err
	}
	return out, nil
}

// AccountStatement нь wallet_report_account_statement(account_no, from, to)-г
// дуудаж нэг дансны гүйлгээний хуулгыг (running balance-тай) буцаана.
func (r *Repository) AccountStatement(ctx context.Context, accountNo string, from, to time.Time) ([]domain.AccountStatementRow, error) {
	out := make([]domain.AccountStatementRow, 0)
	if err := r.db.WithContext(ctx).
		Raw("SELECT * FROM wallet_report_account_statement(?, ?, ?)",
			accountNo, from.Format("2006-01-02"), to.Format("2006-01-02")).
		Scan(&out).Error; err != nil {
		return nil, err
	}
	return out, nil
}
