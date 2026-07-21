-- Government Template Platform V3.0
-- Төрийн үйлчилгээг демо mock-оос БОДИТ ажиллагаатай болгоно:
--   1. Каталогийг олон улсын CPSV-AP 3.0.0 (SEMIC) загварт нийцүүлж, COFOG
--      (НҮБ-ын Government Functions ангилал) дээр суурилсан тогтолцоот код өгнө.
--   2. Хүсэлтэд бодит төлөвийн машин, SLA хугацаа, хариуцагч, шийдвэрлэгч,
--      шийдвэрийн үндэслэл нэмнэ.
--   3. `fulfilment` баганаар үйлчилгээг ХОЁР ТӨРӨЛД хуваана:
--        'auto'   — бүртгэлээс шууд үүсдэг лавлагаа/тодорхойлолт. Хүн
--                   оролцохгүй, хүсэлт өгмөгц нэг транзакцид олгогдоно.
--        'manual' — менежер (officer) хянаж шийдвэрлэсний ДАРАА л биелэнэ.
--   4. Хүсэлт бүрийн бүх шилжилтийг gov_application_events-д append-only
--      timeline болгож хадгална (relay_events-ийн загвар).
--
-- CPSV-AP тодотгол: mandatory нь dct:identifier / dct:title / dct:description /
-- m8g:hasCompetentAuthority. m8g:processingTime нь ISO 8601 duration (P7D).
-- cpsv:produces (Output) нь тогтсон толь: Declaration / Physical object / Code /
-- Financial obligation / Financial benefit / Recognition / Permit.
-- m8g:isGroupedBy нь Event рүү заана — EU нь Life Event-д хяналттай толь
-- ЗӨВЛӨӨГҮЙ тул энд enum биш, бие даасан мөр (gov_life_events) болгож загварчилав.

-- ---------------------------------------------------------------------------
-- 1. Каталог — CPSV-AP шинж чанарууд
-- ---------------------------------------------------------------------------

ALTER TABLE gov_services
    -- m8g:thematicArea → COFOG (жишээ '01.3.3'). Олон улсын харьцуулах тэнхлэг.
    ADD COLUMN IF NOT EXISTS cofog_code      TEXT    NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS cofog_label     TEXT    NOT NULL DEFAULT '',
    -- m8g:processingTime — ISO 8601 duration. processing_days нь UI-д
    -- үлдэх бөгөөд энэ нь машин уншихуйц каноник хэлбэр.
    ADD COLUMN IF NOT EXISTS processing_time TEXT    NOT NULL DEFAULT '',
    -- cpsv:produces → Output type (CPSV-AP толь).
    ADD COLUMN IF NOT EXISTS output_type     TEXT    NOT NULL DEFAULT 'Declaration',
    -- Гаралт нь лавлагаа бол ямар төрлийн gov_references мөр үүсгэхийг заана.
    ADD COLUMN IF NOT EXISTS output_ref_type TEXT    NOT NULL DEFAULT '',
    -- cpsv:hasInput → Evidence (шаардлагатай баримтын жагсаалт).
    ADD COLUMN IF NOT EXISTS evidence        JSONB   NOT NULL DEFAULT '[]',
    -- m8g:hasLegalResource — эрх зүйн үндэслэл.
    ADD COLUMN IF NOT EXISTS legal_basis     TEXT    NOT NULL DEFAULT '',
    -- eIDAS (Regulation 910/2014) баталгаажилтын түвшин.
    ADD COLUMN IF NOT EXISTS assurance_level TEXT    NOT NULL DEFAULT 'substantial',
    -- adms:status — каталогийн бичлэгийн амьдралын мөчлөг.
    ADD COLUMN IF NOT EXISTS lifecycle       TEXT    NOT NULL DEFAULT 'active',
    -- ГОЛ ШИЛЖҮҮЛЭГ: биелүүлэх горим.
    ADD COLUMN IF NOT EXISTS fulfilment      TEXT    NOT NULL DEFAULT 'manual',
    -- SLA — хүсэлт бүртгэгдсэнээс хойш шийдвэрлэх ёстой хугацаа (цагаар).
    ADD COLUMN IF NOT EXISTS sla_hours       INT     NOT NULL DEFAULT 72,
    -- "Чимээгүй зөвшөөрөл" (tacit / deemed approval): SLA хугацаанд шийдвэр
    -- гараагүй бол зөвшөөрсөнд тооцох. Европын зохицуулалтад өргөн хэрэглэгддэг
    -- зарчим боловч ЭНД тодорхой зүйл заалт иш татаагүй — уг ойлголтын эрх зүйн
    -- үндэслэлийг Монголын хууль тогтоомжоор тус бүрд нь баталгаажуулах ёстой.
    -- Тиймээс өгөгдмөл нь false; зөвхөн зөвшөөрөгдсөн үйлчилгээнд гараар асаана.
    ADD COLUMN IF NOT EXISTS tacit_approval  BOOLEAN NOT NULL DEFAULT false;

