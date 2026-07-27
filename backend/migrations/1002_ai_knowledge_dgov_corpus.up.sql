-- Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.
--
-- Мэдлэгийн корпусыг ЭНЭ репогийн бодит код болон баримттай тэнцүүлнэ.
--
-- Яагаад: 50-р migration-ий корпус нь өөр деплойн (олон салбарт зориулсан
-- ерөнхий платформ) тайлбараар бичигдсэн байсан бөгөөд энэ репогийн ХАМГИЙН
-- онцлог гурван дэд систем — үйлчилгээний нэгдсэн регистр (CPSV-AP паспорт),
-- төрийн үйлчилгээний хүсэлтийн workflow (SLA, officer дараалал), платформ
-- хоорондын хүсэлт дамжуулах relay — огт дурдагдаагүй байв. AI туслах
-- мэдлэгийн сангаас олдоогүй зүйлээ "мэдэхгүй" гэж хариулдаг тул эдгээр
-- боломжийн талаар асуухад хоосон хариу өгч байв.
--
-- 50-г ЗАСАХГҮЙ: тэр аль хэдийн production-д хэрэглэгдсэн, migration runner нь
-- файлын нэрээр бүртгэдэг тул засвар дахин ажиллахгүй. Иймд энэ файл нь
-- (а) буруу/хуучирсан бичлэгүүдийг slug-аар нь дарж бичиж, (б) дутуу дэд
-- системүүдийн бичлэгийг нэмнэ. ON CONFLICT нь агуулга өөрчлөгдсөн мөрийн
-- embedding-ийг NULL болгох тул backfill дахин вектор тооцно.
--
-- Эх сурвалж: backend/docs/SERVICE_WORKFLOW_MN.md, backend/docs/AI_PIPELINE_MN.md,
-- migrations 41-50, route_registry.go, route_relay.go, route_gov.go,
-- route_catalog.go, route_superadmin.go, cmd/api/server/server.go.

INSERT INTO ai_knowledge (slug, title, content, tags, source, lang) VALUES

-- ══ ЗАСВАР: байр суурь ба бүтэц ═══════════════════════════════════════════
('platform-overview', 'Government Template Platform гэж юу вэ',
 'Government Template Platform V3.0 бол ТӨРИЙН аливаа цахим үйлчилгээг дээр нь босгох, үйлдвэрлэлд бэлэн суурь платформ. Уриа нь "Цахим засаглалыг бүтээх суурь". Бүрэлдэхүүн: Clean Architecture-тэй Go backend (chi + pgx + PostgreSQL + Redis), Next.js BFF frontend, Gemini AI pipeline. Иргэний танилт (eID), нэгдсэн нэвтрэлт, цахим гарын үсэг, үйлчилгээний регистр, хүсэлтийн workflow, аюулгүй байдлын тулгуурыг дахин бүтээхгүйгээр шууд ашиглана. MIT лицензтэй нээлттэй эх. Эталон deployment нь template.dgov.mn.',
 '{платформ,тойм,танилцуулга,цахим засаглал}', 'docs/README', 'mn'),

('monorepo-layout', 'Репозиторын бүтэц',
 'Монорепо: backend/ (Go API, migrations, docs), frontend/ (Next.js BFF), docs-site/ (MkDocs Material сайт, mn/en/zh/ru), ios/TemplateApp (SwiftUI жишиг клиент), docs/ (deploy, аюулгүй байдал, хувь нэмэр), deploy/ (nginx, deploy.sh). Backend дотор: cmd/api/server/server.go нь бүх холболтын цэг (гар DI), internal/business (domain + 25 usecase, тэдгээрийн дотор registry, gov, relay, oidc, provider, superadmin_onboarding), internal/datasources (pgx, кэш, RLS, репозитор), internal/http (handler, middleware, route, DTO), pkg/ (eid, google, gemini, oidc, xyp, gspace, ssoeidproxy, jwt г.м.).',
 '{бүтэц,монорепо,directory}', 'backend/docs/ARCHITECTURE', 'mn'),

