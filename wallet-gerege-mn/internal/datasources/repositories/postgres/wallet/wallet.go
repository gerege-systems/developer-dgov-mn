// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Package wallet нь wallet ledger-ийн Postgres repository adapter. Бичих метод
// бүр withSubject (RLS-д app.subject тогтоосон transaction) дотор, дансыг
// FOR UPDATE-аар түгжиж, double-entry посттой атомар гүйцэтгэнэ (P1/P6).
// Дизайн: docs/WALLET_LEDGER_DESIGN.md (v1.0).
package wallet

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"eidtemplate/internal/business/domain"
	repointerface "eidtemplate/internal/datasources/repositories/interface"

	"gorm.io/gorm"
)

// Repository нь дундын gerege_platform холболтыг (least-priv app_user) боож,
// wallet хүснэгтэд RLS-ийн дор хандана.
type Repository struct {
	db *gorm.DB
}

// NewRepository нь GORM холболтоор wallet repository үүсгэнэ.
func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

// withSubject нь fn-ийг RLS-д зориулж app.subject тогтоосон transaction дотор
// гүйцэтгэнэ. `SET LOCAL ROLE app_user` нь холболт superuser байсан ч үр дүнтэй
// role-ийг app_user (хүснэгтийн эзэн БИШ) болгож RLS FORCE-ийг идэвхжүүлнэ —
// тиймээс бие даасан хувилбарт нэг л superuser холболт ашиглаж болно (dedicated
// app_user холболтод энэ нь no-op). set_config(..., true) = SET LOCAL.
func (r *Repository) withSubject(ctx context.Context, subject string, fn func(tx *gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SET LOCAL ROLE app_user").Error; err != nil {
			return err
		}
		if err := tx.Exec("SELECT set_config('app.subject', ?, true)", subject).Error; err != nil {
			return err
		}
		return fn(tx)
	})
}

// OpenOrGetAccount нь owner-ийн идэвхтэй MNT хэтэвчийг буцаана; байхгүй бол
// үүсгэнэ. RLS WITH CHECK нь актёр зөвхөн өөрийн (person) ЭСВЭЛ гишүүн
// байгууллагын (organization) данс үүсгэхийг зөвшөөрнө.
func (r *Repository) OpenOrGetAccount(ctx context.Context, actorSubject, ownerType, ownerID string) (domain.WalletAccount, error) {
	var out domain.WalletAccount
	err := r.withSubject(ctx, actorSubject, func(tx *gorm.DB) error {
		acc, err := getActiveByOwner(tx, ownerType, ownerID)
		if err == nil {
			out = acc
			return nil
		}
		if !errors.Is(err, domain.ErrWalletNotFound) {
			return err
		}
		out, err = insertAccount(tx, ownerType, ownerID)
		return err
	})
	// H5: эзэн бүрд нэг active хэтэвч (partial unique index uq_wallet_active_owner).
	// Зэрэг хоёр анхны хүсэлтийн нэг нь unique-violation авбал нөгөө нь үүсгэснийг
	// шинэ tx-д дахин сонгоно — давхар хэтэвч үүсэхээс сэргийлнэ.
	if isUniqueViolation(err) {
		var acc domain.WalletAccount
		rerr := r.withSubject(ctx, actorSubject, func(tx *gorm.DB) error {
			a, e := getActiveByOwner(tx, ownerType, ownerID)
			if e == nil {
				acc = a
			}
			return e
		})
		if rerr == nil {
			return acc, nil
		}
	}
	return out, err
}

// isUniqueViolation нь Postgres unique_violation (SQLSTATE 23505)-ийг
// driver-агностик илрүүлнэ.
func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	s := err.Error()
	return strings.Contains(s, "23505") || strings.Contains(s, "duplicate key value")
}

// GetAccountByOwner нь owner-ийн идэвхтэй хэтэвчийг буцаана; олдохгүй бол
// domain.ErrWalletNotFound.
func (r *Repository) GetAccountByOwner(ctx context.Context, actorSubject, ownerType, ownerID string) (domain.WalletAccount, error) {
	var out domain.WalletAccount
	err := r.withSubject(ctx, actorSubject, func(tx *gorm.DB) error {
		acc, err := getActiveByOwner(tx, ownerType, ownerID)
		if err != nil {
			return err
		}
		out = acc
		return nil
	})
	return out, err
}