-- Толь бүрийн утгыг хатуу барина — relay-д CHECK байхгүйгээс төлөв "хүсснээрээ"
-- бичигдэх эрсдэл үүссэн; энд түүнийг давтахгүй.
ALTER TABLE gov_services
    DROP CONSTRAINT IF EXISTS gov_services_fulfilment_check,
    DROP CONSTRAINT IF EXISTS gov_services_output_type_check,
    DROP CONSTRAINT IF EXISTS gov_services_assurance_check,
    DROP CONSTRAINT IF EXISTS gov_services_lifecycle_check;
ALTER TABLE gov_services
    ADD CONSTRAINT gov_services_fulfilment_check
        CHECK (fulfilment IN ('auto','manual')),
    ADD CONSTRAINT gov_services_output_type_check
        CHECK (output_type IN ('Declaration','Physical object','Code',
                               'Financial obligation','Financial benefit',
                               'Recognition','Permit')),
    ADD CONSTRAINT gov_services_assurance_check
        CHECK (assurance_level IN ('low','substantial','high')),
    ADD CONSTRAINT gov_services_lifecycle_check
        CHECK (lifecycle IN ('active','deprecated','withdrawn'));

-- ---------------------------------------------------------------------------
-- 2. Life / Business event (CPSV-AP m8g:isGroupedBy). Хяналттай толь EU-д
--    заагаагүй тул мөр болгон загварчилж, каталогтой N:N холбоно.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gov_life_events (
    code       TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    -- 'life' | 'business' — CPSV-AP дахь Event-ийн хоёр дэд ангилал.
    kind       TEXT NOT NULL DEFAULT 'life',
    -- Гарал үүсэл: 'sdg' = EU 2018/1724 Annex II-ийн албан ёсны life event
    -- (англи нэрийг en_label-д хэвээр хадгална); 'national' = үндэсний өргөтгөл.
    -- Ялгаж хадгалсны учир: олон улсын харьцуулалт/тайланд зөвхөн 'sdg'-г авна.
    source     TEXT NOT NULL DEFAULT 'national',
    en_label   TEXT NOT NULL DEFAULT '',
    sort_order INT  NOT NULL DEFAULT 0,
    CONSTRAINT gov_life_events_kind_check   CHECK (kind IN ('life','business')),
    CONSTRAINT gov_life_events_source_check CHECK (source IN ('sdg','national'))
);

CREATE TABLE IF NOT EXISTS gov_service_events (
    service_id uuid NOT NULL REFERENCES gov_services(id)   ON DELETE CASCADE,
    event_code TEXT NOT NULL REFERENCES gov_life_events(code) ON DELETE CASCADE,
    PRIMARY KEY (service_id, event_code)
);

-- ---------------------------------------------------------------------------
-- 3. Хүсэлт — бодит workflow талбарууд
-- ---------------------------------------------------------------------------

ALTER TABLE gov_applications
    -- Каталогийн код (denormalized) — менежерийн дараалал шүүхэд.
    ADD COLUMN IF NOT EXISTS service_code  TEXT NOT NULL DEFAULT '',
    -- Хариуцагч менежер (уг хүсэлтийг "авсан" хүн).
    ADD COLUMN IF NOT EXISTS assigned_to   uuid,
    ADD COLUMN IF NOT EXISTS assigned_at   TIMESTAMPTZ,
    -- Шийдвэр гаргасан менежер + үндэслэл.
    ADD COLUMN IF NOT EXISTS decided_by    uuid,
    ADD COLUMN IF NOT EXISTS decided_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS decision_note TEXT NOT NULL DEFAULT '',
    -- SLA эцсийн хугацаа. Үүсгэх үед НЭГ УДАА тамгална (relay-ийн загвар) —
    -- уншилт бүрт дахин тооцохгүй тул хугацаа "гулсахгүй".
    ADD COLUMN IF NOT EXISTS due_at        TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS sla_breached  BOOLEAN NOT NULL DEFAULT false,
    -- Хүсэлтийн маягтын өгөгдөл (cpsv:hasInput-д тохирох).
    ADD COLUMN IF NOT EXISTS payload       JSONB NOT NULL DEFAULT '{}',
    -- Биелсэн үед олгогдсон гаралт (лавлагаа) руу заана.
    ADD COLUMN IF NOT EXISTS output_ref_id uuid,
    -- Чимээгүй зөвшөөрлөөр (tacit) шийдэгдсэн эсэх — audit-д ялгаж харуулна.
    ADD COLUMN IF NOT EXISTS tacit         BOOLEAN NOT NULL DEFAULT false;