-- ══ ШИНЭ: үйлчилгээний нэгдсэн регистр ════════════════════════════════════
('registry-overview', 'Үйлчилгээний нэгдсэн регистр',
 'Үйлчилгээний МАСТЕР өгөгдөл нь registry_services хүснэгт — CPSV-AP (Core Public Service Vocabulary) стандартын паспорт. gov_services нь түүний АЖЛЫН ПРОЕКЦ: иргэний портал болон хүсэлтийн workflow тэр хүснэгт дээр ажиллана. Холбоос нь gov_services.registry_service_id (UNIQUE). Гол дүрэм: gov_services-ийг ГАРААР засахгүй — паспортоо засаад дахин нийтэлнэ, ProjectToGov нь ажлын каталогийг паспортын агуулгатай тэнцүүлнэ. Админ гадаргуу: /admin/registry, /admin/registry/services, /admin/registry/evidences. API: /api/v1/registry/* (registry.view / registry.manage эрх).',
 '{регистр,registry,cpsv-ap,паспорт,каталог}', 'backend/docs/SERVICE_WORKFLOW', 'mn'),

('registry-standards', 'Регистрийн олон улсын кодчилол',
 'Паспортын талбарууд олон улсын толь ашиглана: code нь ISO 3166 + COFOG суурьтай (жишээ MN-0133-002); cofog_code нь НҮБ-ын COFOG 1999 (жишээ 01.3.3); main_activity нь ЕХ-ны main-activity authority table (жишээ gen-pub); sdg_code нь Single Digital Gateway (EU 2018/1724) Annex II procedure (жишээ S1); processing_time нь ISO 8601 duration (жишээ P7D); output_type нь CPSV-AP Output толь (жишээ Declaration); assurance_level нь eIDAS (Reg. 910/2014 Art.8) түвшин. ЧУХАЛ ЯЛГАА: CPSV-AP-ийн "COFOG main activity Authority Table" нь ЖИНХЭНЭ COFOG биш, тэр нь ЕХ-ны худалдан авалтын жагсаалт — тиймээс НҮБ-ын COFOG-ийг cofog_code-д ТУСАД нь хадгална.',
 '{регистр,стандарт,cofog,sdg,eidas,iso}', 'backend/docs/SERVICE_WORKFLOW', 'mn'),

('registry-evidences-once-only', 'Нотолгоо ба нэг удаагийн зарчим',
 'registry_service_evidences нь үйлчилгээ тус бүрд иргэнээс шаардах баримтын жагсаалт. Нотолгоо бүр from_citizen тэмдэгтэй: ХУР зэрэг улсын системд аль хэдийн байгаа баримтыг from_citizen=false болгоно — тэгснээр иргэнд харагдах жагсаалт богиносно. Энэ нь "нэг удаа" (once-only) зарчим: төр нэгэнт эзэмшсэн мэдээллээ иргэнээс дахин нэхэх ёсгүй. GET /api/v1/registry/once-only болон /services/{id}/once-only нь зөрчлүүдийг (иргэнээс дахин нэхэж буй, бүртгэлд байгаа баримт) илрүүлж жагсаана. Зөрчилтэй үйлчилгээг зарласан проактив байдлын шатанд нийтлэх боломжгүй.',
 '{регистр,нотолгоо,evidence,once-only,хур}', 'backend/docs/SERVICE_WORKFLOW', 'mn'),

('registry-life-events', 'Амьдралын үйл явдал (life events)',
 'registry_life_events нь үйлчилгээг иргэний амьдралын нөхцлөөр (төрөлт, гэрлэлт, оршин суух газар өөрчлөх, бизнес эхлүүлэх) бүлэглэдэг толь. eu_code талбар нь ЕХ-ны life/business event толийн код (жишээ RES — оршин суух, STBU — бизнес эхлүүлэх). Иргэн нэг үйл явдлаас хамаарах бүх үйлчилгээг нэг дороос олно. Нийтийн API: GET /api/v1/catalog/life-events (нэвтрэлтгүй), нэвтэрсэн талд GET /api/v1/gov/life-events, админ талд /api/v1/registry/life-events (POST нэмэх, DELETE устгах).',
 '{регистр,life event,амьдралын үйл явдал,каталог}', 'backend/docs/SERVICE_WORKFLOW', 'mn'),

('registry-publish-lifecycle', 'Паспортын амьдралын мөчлөг',
 'Паспорт гурван төлөвтэй: draft (ноорог), published (нийтлэгдсэн), archived (архивласан). POST /api/v1/registry/services/{id}/publish нь хувилбар үүсгэж gov_services руу проекц хийнэ (мөр үүсэх эсвэл шинэчлэгдэж enabled=true болно). POST .../archive нь enabled=false, lifecycle=withdrawn болгоно — мөрийг УСТГАХГҮЙ, учир нь gov_applications.service_id түүн рүү заасан байдаг тул устгавал иргэний хүсэлтийн түүх тасарна. Хувилбарын түүхийг GET /services/{id}/versions-ээр харна.',
 '{регистр,нийтлэх,архивлах,хувилбар,lifecycle}', 'backend/docs/SERVICE_WORKFLOW', 'mn'),

