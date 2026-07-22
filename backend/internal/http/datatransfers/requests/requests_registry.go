// Government Developer Portal V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package requests

// Ring System · R1 — Үйлчилгээний нэгдсэн регистрийн хүсэлтийн DTO-ууд.
// Дэлгэрэнгүй домэйн дүрмүүд (кодын хэлбэр, сувгийн жагсаалт, once-only
// хамгаалалт) usecase давхаргад шалгагдана; энд бүтэц ба хязгаарууд.

// RegistryServiceRequest нь үйлчилгээний паспорт үүсгэх/засах body. Code нь
// зөвхөн үүсгэх үед хэрэглэгдэнэ (засварт үл хэрэгсэнэ — паспортын код
// өөрчлөгддөггүй).
type RegistryServiceRequest struct {
	Code           string   `json:"code" validate:"omitempty,max=64"`
	Name           string   `json:"name" validate:"required,max=300"`
	NameEN         string   `json:"name_en" validate:"omitempty,max=300"`
	Description    string   `json:"description" validate:"omitempty,max=4000"`
	Authority      string   `json:"authority" validate:"required,max=300"`
	AuthorityOrgID *string  `json:"authority_org_id" validate:"omitempty,uuid"`
	LegalBasis     string   `json:"legal_basis" validate:"omitempty,max=4000"`
	TargetGroup    string   `json:"target_group" validate:"omitempty,max=300"`
	Output         string   `json:"output" validate:"omitempty,max=300"`
	Channels       []string `json:"channels" validate:"omitempty,max=10,dive,oneof=office e-mongolia mobile phone post"`
	Fee            int      `json:"fee" validate:"min=0"`
	MaxDays        int      `json:"max_days" validate:"min=0,max=3650"`
	StepsCount     int      `json:"steps_count" validate:"min=0,max=500"`
	AnnualVolume   int      `json:"annual_volume" validate:"min=0"`
	Proactivity    string   `json:"proactivity" validate:"omitempty,oneof=information online once_only proactive"`
	LifeEventID    *string  `json:"life_event_id" validate:"omitempty,uuid"`

	// ── Үйл ажиллагааны тохиргоо (migration 47) ──────────────────────────
	// Паспорт нийтлэгдэхэд иргэний порталын ажлын каталог руу буудаг хэсэг.
	Category       string `json:"category" validate:"omitempty,max=100"`
	COFOGCode      string `json:"cofog_code" validate:"omitempty,max=16"`
	COFOGLabel     string `json:"cofog_label" validate:"omitempty,max=200"`
	MainActivity   string `json:"main_activity" validate:"omitempty,max=32"`
	SDGCode        string `json:"sdg_code" validate:"omitempty,max=8"`
	ProcessingTime string `json:"processing_time" validate:"omitempty,max=32"`
	OutputType     string `json:"output_type" validate:"omitempty,oneof='Declaration' 'Physical object' 'Code' 'Financial obligation' 'Financial benefit' 'Recognition' 'Permit'"`
	OutputRefType  string `json:"output_ref_type" validate:"omitempty,max=64"`
	AssuranceLevel string `json:"assurance_level" validate:"omitempty,oneof=low substantial high"`
	Fulfilment     string `json:"fulfilment" validate:"omitempty,oneof=auto manual"`
	HasDiscretion  bool   `json:"has_discretion"`
	HasAssessment  bool   `json:"has_assessment"`
	SLAHours       int    `json:"sla_hours" validate:"min=0,max=8760"`
	TacitApproval  bool   `json:"tacit_approval"`
	Online         bool   `json:"online"`
}

// RegistryEvidenceLink нь паспортод холбогдох нэг нотолгоо.
type RegistryEvidenceLink struct {
	EvidenceID string `json:"evidence_id" validate:"required,uuid"`
	Required   bool   `json:"required"`
	// FromCitizen — уг баримтыг иргэнээс шаардаж байгаа эсэх. ХУР-д байгаа
	// баримтыг иргэнээс шаардвал once-only зөрчил болно.
	FromCitizen bool   `json:"from_citizen"`
	Note        string `json:"note" validate:"omitempty,max=4000"`
}

// RegistryEvidencesRequest нь паспортын нотолгооны БҮРЭН жагсаалтыг солино.
type RegistryEvidencesRequest struct {
	Evidences []RegistryEvidenceLink `json:"evidences" validate:"omitempty,max=100,dive"`
}

// RegistryEvidenceRequest нь нотолгооны каталогийн бичлэг үүсгэх/засах body.
type RegistryEvidenceRequest struct {
	Code            string `json:"code" validate:"omitempty,max=64"`
	Name            string `json:"name" validate:"required,max=300"`
	Description     string `json:"description" validate:"omitempty,max=4000"`
	HolderAgency    string `json:"holder_agency" validate:"omitempty,max=300"`
	SourceSystem    string `json:"source_system" validate:"omitempty,max=300"`
	InKHUR          bool   `json:"in_khur"`
	KHURServiceCode string `json:"khur_service_code" validate:"omitempty,max=200"`
}

// RegistryLifeEventRequest нь амьдралын/бизнесийн үйл явдал үүсгэх body.
type RegistryLifeEventRequest struct {
	Code        string `json:"code" validate:"required,max=64"`
	Name        string `json:"name" validate:"required,max=300"`
	Kind        string `json:"kind" validate:"omitempty,oneof=life business"`
	Description string `json:"description" validate:"omitempty,max=4000"`
	LeadAgency  string `json:"lead_agency" validate:"omitempty,max=300"`
	SortOrder   int    `json:"sort_order" validate:"min=0,max=10000"`
}

// RegistryPublishRequest нь паспортыг нийтлэх (шинэ хувилбар үүсгэх) body.
type RegistryPublishRequest struct {
	ChangeNote string `json:"change_note" validate:"omitempty,max=1000"`
}