-- Төлөвийн машины бүрэн толь. Хуучин мөрүүдийн утга (submitted/in_review/
-- approved/rejected/completed/cancelled) бүгд энэ олонлогт багтана тул
-- одоо байгаа өгөгдөлд аюулгүй.
ALTER TABLE gov_applications DROP CONSTRAINT IF EXISTS gov_applications_status_check;
ALTER TABLE gov_applications
    ADD CONSTRAINT gov_applications_status_check CHECK (status IN (
        'submitted',     -- иргэн илгээв
        'registered',    -- албан ёсоор бүртгэгдэв, SLA цаг эхлэв
        'in_review',     -- менежер хянаж байна
        'info_required', -- иргэнээс нэмэлт баримт хүлээж байна
        'approved',      -- зөвшөөрөв
        'rejected',      -- татгалзав
        'completed',     -- гаралт олгогдов
        'cancelled',     -- иргэн буцаав
        'expired'        -- хугацаа дуусав
    ));

-- Менежерийн дараалал: нээлттэй хүсэлтийг хугацааны дарааллаар (хамгийн
-- яаралтай нь эхэнд). Partial index — терминал төлөвүүдийг индексэд оруулахгүй.
CREATE INDEX IF NOT EXISTS idx_gov_applications_queue
    ON gov_applications (due_at)
    WHERE status IN ('submitted','registered','in_review','info_required');
CREATE INDEX IF NOT EXISTS idx_gov_applications_assignee
    ON gov_applications (assigned_to, status);