-- ══ ШИНЭ: төрийн үйлчилгээний хүсэлтийн workflow ═══════════════════════════
('gov-fulfilment-modes', 'Автомат ба гар шийдвэрлэлт',
 'registry_services.fulfilment нь иргэн юу хүлээхийг тодорхойлно. auto — бүртгэлээс уншиж олгодог лавлагаа/тодорхойлолт: хүн оролцохгүй, хүсэлт-лавлагаа-мэдэгдэл НЭГ транзакцид үүсч төлөв шууд completed болно, менежерийн дараалалд ОРОХГҮЙ. manual — хүсэлт registered төлөвтэй үүсч SLA хугацаа тамгалагдан дараалалд орно, иргэнд "хүлээн авлаа" мэдэгдэл очно. Энэ хуваалт EU 2018/1724 Art. 6(2)-той нийцнэ. ЭРХ ЗҮЙН ШАЛГУУР: fulfilment=auto нь has_discretion ба has_assessment ХОЁУЛАА false үед л хадгалагдана (Германы VwVfG §35a загвар — үнэлэх эрх буюу Ermessen, урьдчилсан нөхцлийн үнэлгээний зай буюу Beurteilungsspielraum байхгүй үед л бүрэн автоматжуулна). Usecase давхарга үүнийг албадана.',
 '{gov,workflow,auto,manual,vwvfg,автоматжуулалт}', 'backend/docs/SERVICE_WORKFLOW', 'mn'),

('gov-workflow-states', 'Хүсэлтийн төлөвийн машин',
 'Төлөвүүд: submitted → registered → in_review → approved → completed. in_review-ээс info_required руу (нэмэлт мэдээлэл нэхэх) шилжиж буцаж болно. Аль ч үе шатнаас rejected / cancelled / expired руу гарч болно. Зөвшөөрөгдсөн шилжилтүүд domain.govTransitions-д тодорхойлогдож domain.GovCanTransition-оор шалгагдана; repository давхарга МӨН ижил дүрмийг SQL WHERE status IN (...) guard болгон ДАХИН хэрэгжүүлнэ — тэр нь хоёр менежер зэрэг "Батлах" дарах уралдааныг хаана, 0 мөр хөндөгдвөл apperror.Conflict. approved vs completed: гаралт нь лавлагаа бол шийдвэр гармагц completed; гаралт нь БИЕТ зүйл (үнэмлэх, гэрчилгээ) бол approved-д хүлээж, хэвлэгдэж хүргэгдсэний дараа officer complete үйлдлээр хаана. Үр дүнгийн толь (result) төлөвөөс ТУСДАА: granted, refused, withdrawn, not_admissible, processed.',
 '{gov,workflow,төлөв,state machine,хүсэлт}', 'backend/docs/SERVICE_WORKFLOW', 'mn'),

('gov-sla-clock', 'SLA хугацаа ба цаг зогсоох',
 'due_at нь хүсэлт үүсэх үед НЭГ УДАА тамгалагдана — уншилт бүрт дахин тооцвол хугацаа гулсаж зөрчлийг нуух байсан. info_required төлөвт шилжихэд suspended_at тамгалагдаж SLA цаг ЗОГСОНО; иргэн мэдээллээ өгөхөд due_at нь зогссон хугацааны туршид хойшилно, ингэснээр иргэний удаашрал байгууллагын зөрчил болж бүртгэгдэхгүй (Голландын Awb 4:15 загвар). Background worker SLASweep 60 секунд тутам хоёр зүйл хийнэ: (1) хугацаа хэтэрсэн хүсэлтэд sla_breached латч тавьж иргэнд НЭГ УДАА мэдэгдэнэ, цаг зогссоныг АЛГАСНА; (2) tacit_approval=true үйлчилгээний хугацаа хэтэрсэн хүсэлтийг зөвшөөрөгдсөнд тооцож tacit=true тэмдэглэн иргэнд ил мэдэгдэнэ. Чимээгүй зөвшөөрөл нь EU Services Directive 2006/123/EC Art. 13(4)-т тулгуурласан боловч МОНГОЛД ШУУД ХҮЧИН ТӨГӨЛДӨР БИШ — өгөгдмөл нь false, үйлчилгээ тус бүрийн эрх зүйн үндэслэлийг Монголын хуулиар баталгаажуулах ёстой.',
 '{gov,sla,хугацаа,tacit,чимээгүй зөвшөөрөл}', 'backend/docs/SERVICE_WORKFLOW', 'mn'),

