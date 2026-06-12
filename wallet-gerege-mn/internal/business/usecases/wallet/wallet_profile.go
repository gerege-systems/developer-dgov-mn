// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package wallet

import (
	"context"
	"strings"

	"eidtemplate/internal/business/domain"
)

// UpsertProfile нь эзний display/KYC snapshot-ийг хадгална. Owner = ActorSubject
// (RLS-ээр өөрийн профайл л бичнэ). Хоосон subject-ийг үл тоомсорлоно.
func (u *usecase) UpsertProfile(ctx context.Context, req ProfileRequest) error {
	if strings.TrimSpace(req.ActorSubject) == "" {
		return nil
	}
	return u.repo.UpsertOwnerProfile(ctx, req.ActorSubject, domain.WalletOwnerProfile{
		FullName:    strings.TrimSpace(req.FullName),
		GivenName:   strings.TrimSpace(req.GivenName),
		FamilyName:  strings.TrimSpace(req.FamilyName),
		NationalID:  strings.TrimSpace(req.NationalID),
		Phone:       strings.TrimSpace(req.Phone),
		Email:       strings.TrimSpace(req.Email),
		KYCVerified: req.KYCVerified,
		Source:      strings.TrimSpace(req.Source),
	})
}