// Deposit нь цэнэглэлтийг атомар бичнэ.
func (r *Repository) Deposit(ctx context.Context, actorSubject string, in repointerface.WalletDepositInput) (domain.WalletTxn, error) {
	var out domain.WalletTxn
	err := r.withSubject(ctx, actorSubject, func(tx *gorm.DB) error {
		if txn, found, err := replay(tx, in.IdempotencyKey, actorSubject, in); err != nil {
			return err
		} else if found {
			out = txn
			return nil
		}
		acc, err := lockAccount(tx, in.AccountID)
		if err != nil {
			return err
		}
		if err := domain.EnsureActive(acc); err != nil {
			return err
		}
		posting, err := domain.DepositPosting(acc.ID, in.AmountMinor)
		if err != nil {
			return err
		}
		newBal := acc.BalanceMinor + posting.NetForAccount(acc.ID)
		txnID, err := insertTxn(tx, domain.WalletTxn{
			AccountID: acc.ID, Type: domain.TxnDeposit, AmountMinor: in.AmountMinor,
			RunningBalanceMinor: newBal, ExternalRef: in.ExternalRef, Channel: in.Channel, CreatedBy: actorSubject,
		})
		if err != nil {
			return err
		}
		if err := postEntries(tx, txnID, posting); err != nil {
			return err
		}
		if err := updateBalance(tx, acc.ID, newBal); err != nil {
			return err
		}
		if err := store(tx, in.IdempotencyKey, actorSubject, txnID, in); err != nil {
			return err
		}
		out, err = loadTxn(tx, txnID)
		return err
	})
	return out, err
}

// Withdraw нь зарлага + (FeeMinor>0 бол) шимтгэлийг нэг tx-д бичнэ.
func (r *Repository) Withdraw(ctx context.Context, actorSubject string, in repointerface.WalletWithdrawInput) (domain.WalletTxn, error) {
	var out domain.WalletTxn
	err := r.withSubject(ctx, actorSubject, func(tx *gorm.DB) error {
		if txn, found, err := replay(tx, in.IdempotencyKey, actorSubject, in); err != nil {
			return err
		} else if found {
			out = txn
			return nil
		}
		acc, err := lockAccount(tx, in.AccountID)
		if err != nil {
			return err
		}
		if err := domain.EnsureWithdrawable(acc, in.AmountMinor, in.FeeMinor); err != nil {
			return err
		}
		running := acc.BalanceMinor - in.AmountMinor
		wPosting, _ := domain.WithdrawalPosting(acc.ID, in.AmountMinor)
		wTxnID, err := insertTxn(tx, domain.WalletTxn{
			AccountID: acc.ID, Type: domain.TxnWithdrawal, AmountMinor: in.AmountMinor,
			RunningBalanceMinor: running, ExternalRef: in.ExternalRef, Channel: in.Channel, CreatedBy: actorSubject,
		})
		if err != nil {
			return err
		}
		if err := postEntries(tx, wTxnID, wPosting); err != nil {
			return err
		}
		if in.FeeMinor > 0 {
			running -= in.FeeMinor
			fPosting, _ := domain.FeePosting(acc.ID, in.FeeGLAccount, in.FeeMinor)
			fTxnID, err := insertTxn(tx, domain.WalletTxn{
				AccountID: acc.ID, Type: domain.TxnFee, AmountMinor: in.FeeMinor,
				RunningBalanceMinor: running, Channel: in.Channel, CreatedBy: actorSubject,
			})
			if err != nil {
				return err
			}
			if err := postEntries(tx, fTxnID, fPosting); err != nil {
				return err
			}
		}
		if err := updateBalance(tx, acc.ID, running); err != nil {
			return err
		}
		if err := store(tx, in.IdempotencyKey, actorSubject, wTxnID, in); err != nil {
			return err
		}
		out, err = loadTxn(tx, wTxnID)
		return err
	})
	return out, err
}