('gov-officer-queue', 'Менежерийн дараалал ба officer RLS',
 'Менежер (role_id=3, gov.review эрхтэй) иргэний хүсэлтийг /api/v1/gov/officer/* дор хянана: GET /stats (дарааллын үзүүлэлт), GET /queue (жагсаалт), GET /queue/{id}, POST /queue/{id}/assign (өөртөө авах), /decide (шийдвэр), /complete (хаах), /request-info (нэмэлт мэдээлэл нэхэх). Frontend: /manager/requests. RLS-ИЙН ОНЦЛОГ: менежер БУСАД иргэний хүсэлтийг харах ёстой тул service|admin|user толинд багтахгүй — OfficerRLSContext middleware нь ЗӨВХӨН /gov/officer/* route-уудад app.user_role=officer тавина. Least-privilege: officer бодлого зөвхөн gov_applications, gov_references, gov_notifications, gov_application_events-д өгөгдсөн; users, gov_payments, gov_appointments-д бодлого БАЙХГҮЙ тул officer тэнд тэг мөр харна (fail-closed) — өөрөөр хэлбэл менежер иргэний төлбөр, цаг захиалга, бүртгэлийн мэдээлэлд хүрэхгүй. Middleware-ийг глобалаар суулгаж БОЛОХГҮЙ, тэгвэл менежер өөрийн профайлаа ч харахаа болино.',
 '{gov,officer,менежер,rls,дараалал,эрх}', 'backend/docs/SERVICE_WORKFLOW', 'mn'),

('gov-application-events', 'Хүсэлтийн ул мөр ба татгалзлын үндэслэл',
 'Хүсэлтийн шилжилт бүр gov_application_events хүснэгтэд зөвхөн нэмэх (append-only) байдлаар бичигдэнэ: хэн, хэзээ, ямар төлвөөс ямар төлөв рүү, ямар үндэслэлээр. Иргэн өөрийн хүсэлтийн түүхийг УНШИНА (RLS бодлого нь WITH CHECK (false) — бичихгүй); менежер бүгдийг харна. Иргэний талд GET /api/v1/gov/applications/{id}/timeline. ЧУХАЛ: татгалзах шийдвэр ҮНДЭСЛЭЛГҮЙ байж болохгүй — usecase давхарга хоосон тайлбартай татгалзлыг татгалзана, учир нь иргэн юунд татгалзсаныг мэдэж гомдол гаргах эрхтэй.',
 '{gov,timeline,ул мөр,татгалзал,аудит}', 'backend/docs/SERVICE_WORKFLOW', 'mn'),

('catalog-public', 'Нийтийн үйлчилгээний каталог',
 'Нэвтрэлтгүй үзэх боломжтой каталог: GET /api/v1/catalog/services (нийтлэгдсэн үйлчилгээний жагсаалт), GET /api/v1/catalog/services/{id} (дэлгэрэнгүй — шаардах баримт, хугацаа, гаралт), GET /api/v1/catalog/life-events (амьдралын үйл явдлаар бүлэглэсэн). Эдгээр нь регистрийн нийтлэгдсэн паспортоос уншина. Нэвтэрсэн иргэн ижил өгөгдлийг /api/v1/gov/services дороос хүсэлт гаргах товчтойгоор харна (frontend /me/services).',
 '{каталог,нийтийн,catalog,үйлчилгээ}', 'backend/docs/API_CONTRACT', 'mn'),

-- ══ ШИНЭ: платформ хоорондын relay ════════════════════════════════════════
('relay-overview', 'Платформ хоорондын хүсэлт дамжуулах (relay)',
 'Relay нь ЭНЭ платформ болон бусад платформ хооронд хугацаатай үйлчилгээний хүсэлт дамжуулах дэд систем. Дээд (upstream) платформоос ирсэн хүсэлтийг хүлээж авч (Ingest), routing дүрмээр доод (downstream) платформууд руу assignment болгон хуваарилж, заасан хугацаанд биелэлтийг хянаж, хариуг цуглуулна (Respond). Админ гадаргуу: /admin/relay (хяналтын самбар), /admin/relay/config (платформ ба чиглүүлэлтийн дүрэм), /admin/relay/{id} (хүсэлтийн дэлгэрэнгүй). API: POST /api/v1/relay/requests (ingest), POST /assignments/{id}/respond, GET /overview, /requests, /platforms, /routes. Эрх: relay.view (харах) ба relay.manage (өөрчлөх).',
 '{relay,платформ,дамжуулах,хүсэлт,assignment}', 'backend/internal/business/usecases/relay', 'mn'),