-- ---------------------------------------------------------------------------
-- 4. Хүсэлтийн timeline (append-only). relay_events-ийн загвар боловч энд
--    ИРГЭНИЙ өгөгдөл тул RLS-тэй. user_id-г denormalize хийсэн нь RLS бодлогыг
--    join-гүй, энгийн байлгах зорилготой.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gov_application_events (
    id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id uuid NOT NULL REFERENCES gov_applications(id) ON DELETE CASCADE,
    user_id        uuid NOT NULL,          -- хүсэлт эзэмшигч иргэн (RLS-д)
    actor_id       uuid,                   -- үйлдэл хийсэн хүн (иргэн эсвэл менежер)
    actor_role     TEXT NOT NULL DEFAULT '',
    from_status    TEXT NOT NULL DEFAULT '',
    to_status      TEXT NOT NULL DEFAULT '',
    type           TEXT NOT NULL,          -- created/registered/assigned/decided/...
    detail         TEXT NOT NULL DEFAULT '',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gov_application_events_app
    ON gov_application_events (application_id, created_at);

-- ---------------------------------------------------------------------------
-- 5. RLS — шинэ 'officer' үүрэг
--
-- Менежер нь ӨӨРИЙН биш, бусад иргэний хүсэлтийг хянах ёстой тул одоогийн
-- service|admin|user толинд багтахгүй. Шинэ 'officer' GUC утга нэмж, зөвхөн
-- ЭНД шаардлагатай хүснэгтүүдэд бодлого өгнө: hүсэлт (хянах/шийдэх), лавлагаа
-- (гаралт олгох), мэдэгдэл (иргэнд мэдэгдэх), timeline.
--
-- users, gov_payments, gov_appointments зэрэгт officer-ийн бодлого ЗОРИУДААР
-- байхгүй — RLS permissive (OR) тул бодлого таарахгүй бол тэг мөр харагдана
-- (fail-closed). Өөрөөр хэлбэл менежер иргэний төлбөр/цаг захиалга/бүртгэлийн
-- мэдээлэлд хүрэхгүй — least-privilege.
-- ---------------------------------------------------------------------------

CREATE POLICY gov_applications_officer ON gov_applications
    USING (current_setting('app.user_role', true) = 'officer')
    WITH CHECK (current_setting('app.user_role', true) = 'officer');

CREATE POLICY gov_references_officer ON gov_references
    USING (current_setting('app.user_role', true) = 'officer')
    WITH CHECK (current_setting('app.user_role', true) = 'officer');

CREATE POLICY gov_notifications_officer ON gov_notifications
    USING (current_setting('app.user_role', true) = 'officer')
    WITH CHECK (current_setting('app.user_role', true) = 'officer');

ALTER TABLE gov_application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE gov_application_events FORCE  ROW LEVEL SECURITY;

CREATE POLICY gov_application_events_service ON gov_application_events
    USING (current_setting('app.user_role', true) = 'service')
    WITH CHECK (current_setting('app.user_role', true) = 'service');
CREATE POLICY gov_application_events_admin ON gov_application_events
    USING (current_setting('app.user_role', true) = 'admin')
    WITH CHECK (current_setting('app.user_role', true) = 'admin');
CREATE POLICY gov_application_events_officer ON gov_application_events
    USING (current_setting('app.user_role', true) = 'officer')
    WITH CHECK (current_setting('app.user_role', true) = 'officer');
-- Иргэн зөвхөн өөрийн хүсэлтийн түүхийг УНШИНА (бичихгүй) — timeline-г зөвхөн
-- систем/менежер бичнэ. USING нь SELECT-д, WITH CHECK (false) нь INSERT/UPDATE-д.
CREATE POLICY gov_application_events_self ON gov_application_events
    USING (
        current_setting('app.user_role', true) = 'user'
        AND user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
    )
    WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- 6. Эрхийн каталог (domain.AllPermissions-той таарна)
-- ---------------------------------------------------------------------------

INSERT INTO permissions(key, label, category) VALUES
    ('gov.review',  'Иргэний хүсэлт хянах',        'management'),
    ('gov.catalog', 'Үйлчилгээний каталог удирдах','administration')
ON CONFLICT (key) DO NOTHING;

-- manager (id=3) нь иргэний хүсэлтийг хянана. admin нь бүх эрхэд автоматаар
-- resolve хийгддэг тул энд бичихгүй (migration 8-ийн загвар).
INSERT INTO role_permissions(role_id, permission_key) VALUES
    (3, 'gov.review')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. Каталогийн seed — COFOG дээр суурилсан тогтолцоот код
--
-- Кодын бүтэц: MN-<COFOG 4 орон>-<дугаар>
--   MN     — ISO 3166-1 alpha-2 улсын код
--   COFOG  — НҮБ-ын Classification of the Functions of Government (цэггүй)
--   дугаар — тухайн ангилал доторх дараалал
-- Жишээ: MN-0133-002 = Монгол / COFOG 01.3.3 "Бусад ерөнхий үйлчилгээ" / №2.
--
-- Хуучин дур мэдсэн кодуудыг (CIVIL_ID, TAX_CLEAR г.м.) шинэ стандарт код руу
-- буулгана. Хэрэв хүснэгт хоосон бол доорх INSERT бүгдийг үүсгэнэ.
-- ---------------------------------------------------------------------------

UPDATE gov_services SET code = 'MN-0133-001' WHERE code = 'CIVIL_ID';
UPDATE gov_services SET code = 'MN-0133-002' WHERE code = 'RESIDENCE';
UPDATE gov_services SET code = 'MN-0112-001' WHERE code = 'TAX_CLEAR';
UPDATE gov_services SET code = 'MN-1090-001' WHERE code = 'SOCIAL_INS';
UPDATE gov_services SET code = 'MN-0450-001' WHERE code = 'DRIVER_LIC';
UPDATE gov_services SET code = 'MN-0133-003' WHERE code = 'MARRIAGE';
UPDATE gov_services SET code = 'MN-0721-001' WHERE code = 'HEALTH_INS';
UPDATE gov_services SET code = 'MN-0411-001' WHERE code = 'BIZ_REG';

INSERT INTO gov_services
    (code, name, category, agency, description, fee, processing_days, online,
     cofog_code, cofog_label, processing_time, output_type, output_ref_type,
     evidence, legal_basis, assurance_level, fulfilment, sla_hours, tacit_approval)
VALUES
    -- ── Шууд биелэх (auto): бүртгэлээс уншиж олгодог лавлагаа/тодорхойлолт ──
    ('MN-0133-002', 'Оршин суугаа газрын лавлагаа', 'Бүртгэл', 'УБЕГ',
     'Оршин суугаа хаягийн албан ёсны лавлагаа. Улсын бүртгэлээс шууд олгогдоно.',
     500, 0, true, '01.3.3', 'Бусад ерөнхий үйлчилгээ', 'PT0S', 'Declaration', 'residence',
     '["Иргэний үнэмлэх (eID-ээр баталгаажна)"]',
     'Иргэний улсын бүртгэлийн тухай хууль', 'substantial', 'auto', 0, false),

    ('MN-0112-001', 'Татварын тодорхойлолт', 'Татвар', 'ТЕГ',
     'Татварын өргүй эсэх тухай тодорхойлолт. Татварын мэдээллийн сангаас шууд олгогдоно.',
     0, 0, true, '01.1.2', 'Санхүү, татварын асуудал', 'PT0S', 'Declaration', 'tax',
     '["Иргэний үнэмлэх (eID-ээр баталгаажна)"]',
     'Татварын ерөнхий хууль', 'substantial', 'auto', 0, false),

    ('MN-1090-001', 'Нийгмийн даатгалын лавлагаа', 'Нийгмийн хамгаалал', 'НДЕГ',
     'Шимтгэл төлөлтийн дэлгэрэнгүй лавлагаа. Даатгалын сангаас шууд олгогдоно.',
     0, 0, true, '10.9.0', 'Нийгмийн хамгаалал, бусад', 'PT0S', 'Declaration', 'social_ins',
     '["Иргэний үнэмлэх (eID-ээр баталгаажна)"]',
     'Нийгмийн даатгалын тухай хууль', 'substantial', 'auto', 0, false),

    ('MN-0721-001', 'Эрүүл мэндийн даатгалын лавлагаа', 'Эрүүл мэнд', 'ЭМД',
     'Эрүүл мэндийн даатгалын төлөв, төлөлтийн лавлагаа.',
     0, 0, true, '07.2.1', 'Эмнэлгийн ерөнхий үйлчилгээ', 'PT0S', 'Declaration', 'health_ins',
     '["Иргэний үнэмлэх (eID-ээр баталгаажна)"]',
     'Эрүүл мэндийн даатгалын тухай хууль', 'substantial', 'auto', 0, false),

    ('MN-0133-004', 'Төрсний гэрчилгээний лавлагаа', 'Бүртгэл', 'УБЕГ',
     'Төрсний бүртгэлийн албан ёсны лавлагаа.',
     500, 0, true, '01.3.3', 'Бусад ерөнхий үйлчилгээ', 'PT0S', 'Declaration', 'birth',
     '["Иргэний үнэмлэх (eID-ээр баталгаажна)"]',
     'Иргэний улсын бүртгэлийн тухай хууль', 'substantial', 'auto', 0, false),

    -- ── Менежер хянаж шийдвэрлэдэг (manual) ──
    ('MN-0133-001', 'Иргэний үнэмлэх захиалах', 'Бүртгэл', 'УБЕГ',
     'Иргэний үнэмлэх шинээр авах, дахин захиалах.',
     25000, 7, true, '01.3.3', 'Бусад ерөнхий үйлчилгээ', 'P7D', 'Physical object', '',
     '["Цээж зураг","Хуучин үнэмлэх (дахин захиалах бол)","Улсын тэмдэгтийн хураамж төлсөн баримт"]',
     'Иргэний үнэмлэхийн тухай хууль', 'high', 'manual', 168, false),

    ('MN-0450-001', 'Жолооны үнэмлэх сунгах', 'Тээвэр', 'Зам тээврийн хөгжлийн яам',
     'Жолоочийн үнэмлэхний хугацаа сунгах.',
     35000, 5, false, '04.5.0', 'Тээвэр', 'P5D', 'Permit', '',
     '["Эрүүл мэндийн магадлагаа","Хуучин жолооны үнэмлэх","Хураамж төлсөн баримт"]',
     'Замын хөдөлгөөний аюулгүй байдлын тухай хууль', 'high', 'manual', 120, true),

    ('MN-0133-003', 'Гэрлэлт бүртгүүлэх', 'Бүртгэл', 'УБЕГ',
     'Гэрлэлт бүртгүүлэх, гэрчилгээ авах.',
     15000, 3, false, '01.3.3', 'Бусад ерөнхий үйлчилгээ', 'P3D', 'Recognition', '',
     '["Хоёр талын иргэний үнэмлэх","Эрүүл мэндийн үзлэгийн хуудас"]',
     'Гэр бүлийн тухай хууль', 'high', 'manual', 72, false),

    ('MN-0411-001', 'Аж ахуйн нэгж бүртгүүлэх', 'Бизнес', 'УБЕГ',
     'ХХК/ХК шинээр улсын бүртгэлд бүртгүүлэх.',
     44000, 10, true, '04.1.1', 'Худалдаа, эдийн засгийн ерөнхий асуудал', 'P10D', 'Recognition', '',
     '["Компанийн дүрэм","Үүсгэн байгуулагчдын шийдвэр","Оноосон нэрийн баталгаажуулалт"]',
     'Хуулийн этгээдийн улсын бүртгэлийн тухай хууль', 'substantial', 'manual', 240, true),

    ('MN-0310-001', 'Ял эдэлж байгаагүй тодорхойлолт', 'Хууль, эрх зүй', 'ЦЕГ',
     'Ял шийтгэлгүй болохыг нотлох тодорхойлолт. Цагдаагийн байгууллага хянана.',
     3000, 2, true, '03.1.0', 'Цагдаагийн үйлчилгээ', 'P2D', 'Declaration', 'criminal',
     '["Иргэний үнэмлэх (eID-ээр баталгаажна)"]',
     'Цагдаагийн албаны тухай хууль', 'high', 'manual', 48, false)
ON CONFLICT (code) DO UPDATE SET
    cofog_code      = EXCLUDED.cofog_code,
    cofog_label     = EXCLUDED.cofog_label,
    processing_time = EXCLUDED.processing_time,
    output_type     = EXCLUDED.output_type,
    output_ref_type = EXCLUDED.output_ref_type,
    evidence        = EXCLUDED.evidence,
    legal_basis     = EXCLUDED.legal_basis,
    assurance_level = EXCLUDED.assurance_level,
    fulfilment      = EXCLUDED.fulfilment,
    sla_hours       = EXCLUDED.sla_hours,
    tacit_approval  = EXCLUDED.tacit_approval;

-- ── Life / Business event seed ──────────────────────────────────────────────
-- Эхний 7 нь EU 2018/1724 Annex II-ийн life event-үүд ЯГ тэр дарааллаараа
-- (en_label нь Annex II-ийн эх мөр). Монгол улс уг зохицуулалтад хамаарахгүй ч
-- олон улсын харьцуулалт, дараа талын cross-border нийцлийн үүднээс каноник
-- олонлогийг хэвээр авав. Дараагийнх нь үндэсний өргөтгөл (source='national').
INSERT INTO gov_life_events(code, name, kind, source, en_label, sort_order) VALUES
    ('birth',     'Хүүхэд төрөх',       'life',     'sdg',      'Birth',            10),
    ('residence', 'Оршин суух',         'life',     'sdg',      'Residence',        20),
    ('studying',  'Суралцах',           'life',     'sdg',      'Studying',         30),
    ('working',   'Ажил эрхлэх',        'life',     'sdg',      'Working',          40),
    ('moving',    'Шилжин суурьших',    'life',     'sdg',      'Moving',           50),
    ('retiring',  'Тэтгэвэрт гарах',    'life',     'sdg',      'Retiring',         60),
    ('business',  'Бизнес эхлүүлэх, эрхлэх, хаах', 'business', 'sdg',
                  'Starting, running and closing a business',                       70),
    -- Үндэсний өргөтгөлүүд — Annex II-д байхгүй ч Монголын каталогт шаардлагатай.
    ('family',    'Гэр бүл',            'life',     'national', '',                 80),
    ('vehicle',   'Тээврийн хэрэгсэл',  'life',     'national', '',                 90),
    ('health',    'Эрүүл мэнд',         'life',     'national', '',                100)
ON CONFLICT (code) DO NOTHING;

INSERT INTO gov_service_events(service_id, event_code)
SELECT s.id, v.event_code
FROM (VALUES
    ('MN-0133-001','residence'),
    ('MN-0133-002','residence'),
    ('MN-0133-002','moving'),
    ('MN-0133-004','birth'),
    ('MN-0133-003','family'),
    ('MN-0112-001','working'),
    ('MN-1090-001','working'),
    ('MN-1090-001','retiring'),
    ('MN-0721-001','health'),
    ('MN-0450-001','vehicle'),
    ('MN-0411-001','business'),
    ('MN-0310-001','working')
) AS v(code, event_code)
JOIN gov_services s ON s.code = v.code
ON CONFLICT DO NOTHING;