// ListTransactions нь дансны гүйлгээний түүхийг шинэ→хуучин дарааллаар буцаана.
func (r *Repository) ListTransactions(ctx context.Context, actorSubject, accountID string, offset, limit int) ([]domain.WalletTxn, error) {
	out := make([]domain.WalletTxn, 0)
	err := r.withSubject(ctx, actorSubject, func(tx *gorm.DB) error {
		return tx.Raw(
			"SELECT * FROM wallet_txn WHERE account_id = ? ORDER BY created_at DESC OFFSET ? LIMIT ?",
			accountID, offset, limit,
		).Scan(&out).Error
	})
	return out, err
}

// ActiveFeeRule нь тохирох идэвхтэй, хүчинтэй хугацаатай fee rule-уудаас
// priority хамгийн өндрийг буцаана; олдохгүй бол (nil, nil). fee_rule нь
// RLS-гүй reference data тул withSubject хэрэггүй.
func (r *Repository) ActiveFeeRule(ctx context.Context, txnType, ownerType, channel string) (*domain.FeeRule, error) {
	var rules []domain.FeeRule
	err := r.db.WithContext(ctx).Raw(`
SELECT * FROM fee_rule
WHERE txn_type = ? AND active = true
  AND (owner_type IS NULL OR owner_type = ?)
  AND (channel    IS NULL OR channel    = ?)
  AND effective_from <= now()
  AND (effective_to IS NULL OR effective_to > now())
ORDER BY priority DESC
LIMIT 1`, txnType, ownerType, channel).Scan(&rules).Error
	if err != nil {
		return nil, err
	}
	if len(rules) == 0 {
		return nil, nil
	}
	return &rules[0], nil
}

// MembershipRole нь иргэний тухайн байгууллага дахь role-г буцаана; гишүүн биш
// бол domain.ErrOrgNotFound. organization_memberships RLS-тэй (profile_subject
// = app.subject) тул withSubject дотор зөвхөн өөрийн гишүүнчлэл харагдана.
func (r *Repository) MembershipRole(ctx context.Context, subject, orgID string) (string, error) {
	var role string
	err := r.withSubject(ctx, subject, func(tx *gorm.DB) error {
		res := tx.Raw(
			"SELECT role FROM organization_memberships WHERE profile_subject = ? AND organization_id = ?",
			subject, orgID,
		).Scan(&role)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return domain.ErrOrgNotFound
		}
		return nil
	})
	return role, err
}

// --- transaction-доторх туслахууд (tx-г хүлээн авна) ---

func getActiveByOwner(tx *gorm.DB, ownerType, ownerID string) (domain.WalletAccount, error) {
	var acc domain.WalletAccount
	res := tx.Raw(
		"SELECT * FROM wallet_account WHERE owner_type = ? AND owner_id = ? AND status = 'active' ORDER BY created_at LIMIT 1",
		ownerType, ownerID,
	).Scan(&acc)
	if res.Error != nil {
		return acc, res.Error
	}
	if res.RowsAffected == 0 {
		return acc, domain.ErrWalletNotFound
	}
	return acc, nil
}

func insertAccount(tx *gorm.DB, ownerType, ownerID string) (domain.WalletAccount, error) {
	var acc domain.WalletAccount
	// account_no: монотон sequence-ээс [type:1][seq:10][Luhn:1] = 12 цифр (m27).
	// Олон улсын IBAN-ийн BBAN данс хэсэгт шууд нийцнэ; check digit-ийг Go тооцоолно.
	var seq int64
	if err := tx.Raw("SELECT nextval('wallet_account_no_seq')").Scan(&seq).Error; err != nil {
		return acc, err
	}
	accountNo, err := domain.GenerateAccountNo(ownerType, seq)
	if err != nil {
		return acc, err
	}
	err = tx.Raw(`
INSERT INTO wallet_account (account_no, owner_type, owner_id, currency)
VALUES (?, ?, ?, 'MNT')
RETURNING *`, accountNo, ownerType, ownerID).Scan(&acc).Error
	return acc, err
}