('relay-webhook-hmac', 'Peer webhook ба HMAC гарын үсэг',
 'Гадны платформтой хоёр чиглэлд webhook-оор холбогдоно. Орж ирэх: POST /api/v1/relay/webhook нь нэвтрэлтгүй нийтийн endpoint — бүртгэлтэй peer платформын кодоор танигдаж, биеийн HMAC гарын үсгээр баталгаажина, зөвхөн тэгсний дараа шинэ хүсэлт болж ingest хийгдэнэ. Гарах: POST /api/v1/relay/requests/{id}/forward нь хүсэлтийг сонгосон дээд платформ руу HMAC гарын үсэгтэй webhook-оор дамжуулна (тайлагнах эсвэл шат ахиулах). Peer платформ бүр өөрийн кодтой, нууц түлхүүртэй бөгөөд /api/v1/relay/platforms дор бүртгэгдэнэ.',
 '{relay,webhook,hmac,peer,гарын үсэг}', 'backend/internal/business/usecases/relay', 'mn'),

('relay-sla-escalation', 'Relay-ийн SLA хяналт ба демо горим',
 'Relay-ийн background worker SLASweep нь дөрвөн шатаар ажиллана: сануулга (reminder), хугацаа хэтэрсэн (overdue), зөрчил (breach), шат ахиулах (escalate). Хүсэлт бүр өөрийн хугацааны цонхтой бөгөөд доод платформ хариу өгөхгүй бол автоматаар шат ахина. ДЕМО ГОРИМ (RELAY_DEMO_MODE): SimulateStep нь доод платформуудын нэрийн өмнөөс хариу үүсгэж зарим хүсэлтийг overdue болгоно, SimulateIngest нь богино SLA цонхтой шинэ демо хүсэлт үүсгэнэ — ингэснээр хяналтын самбар бодит интеграцгүйгээр өөрөө хөдөлнө. Демо горимд биелэгдсэн хүсэлт дээд платформ руу автоматаар дамжина. Энэ нь зөвхөн үзүүлэн: production-д унтраана.',
 '{relay,sla,escalate,демо,simulator}', 'backend/internal/business/usecases/relay', 'mn'),

-- ══ ШИНЭ: платформын хандалт, супер админ ═════════════════════════════════
('platform-access-mode', 'Платформын хандалтын горим (public / private)',
 'Платформ хоёр горимтой: public — Government SSO-оор баталгаажсан ХЭН Ч нэвтэрч болно (өгөгдмөл); private — зөвхөн админаас УРЬДЧИЛАН бүртгэсэн (регистрийн дугаар / civil_id-ээр тохирох) иргэн нэвтэрнэ, бусад нь eID-ээр амжилттай баталгаажсан ч 403 авна. Тохиргоо нь platform_settings singleton хүснэгтэд (id=1) хадгалагдаж, ЗӨВХӨН супер админ өөрчилнө: GET болон PUT /api/v1/superadmin/access-mode. Private горимд иргэнийг урьдчилан бүртгэхдээ Админ хэсгээс регистрийн дугаараар нь үүсгэж role оноодог — иргэн хожим Government SSO-оор эхэлж нэвтэрхэд тэр мөр civil_id/sso_sub-ээр холбогдоно.',
 '{хандалт,access mode,public,private,урьдчилан бүртгэл}', 'backend/migrations/43_platform_access', 'mn'),

('superadmin-onboarding-mfa', 'Супер админы эхлүүлэлт ба MFA',
 'Супер админ нь админ хэрэглэгчдийг удирдах цорын ганц үүрэг: /api/v1/superadmin/admins (жагсаах, үүсгэх, регистрийн дугаараар үүсгэх), /admins/{id}/grant (эрх олгох), DELETE /admins/{id} (хасах), /invites (урилга). Тусдаа нэвтрэх гадаргуутай: /superadmin/login болон анхны тохиргооны шидтэн /superadmin/onboard. Хамгаалалт нь TOTP хоёр хүчин зүйлт баталгаажуулалт (migration 35) — TOTP нууцыг AES-GCM-ээр (INTEGRATION_ENC_KEY) шифрлэн хадгална, тиймээс тэр түлхүүрийг сольвол супер админы MFA сэргээгдэхгүй. Супер админыг энгийн API-аар хэзээ ч үүсгэхгүй.',
 '{супер админ,mfa,totp,onboarding,урилга}', 'backend/README', 'mn'),

