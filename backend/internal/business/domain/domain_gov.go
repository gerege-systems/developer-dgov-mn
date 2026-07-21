// Government Template Platform V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package domain

import "time"

// Иргэний "Төрийн үйлчилгээ" порталын домэйн entity-үүд (me систем). gov_services
// нь нийтийн каталог; бусад нь хэрэглэгч-тус-бүрийн (UserID-гаар scope хийгдэнэ).

// ── Үйлчилгээний биелүүлэх горим ─────────────────────────────────────────────

const (
	// GovFulfilmentAuto нь бүртгэлээс шууд уншиж олгодог үйлчилгээ (лавлагаа,
	// тодорхойлолт). Хүн оролцохгүй — хүсэлт өгмөгц нэг транзакцид биелнэ.
	GovFulfilmentAuto = "auto"
	// GovFulfilmentManual нь менежер (officer) хянаж шийдвэрлэсний дараа
	// биелэх үйлчилгээ.
	GovFulfilmentManual = "manual"
)

// ── Хүсэлтийн төлөвийн машин (migration 44-ийн CHECK-тэй таарна) ─────────────

const (
	GovStatusSubmitted    = "submitted"     // иргэн илгээв
	GovStatusRegistered   = "registered"    // албан ёсоор бүртгэгдэв, SLA эхлэв
	GovStatusInReview     = "in_review"     // менежер хянаж байна
	GovStatusInfoRequired = "info_required" // иргэнээс нэмэлт баримт хүлээж байна
	GovStatusApproved     = "approved"      // зөвшөөрөв
	GovStatusRejected     = "rejected"      // татгалзав
	GovStatusCompleted    = "completed"     // гаралт олгогдов
	GovStatusCancelled    = "cancelled"     // иргэн буцаав
	GovStatusExpired      = "expired"       // хугацаа дуусав
)

// govTransitions нь зөвшөөрөгдсөн шилжилтүүд. Энэ нь ГАНЦ эх сурвалж —
// repository-ийн SQL нь эдгээрийг `WHERE status IN (...)` болгон давхар
// хэрэгжүүлж, зэрэг ирсэн хоёр шийдвэрийн уралдааныг (race) хаана.
var govTransitions = map[string][]string{
	GovStatusSubmitted:    {GovStatusRegistered, GovStatusCancelled},
	GovStatusRegistered:   {GovStatusInReview, GovStatusInfoRequired, GovStatusApproved, GovStatusRejected, GovStatusCancelled, GovStatusExpired},
	GovStatusInReview:     {GovStatusInfoRequired, GovStatusApproved, GovStatusRejected, GovStatusCancelled, GovStatusExpired},
	GovStatusInfoRequired: {GovStatusInReview, GovStatusCancelled, GovStatusExpired},
	GovStatusApproved:     {GovStatusCompleted},
	// Терминал төлөвүүд — цаашид шилжихгүй.
	GovStatusRejected:  {},
	GovStatusCompleted: {},
	GovStatusCancelled: {},
	GovStatusExpired:   {},
}

// GovCanTransition нь from → to шилжилт зөвшөөрөгдсөн эсэхийг хэлнэ.
func GovCanTransition(from, to string) bool {
	for _, allowed := range govTransitions[from] {
		if allowed == to {
			return true
		}
	}
	return false
}

// GovIsOpen нь хүсэлт ХАРААХАН шийдэгдээгүй (менежерийн дараалалд байгаа)
// эсэхийг хэлнэ. Overview-ийн тоолол болон SLA sweep үүнийг ашиглана.
func GovIsOpen(status string) bool {
	switch status {
	case GovStatusSubmitted, GovStatusRegistered, GovStatusInReview, GovStatusInfoRequired:
		return true
	}
	return false
}