func lockAccount(tx *gorm.DB, accountID string) (domain.WalletAccount, error) {
	var acc domain.WalletAccount
	res := tx.Raw("SELECT * FROM wallet_account WHERE id = ? FOR UPDATE", accountID).Scan(&acc)
	if res.Error != nil {
		return acc, res.Error
	}
	if res.RowsAffected == 0 {
		return acc, domain.ErrWalletNotFound
	}
	return acc, nil
}

func insertTxn(tx *gorm.DB, t domain.WalletTxn) (string, error) {
	var id string
	err := tx.Raw(`
INSERT INTO wallet_txn (account_id, type, amount_minor, running_balance_minor, external_ref, channel, created_by)
VALUES (?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, ''), ?)
RETURNING id`,
		t.AccountID, t.Type, t.AmountMinor, t.RunningBalanceMinor, t.ExternalRef, t.Channel, t.CreatedBy,
	).Scan(&id).Error
	return id, err
}

func postEntries(tx *gorm.DB, txnID string, posting domain.Posting) error {
	if !posting.Balanced() {
		return domain.ErrUnbalancedPosting
	}
	for _, e := range posting {
		if err := tx.Exec(
			"INSERT INTO ledger_entry (txn_id, gl_account, account_id, direction, amount_minor) VALUES (?, ?, ?, ?, ?)",
			txnID, e.GLAccount, e.AccountID, e.Direction, e.AmountMinor,
		).Error; err != nil {
			return err
		}
	}
	return nil
}

func updateBalance(tx *gorm.DB, accountID string, balanceMinor int64) error {
	return tx.Exec(
		"UPDATE wallet_account SET balance_minor = ?, version = version + 1, updated_at = now() WHERE id = ?",
		balanceMinor, accountID,
	).Error
}

func loadTxn(tx *gorm.DB, txnID string) (domain.WalletTxn, error) {
	var t domain.WalletTxn
	res := tx.Raw("SELECT * FROM wallet_txn WHERE id = ?", txnID).Scan(&t)
	if res.Error != nil {
		return t, res.Error
	}
	if res.RowsAffected == 0 {
		return t, domain.ErrWalletNotFound
	}
	return t, nil
}

// hashParams нь idempotency хүсэлтийн body-ийн тогтвортой hash-ийг буцаана.
func hashParams(params any) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%v", params)))
	return hex.EncodeToString(sum[:])
}

// replay нь idempotency key-ийн өмнөх үр дүнг (response_body = txn id) олж,
// тухайн гүйлгээг буцаана. key хоосон бол replay хийхгүй. M1: хадгалсан
// request_hash-ийг ОДООГИЙН хүсэлттэй тулгана — ижил key + өөр body бол
// domain.ErrIdempotencyMismatch (хуучин үр дүнг буруу буцаахаас сэргийлнэ).
func replay(tx *gorm.DB, key, actor string, params any) (domain.WalletTxn, bool, error) {
	var out domain.WalletTxn
	if key == "" {
		return out, false, nil
	}
	var storedHash string
	var body []byte
	row := tx.Raw("SELECT request_hash, response_body FROM idempotency_keys WHERE key = ? AND actor_subject = ?", key, actor).Row()
	if err := row.Scan(&storedHash, &body); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return out, false, nil
		}
		return out, false, err
	}
	if storedHash != "" && storedHash != hashParams(params) {
		return out, false, domain.ErrIdempotencyMismatch
	}
	txn, err := loadTxn(tx, string(body))
	return txn, true, err
}

// store нь idempotency key-ийг үр дүнгийн гүйлгээний id-тай хадгална. key
// хоосон бол алгасна.
func store(tx *gorm.DB, key, actor, txnID string, params any) error {
	if key == "" {
		return nil
	}
	return tx.Exec(`
INSERT INTO idempotency_keys (key, actor_subject, request_hash, response_status, response_body)
VALUES (?, ?, ?, 200, ?)`, key, actor, hashParams(params), []byte(txnID)).Error
}