-- ══ ЗАСВАР: AI-ийн бодит зан төлөв ════════════════════════════════════════
('ai-assistant-overview', 'AI туслах юу хийдэг вэ',
 'AI туслах нь Gemini дээр суурилсан бөгөөд платформын талаарх асуултад мэдлэгийн санд тулгуурлаж хариулна. Модел ямар хэрэгсэл (tool) дуудахаа шийднэ, backend түүнийг гүйцэтгэнэ — модел өөрөө хэзээ ч код ажиллуулахгүй. Хэрэгслүүд хүсэлтийн контекстээр ажилладаг тул RLS болон timeout хамаарна. ХОЁР ГАДАРГУУ: (1) нэвтэрсэн туслах — frontend /me/ai, бүрэн tool багцтай; (2) нүүр хуудасны НЭЭЛТТЭЙ чат — нэвтрэлтгүй хөвөгч виджет, ТУСДАА usecase instance дээр зөвхөн мэдлэгийн сангийн хайлтын tool-той ажиллана. Энэ тусгаарлалт нь аюулгүй байдлын хил: хэрэглэгчийн өгөгдөл уншдаг tool-ыг нэвтэрсэн туслахад нэмэхэд нэргүй зочинд хүрэхгүй.',
 '{ai,туслах,gemini,tool,нээлттэй чат}', 'backend/docs/AI_PIPELINE', 'mn'),

('ai-public-chat', 'Нүүр хуудасны нээлттэй AI чат',
 'Нүүр хуудасны баруун доод буланд нэвтрэлтгүй ашиглах хөвөгч чат виджет байрлана. Endpoint: POST /api/v1/public/ai/chat (хариу авах) ба POST /api/v1/public/ai/tts (хариултыг чанга уншуулах). Хамгаалалтын дөрвөн давхарга: (1) зөвхөн мэдлэгийн сангийн хайлтын tool, (2) тусдаа rate limiter — нэг IP-аас минутад ойролцоогоор 6 хүсэлт (burst 3), (3) богино payload — мессеж 1000 тэмдэгт, түүх 6 ээлж, аудио ойролцоогоор 250 KB base64, (4) system prompt дээр нэмэлт хориг: зочны хувийн мэдээллийг (регистрийн дугаар, утас, нууц үг, картын мэдээлэл) хэзээ ч асуухгүй, бүртгэлийн өгөгдөлд хандах боломжгүй гэдгээ ил хэлнэ, хувийн лавлагаа шаардсан асуултад нэвтрэхийг эелдэгээр зөвлөнө. Виджет нь дарж барих (push-to-talk) дуут горимтой.',
 '{ai,нээлттэй чат,нэвтрэлтгүй,виджет,хязгаар}', 'backend/docs/AI_PIPELINE', 'mn'),

('ai-knowledge-base', 'Мэдлэгийн сан ба семантик хайлт',
 'Платформын мэдлэг ai_knowledge хүснэгтэд бүлэг бүлгээр хадгалагдана. Бичлэг бүр Gemini-ийн embedding моделиор 768 хэмжээст вектор болж, pgvector дээр cosine ойролцоо хайлтаар (HNSW индекс) хайгддаг — тиймээс хэрэглэгч өөр үг хэллэгээр асуусан ч утга санааны хувьд ойр бүлгүүд олдоно. Model нэрийг ХАТУУ бичдэггүй: client нь gemini-embedding-001 → text-embedding-004 → embedding-001 гэж боломжтойг нь автоматаар сонгоно (нэр бүр бүх API түлхүүрт байдаггүй). Шүүлт нь ХАРЬЦАНГУЙ: дээд 8 нэрээс хамгийн сайн оноотойгоос тодорхой хэмжээгээр доогуур зайтайг нь хасаж, 2-оос 4 бүлэг үлдээнэ (энэ корпус дээр хамааралгүй бүлгүүд ч 0.64-өөс дээш оноотой гардаг тул тогтмол босго ажилладаггүй). Embedding үүсээгүй, Gemini түлхүүр байхгүй, эсвэл шүүлтээс юу ч үлдээгүй бол ILIKE түлхүүр үгийн хайлт руу уналт хийнэ. Агуулга засвал POST /api/v1/admin/ai/knowledge/reindex-ээр вектороо шинэчилнэ (ачаалалтын дараа автоматаар ч гүйцээнэ).',
 '{ai,мэдлэгийн сан,vector,embedding,pgvector,reindex}', 'backend/docs/AI_PIPELINE', 'mn'),

