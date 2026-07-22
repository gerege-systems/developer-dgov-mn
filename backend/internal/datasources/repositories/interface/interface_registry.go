// Government Developer Portal V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package _interface

import (
	"context"

	"template/internal/business/domain"
)

// RegistryFilter нь паспортын жагсаалтын шүүлтүүр. Хоосон талбар = шүүхгүй.
type RegistryFilter struct {
	Status      string // draft | published | archived
	Authority   string
	LifeEventID string
	Proactivity string
	Query       string // нэр/код дотор хайх
	// PublishedOnly нь нийтийн каталогийн уншилтад ашиглагдана — Status-аас
	// үл хамааран зөвхөн published мөрүүдийг буцаана.
	PublishedOnly bool
}

// RegistryRepository нь Ring R1 — үйлчилгээний нэгдсэн регистрийн gateway
// (migration 42). gateway/relay-ийн адил RLS-гүй: энэ нь байгууллагын мастер
// өгөгдөл бөгөөд хамгаалалт нь 'registry.manage' эрхээр HTTP давхаргад хийгдэнэ.
type RegistryRepository interface {
	// ── Паспорт ─────────────────────────────────────────────────────────
	ListServices(ctx context.Context, f RegistryFilter) ([]domain.RegistryService, error)
	// GetService нь нотолгооны жагсаалттай нь хамт (Evidences дүүргэгдсэн) буцаана.
	GetService(ctx context.Context, id string) (domain.RegistryService, error)
	GetServiceByCode(ctx context.Context, code string) (domain.RegistryService, error)
	CreateService(ctx context.Context, in *domain.RegistryService) (domain.RegistryService, error)
	UpdateService(ctx context.Context, in *domain.RegistryService) (domain.RegistryService, error)
	SetServiceStatus(ctx context.Context, id, status string) error
	DeleteService(ctx context.Context, id string) error

	// ── Паспорт ↔ нотолгоо ──────────────────────────────────────────────
	// SetServiceEvidences нь тухайн үйлчилгээний нотолгооны бүрэн жагсаалтыг
	// солино (нэг транзакцид: хуучныг устгаад шинийг оруулна).
	SetServiceEvidences(ctx context.Context, serviceID string, list []domain.RegistryServiceEvidence) error

	// ── Хувилбар ────────────────────────────────────────────────────────
	ListVersions(ctx context.Context, serviceID string) ([]domain.RegistryServiceVersion, error)
	// BaselineVersion нь baseline мөрийг буцаана; байхгүй бол NotFound.
	BaselineVersion(ctx context.Context, serviceID string) (domain.RegistryServiceVersion, error)
	// PublishVersion нь шинэ хувилбарын мөр нэмж, registry_services-ийн
	// version/status/published_at-ыг нэг транзакцид шинэчилнэ.
	PublishVersion(ctx context.Context, in *domain.RegistryServiceVersion) (domain.RegistryServiceVersion, error)
	// CountCitizenDocuments нь иргэнээс шаардаж буй баримтын тоог буцаана
	// (хувилбарын documents_count-д хэрэглэгдэнэ).
	CountCitizenDocuments(ctx context.Context, serviceID string) (int, error)

	// ── Ажлын каталог руу проекц (migration 47) ─────────────────────────
	// ProjectToGov нь паспортыг иргэний порталын ажлын каталог (gov_services)
	// руу буулгана — байхгүй бол үүсгэж, байгаа бол шинэчилнэ. Иргэнээс
	// шаардах баримтын жагсаалтыг нотолгооны холбоосоос (from_citizen=true)
	// автоматаар гаргана. Паспорт нийтлэгдэх бүрд дуудагдана.
	ProjectToGov(ctx context.Context, serviceID string) error
	// WithdrawFromGov нь архивлагдсан паспортын ажлын үйлчилгээг унтраана
	// (мөрийг УСТГАХГҮЙ — өмнөх хүсэлтүүд нь түүн рүү заасаар байна).
	WithdrawFromGov(ctx context.Context, serviceID string) error
	// SetServiceEvents нь паспортын амьдралын үйл явдлын жагсаалтыг солино.
	SetServiceEvents(ctx context.Context, serviceID string, eventIDs []string) error

	// ── Нотолгооны каталог ──────────────────────────────────────────────
	ListEvidences(ctx context.Context) ([]domain.RegistryEvidence, error)
	GetEvidence(ctx context.Context, id string) (domain.RegistryEvidence, error)
	CreateEvidence(ctx context.Context, in *domain.RegistryEvidence) (domain.RegistryEvidence, error)
	UpdateEvidence(ctx context.Context, in *domain.RegistryEvidence) (domain.RegistryEvidence, error)
	DeleteEvidence(ctx context.Context, id string) error

	// ── Амьдралын үйл явдал ─────────────────────────────────────────────
	ListLifeEvents(ctx context.Context) ([]domain.RegistryLifeEvent, error)
	CreateLifeEvent(ctx context.Context, in *domain.RegistryLifeEvent) (domain.RegistryLifeEvent, error)
	DeleteLifeEvent(ctx context.Context, id string) error

	// ── Once-only + нэгтгэл ─────────────────────────────────────────────
	OnceOnlyViolations(ctx context.Context, authority string) ([]domain.RegistryOnceOnlyViolation, error)
	Overview(ctx context.Context) (domain.RegistryOverview, error)
}
