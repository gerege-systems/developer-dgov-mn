// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Package oauth нь wallet.gerege.mn-ийн OAuth2 client_credentials урсгал — бусад
// систем client_id + client_secret-ээр wallet-ийн ӨӨРИЙН HS256 access токен авна.
// Токены subject = client_id (RLS-ийн owner). Refresh байхгүй (machine-to-machine,
// богино настай токен дахин авна).
package oauth

import (
	"context"
	"errors"
	"net"
	"strings"

	"eidtemplate/internal/business/domain"
	"eidtemplate/pkg/helpers"
	"eidtemplate/pkg/jwt"
)

// ClientStore нь wallet_client уншилт (postgres adapter хэрэгжүүлнэ).
type ClientStore interface {
	GetClient(ctx context.Context, clientID string) (domain.WalletClient, error)
	TouchClientUsed(ctx context.Context, clientID string) error
}

// TokenResult нь гаргасан токен + насжилт (секунд).
type TokenResult struct {
	AccessToken string
	ExpiresIn   int
}

// Usecase нь client_credentials токен олголтын хил.
type Usecase interface {
	IssueClientToken(ctx context.Context, clientID, clientSecret, reqIP string) (TokenResult, error)
}

type usecase struct {
	store      ClientStore
	jwtService jwt.JWTService
	expiresIn  int // токены насжилт (секунд)
}

// NewUsecase нь client store + jwt service + токены насжилтаар usecase үүсгэнэ.
func NewUsecase(store ClientStore, jwtService jwt.JWTService, expiresInSeconds int) Usecase {
	return &usecase{store: store, jwtService: jwtService, expiresIn: expiresInSeconds}
}

// IssueClientToken нь client_id/secret-ийг шалгаж wallet JWT (subject=client_id)
// гаргана. Буруу/идэвхгүй бол domain.ErrInvalidClient (timing-эsafe bcrypt).
func (u *usecase) IssueClientToken(ctx context.Context, clientID, clientSecret, reqIP string) (TokenResult, error) {
	if clientID == "" || clientSecret == "" {
		return TokenResult{}, domain.ErrInvalidClient
	}
	c, err := u.store.GetClient(ctx, clientID)
	if err != nil {
		if errors.Is(err, domain.ErrClientNotFound) {
			return TokenResult{}, domain.ErrInvalidClient
		}
		return TokenResult{}, err
	}
	if !c.Active || !helpers.ValidateHash(clientSecret, c.SecretHash) {
		return TokenResult{}, domain.ErrInvalidClient
	}
	// IP whitelist — тохируулсан бол ирсэн IP жагсаалтад байх ёстой.
	if !ipAllowed(reqIP, c.AllowedIPs) {
		return TokenResult{}, domain.ErrIPNotAllowed
	}
	token, err := u.jwtService.GenerateToken(clientID, false, "")
	if err != nil {
		return TokenResult{}, err
	}
	_ = u.store.TouchClientUsed(ctx, clientID) // fire-and-forget
	return TokenResult{AccessToken: token, ExpiresIn: u.expiresIn}, nil
}

// ipAllowed нь reqIP-г таслалаар тусгаарласан IP/CIDR allowlist-тэй тулгана.
// allowed хоосон бол хязгаарлалтгүй (true). Буруу reqIP бол false.
func ipAllowed(reqIP, allowed string) bool {
	allowed = strings.TrimSpace(allowed)
	if allowed == "" {
		return true
	}
	ip := net.ParseIP(strings.TrimSpace(reqIP))
	if ip == nil {
		return false
	}
	for _, part := range strings.Split(allowed, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		if strings.Contains(part, "/") {
			if _, cidr, err := net.ParseCIDR(part); err == nil && cidr.Contains(ip) {
				return true
			}
			continue
		}
		if p := net.ParseIP(part); p != nil && p.Equal(ip) {
			return true
		}
	}
	return false
}