('ai-voice', 'Дуу хоолойн боломжууд',
 'Дуут мессеж: микрофоноор бичээд илгээхэд аудио эхлээд ТЕКСТ болж хөрвөнө (STT), дараа нь текстээр чатална. Хуулбар нь хариуд буцаж ирэх бөгөөд хэрэглэгчийн бөмбөлөгт харагдана — ингэснээр юу сонсогдсоныг иргэн шалгаж чадах ба ярианы түүх "дуут мессеж" гэсэн орлуулагчаар дүүрэхгүй. Яриа→текст: POST /api/v1/ai/stt. Текст→яриа: POST /api/v1/ai/tts — WAV буцаадаг тул хөтөч дээр шууд тоглоно. Нүүрийн нээлттэй чатад дарж барих (push-to-talk) том дугуй товч, хариулт бүрд "сонсох" товч байна. Шууд орчуулга: /me/translate хуудас микрофоны ойролцоогоор 7 секундын хэсгүүдийг /ai/translate руу дараалан илгээж бодит цагт орчуулна; чимээгүй хэсэг хоосон ирвэл алгасна.',
 '{ai,дуу хоолой,stt,tts,орчуулга,push-to-talk}', 'backend/docs/AI_PIPELINE', 'mn'),

('ai-limits', 'AI-ийн хязгаарлалт ба алдаа',
 'Нэвтэрсэн /ai/* нь нэг IP-аас минутад ойролцоогоор 20 хүсэлт зөвшөөрнө (шууд орчуулга минутад ойролцоогоор 8 хэсэг илгээдэг тул багтана); мессеж 4000 тэмдэгт, түүх 20 ээлж, аудио ойролцоогоор 700 KB base64. Нээлттэй /public/ai/* нь хамаагүй чанга: минутад ойролцоогоор 6 хүсэлт, мессеж 1000 тэмдэгт, түүх 6 ээлж. AI зам нь 50 секундын timeout-той (ерөнхий хязгаар 30 секунд) — TTS/STT/орчуулга удаан ажилладаг тул. АЛДААНЫ ЗАН ТӨЛӨВ: Gemini түр зуур ажиллахгүй бол хүсэлт 5xx болж унахгүй, хэрэглэгчид уучлалт хүссэн нөөц мессеж (degraded=true) очно; түр зуурын саатал 503 болж буурна (500 биш, учир нь дахин оролдвол болох магадлалтай); GEMINI_API_KEY огт тохируулаагүй бол л жинхэнэ 500 гарна.',
 '{ai,лимит,degraded,алдаа,503,timeout}', 'backend/docs/AI_PIPELINE', 'mn'),

-- ══ ЗАСВАР: эрх, RLS, хуудсууд ════════════════════════════════════════════
('security-rbac-roles', 'Эрхийн систем (RBAC) ба үүргүүд',
 'Дөрвөн зэрэглэлтэй үүрэг (1 нь хамгийн өндөр): супер админ = 1, админ = 2, менежер = 3, хэрэглэгч = 4. Админ бүх зөвшөөрлийг автоматаар эзэмшинэ; бусад үүргийн зөвшөөрлийг Админ → Эрх (RBAC) хэсгээс динамикаар тохируулна (супер админы багана тэр матрицад харагдахгүй — түүний эрхийг энэ дэлгэцээр удирддаггүй). Гол зөвшөөрлүүд: gov.review (менежер иргэний хүсэлт хянах), registry.view / registry.manage (үйлчилгээний паспорт, нотолгоо, нийтлэлт), relay.view / relay.manage, settings.manage (AI prompt, мэдлэгийн сан), users.manage. Route-ууд RequirePermission / RequireAdmin / RequireSuperAdmin middleware-ээр хамгаалагдана. GET /api/v1/rbac/me нь хэрэглэгчийн бодит зөвшөөрлүүдийг өгдөг — цэсийг үүгээр шүүнэ. Үүргээс ТУСДАА "officer" гэсэн RLS үүрэг байдаг: тэр нь зөвхөн /gov/officer/* замд өгөгддөг DB-ийн түвшний контекст, RBAC-ийн үүрэг БИШ.',
 '{rbac,эрх,үүрэг,role,officer}', 'backend/docs/ARCHITECTURE', 'mn'),

