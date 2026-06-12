// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Энэ файл нь double-entry постингийн ЦЭВЭР (DB-гүй) логикийг агуулна —
// гүйлгээ бүрд тэнцсэн (Σdebit = Σcredit) ledger мөрүүд үүсгэх, баланс шалгах,
// дансны төлвөөс гүйлгээ зөвшөөрөгдөх эсэхийг шалгах. Usecase давхарга
// (Phase 3) эдгээрийг FOR UPDATE + idempotency + repo-той хослуулна.
package domain

// Posting нь нэг гүйлгээний double-entry мөрүүд. Хадгалахаас өмнө ID/TxnID
// хоосон — зөвхөн GLAccount/AccountID/Direction/AmountMinor бөглөгдөнө.
type Posting []LedgerEntry

func entry(gl string, accountID *string, direction string, amount int64) LedgerEntry {
	return LedgerEntry{GLAccount: gl, AccountID: accountID, Direction: direction, AmountMinor: amount}
}

func ptr(s string) *string { return &s }

// TotalDebit нь постингийн DEBIT мөрүүдийн нийлбэр.
func (p Posting) TotalDebit() int64 {
	var sum int64
	for _, e := range p {
		if e.Direction == DirectionDebit {
			sum += e.AmountMinor
		}
	}
	return sum
}

// TotalCredit нь постингийн CREDIT мөрүүдийн нийлбэр.
func (p Posting) TotalCredit() int64 {
	var sum int64
	for _, e := range p {
		if e.Direction == DirectionCredit {
			sum += e.AmountMinor
		}
	}
	return sum
}

// Balanced нь double-entry тэнцэл (P1): Σdebit = Σcredit, ба хоосон биш.
func (p Posting) Balanced() bool {
	return len(p) > 0 && p.TotalDebit() == p.TotalCredit()
}

// NetForAccount нь тухайн дансны customer_wallet_liability дахь цэвэр өөрчлөлт
// (CREDIT − DEBIT)-ийг буцаана — энэ нь дансны баланс дахь өөрчлөлт (+орлого,
// −зарлага). running_balance тооцоход хэрэглэнэ.
func (p Posting) NetForAccount(accountID string) int64 {
	var net int64
	for _, e := range p {
		if e.GLAccount != GLCustomerWallet || e.AccountID == nil || *e.AccountID != accountID {
			continue
		}
		if e.Direction == DirectionCredit {
			net += e.AmountMinor
		} else {
			net -= e.AmountMinor
		}
	}
	return net
}

// DepositPosting нь цэнэглэлт: Dr bank_settlement / Cr customer_wallet(A).
func DepositPosting(accountID string, amount int64) (Posting, error) {
	if amount <= 0 {
		return nil, ErrInvalidAmount
	}
	return Posting{
		entry(GLBankSettlement, nil, DirectionDebit, amount),
		entry(GLCustomerWallet, ptr(accountID), DirectionCredit, amount),
	}, nil
}

// WithdrawalPosting нь зарлага: Dr customer_wallet(A) / Cr bank_settlement.
func WithdrawalPosting(accountID string, amount int64) (Posting, error) {
	if amount <= 0 {
		return nil, ErrInvalidAmount
	}
	return Posting{
		entry(GLCustomerWallet, ptr(accountID), DirectionDebit, amount),
		entry(GLBankSettlement, nil, DirectionCredit, amount),
	}, nil
}

// FeePosting нь шимтгэл: Dr customer_wallet(A) / Cr <glAccount> (ихэвчлэн fee_income).
func FeePosting(accountID, glAccount string, fee int64) (Posting, error) {
	if fee <= 0 {
		return nil, ErrInvalidAmount
	}
	if glAccount == "" {
		glAccount = GLFeeIncome
	}
	return Posting{
		entry(GLCustomerWallet, ptr(accountID), DirectionDebit, fee),
		entry(glAccount, nil, DirectionCredit, fee),
	}, nil
}

// TransferPosting нь хэтэвч → хэтэвч: эх данс internal_transfer_clearing руу,
// тэндээс хүлээн авагч руу — 4 мөр, тэнцсэн.
func TransferPosting(fromID, toID string, amount int64) (Posting, error) {
	if amount <= 0 {
		return nil, ErrInvalidAmount
	}
	if fromID == toID {
		return nil, ErrSameAccountTransfer
	}
	return Posting{
		entry(GLCustomerWallet, ptr(fromID), DirectionDebit, amount),
		entry(GLTransferClearing, nil, DirectionCredit, amount),
		entry(GLTransferClearing, nil, DirectionDebit, amount),
		entry(GLCustomerWallet, ptr(toID), DirectionCredit, amount),
	}, nil
}

// ReversePosting нь deposit/withdrawal/fee гүйлгээний эсрэг (буцаах) posting-ийг
// үүсгэнэ. transfer reversal дэмжээгүй (хоёр данс хөдөлгөдөг) — ErrReversalUnsupported.
func ReversePosting(orig WalletTxn) (Posting, error) {
	switch orig.Type {
	case TxnDeposit:
		return WithdrawalPosting(orig.AccountID, orig.AmountMinor)
	case TxnWithdrawal:
		return DepositPosting(orig.AccountID, orig.AmountMinor)
	case TxnFee:
		return Posting{
			entry(GLFeeIncome, nil, DirectionDebit, orig.AmountMinor),
			entry(GLCustomerWallet, ptr(orig.AccountID), DirectionCredit, orig.AmountMinor),
		}, nil
	}
	return nil, ErrReversalUnsupported
}

// EnsureActive нь данс гүйлгээ хийх төлөвт байгаа эсэхийг шалгана.
func EnsureActive(a WalletAccount) error {
	if !a.IsActive() {
		return ErrAccountNotActive
	}
	return nil
}

// EnsureWithdrawable нь дансаас (amount + fee) гаргах боломжтой эсэхийг шалгана:
// active байх ба боломжит үлдэгдэл (balance − hold) хүрэлцэхүйц байх (P4).
func EnsureWithdrawable(a WalletAccount, amount, fee int64) error {
	if amount <= 0 {
		return ErrInvalidAmount
	}
	if err := EnsureActive(a); err != nil {
		return err
	}
	if a.Available() < amount+fee {
		return ErrInsufficientFunds
	}
	return nil
}