// GovService нь каталогийн нэг үйлчилгээ. Талбарууд нь CPSV-AP 3.0.0 (SEMIC)
// -ийн Public Service класстай зэрэгцүүлэгдсэн — тайлбарт харгалзах property-г
// бичив (migration 44).
type GovService struct {
	ID             string
	Code           string // dct:identifier — MN-<COFOG>-<дугаар>
	Name           string // dct:title
	Category       string
	Agency         string // m8g:hasCompetentAuthority
	Description    string // dct:description
	Fee            int    // m8g:hasCost (MNT)
	ProcessingDays int
	ProcessingTime string // m8g:processingTime — ISO 8601 duration (P7D)
	COFOGCode      string // m8g:thematicArea — НҮБ COFOG
	COFOGLabel     string
	OutputType     string   // cpsv:produces — CPSV-AP Output толь
	OutputRefType  string   // гаралт лавлагаа бол gov_references.type
	Evidence       []string // cpsv:hasInput
	LegalBasis     string   // m8g:hasLegalResource
	AssuranceLevel string   // eIDAS: low/substantial/high
	Lifecycle      string   // adms:status
	Fulfilment     string   // auto | manual
	SLAHours       int
	TacitApproval  bool
	LifeEvents     []GovLifeEvent // m8g:isGroupedBy
	Online         bool
	Enabled        bool
	CreatedAt      time.Time
}

// GovLifeEvent нь CPSV-AP-ийн Event (Life/Business). EU нь энэ толийг ХЯНАЛТТАЙ
// болгож заагаагүй тул enum биш, өгөгдлийн мөрөөр загварчилсан.
type GovLifeEvent struct {
	Code    string
	Name    string
	Kind    string // life | business
	Source  string // sdg | national
	ENLabel string
}

// GovApplication нь иргэний үйлчилгээний хүсэлт.
type GovApplication struct {
	ID           string
	UserID       string
	ServiceID    *string
	ServiceCode  string
	ServiceName  string
	ReferenceNo  string
	Status       string
	Note         string
	Payload      []byte // jsonb — маягтын өгөгдөл
	AssignedTo   *string
	AssignedAt   *time.Time
	DecidedBy    *string
	DecidedAt    *time.Time
	DecisionNote string
	DueAt        *time.Time
	SLABreached  bool
	OutputRefID  *string
	Tacit        bool
	SubmittedAt  time.Time
	UpdatedAt    *time.Time
}

// GovApplicationEvent нь хүсэлтийн timeline-ийн нэг бичлэг (append-only).
type GovApplicationEvent struct {
	ID            string
	ApplicationID string
	ActorID       *string
	ActorRole     string
	FromStatus    string
	ToStatus      string
	Type          string
	Detail        string
	CreatedAt     time.Time
}

// GovReference нь олгогдсон лавлагаа/тодорхойлолт.
type GovReference struct {
	ID          string
	UserID      string
	Type        string
	Title       string
	ReferenceNo string
	Status      string
	IssuedAt    time.Time
	ValidUntil  *time.Time
	Data        []byte // jsonb
}

// GovNotification нь иргэнд илгээсэн мэдэгдэл.
type GovNotification struct {
	ID        string
	UserID    string
	Title     string
	Body      string
	Category  string
	Read      bool
	CreatedAt time.Time
}

// GovPayment нь төлбөр (татвар/хураамж/торгууль).
type GovPayment struct {
	ID        string
	UserID    string
	Title     string
	Category  string
	Amount    int
	Currency  string
	Status    string
	DueDate   *time.Time
	PaidAt    *time.Time
	CreatedAt time.Time
}

// GovAppointment нь төрийн байгууллага дахь цаг захиалга.
type GovAppointment struct {
	ID          string
	UserID      string
	ServiceID   *string
	ServiceName string
	Agency      string
	Location    string
	ScheduledAt time.Time
	Status      string
	Note        string
	CreatedAt   time.Time
}

// GovOverview нь иргэний нүүр хуудасны нэгтгэл.
type GovOverview struct {
	OpenApplications     int
	UnreadNotifications  int
	UnpaidCount          int
	UnpaidAmount         int
	UpcomingCount        int
	IssuedReferences     int
	RecentApplications   []GovApplication
	UpcomingAppointments []GovAppointment
}