('security-rls', 'Мөр бүрийн хандалтын хяналт (RLS)',
 'Хэрэглэгчийн өгөгдөл бүхий хүснэгт бүрд Postgres Row-Level Security ENABLE + FORCE хэлбэрээр асаалттай: users, organizations, organization_memberships, user_integrations, gov_* (applications, references, notifications, payments, appointments, application_events) болон бусад хэрэглэгч тус бүрийн хүснэгт. Хүсэлтийн эзэн SET LOCAL app.user_id / app.user_role GUC-ээр гүйлгээ бүрд дамжина (withRLS). Эзэнгүй хүсэлт GUC хоосон үлдээх тул ямар ч бодлого таарахгүй — бүх мөр нуугдаж, бичих үйлдэл татгалзана (fail-closed). Үүрэг тус бүрийн толь: service (системийн ажил, жишээ SLASweep нь rls.WithService(ctx)-ээр заавал тавина, эс тэгвэл тэг мөр харна), admin, user, officer. RLS нь permissive (OR) тул бодлого өгөөгүй хүснэгт дээр тухайн үүрэг тэг мөр харна — энэ нь санаатай fail-closed загвар. Энэ бүхэн репозиторын WHERE нөхцөлийн ДЭЭР нэмэгдсэн давхар хамгаалалт.',
 '{аюулгүй байдал,rls,postgres,тусгаарлалт,officer}', 'backend/docs/SECURITY', 'mn'),

('frontend-routes', 'Үндсэн хуудсууд',
 'Нэвтэрсэн иргэн: /me/dashboard, /me/profile, /me/settings, /me/ai (AI туслах), /me/translate (шууд орчуулга), /me/eid/* (үнэмлэх, гэрчилгээ, төхөөрөмж, түүх, аюулгүй байдал, гарын үсэг), /me/organizations, /me/integrations, /me/services, /me/applications, /me/references, /me/notifications, /me/payments, /me/appointments. Менежер: /manager/dashboard, /manager/requests (иргэний хүсэлтийн дараалал), /manager/users. Админ: /admin/dashboard, /admin/users, /admin/roles, /admin/superadmin, /admin/audit, /admin/security, /admin/settings, /admin/themes, /admin/applications, /admin/core, /admin/gateway/* (тойм, сервисүүд, лог), /admin/registry/* (үйлчилгээний паспорт, нотолгоо), /admin/relay/* (платформ хоорондын хүсэлт, тохиргоо). Супер админ: /superadmin/login, /superadmin/onboard. Нэвтрэлтгүй: нүүр хуудас (AI чат виджеттэй), /login, /oauth/*. Зүүн цэс нь гурван түвшинтэй: Систем → Дэд систем (accordion) → Цэс.',
 '{хуудас,route,цэс,навигаци}', 'frontend/README', 'mn'),

('gov-portal', 'Төрийн үйлчилгээний портал',
 'Иргэн рүү харсан "Төрийн үйлчилгээ" гадаргуу: үйлчилгээний каталог, хүсэлт (application), лавлагаа, мэдэгдэл, төлбөр, цаг захиалга. Каталог нь регистрийн нийтлэгдсэн паспортын проекц (gov_services) — гараар засдаггүй. Бүх өгөгдөл хэрэглэгч тус бүрийнх: токеноос гарсан userID-гаар шүүгдэж, Postgres RLS-ээр давхар хамгаалагдана. Endpoint-ууд /api/v1/gov/* дор (services, life-events, overview, applications, applications/{id}/timeline, references, notifications, payments, appointments); frontend дээр /me/services, /me/applications, /me/references, /me/notifications, /me/payments, /me/appointments. Хүсэлт гаргасны дараах явц нь үйлчилгээний fulfilment горимоос хамаарна: auto бол шууд биелнэ, manual бол менежерийн дараалалд орно.',
 '{gov,төрийн үйлчилгээ,хүсэлт,лавлагаа,каталог}', 'backend/docs/API_CONTRACT', 'mn')

ON CONFLICT (slug) DO UPDATE SET
    title      = EXCLUDED.title,
    content    = EXCLUDED.content,
    tags       = EXCLUDED.tags,
    source     = EXCLUDED.source,
    lang       = EXCLUDED.lang,
    updated_at = now(),
    -- Агуулга өөрчлөгдсөн бол embedding-ийг хүчингүй болгоно — backfill дахин
    -- тооцоолж, хайлт хуучин вектороор андуурахгүй.
    embedding    = CASE WHEN ai_knowledge.content IS DISTINCT FROM EXCLUDED.content
                        THEN NULL ELSE ai_knowledge.embedding END,
    content_hash = CASE WHEN ai_knowledge.content IS DISTINCT FROM EXCLUDED.content
                        THEN NULL ELSE ai_knowledge.content_hash END;

-- Гараар id өгсөн хуучин seed-тэй зөрчилдөхгүйн тулд sequence-ийг гүйцээнэ.
SELECT setval('ai_knowledge_id_seq', GREATEST((SELECT MAX(id) FROM ai_knowledge), 1));
