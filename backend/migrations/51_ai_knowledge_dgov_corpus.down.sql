-- Government Template Platform V3.0
-- Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.
--
-- 51-ээр НЭМЭГДСЭН дэд системийн бичлэгүүдийг устгана.
--
-- Анхаар: 51 нь мөн 50-гийн зарим бичлэгийг (platform-overview, ai-voice,
-- ai-limits, gov-portal, frontend-routes, security-rls, security-rbac-roles,
-- ai-knowledge-base, ai-assistant-overview, monorepo-layout) дарж бичсэн.
-- Тэдгээрийн ӨМНӨХ текстийг энэ файл сэргээхгүй — SQL-д хуучин утга
-- хадгалагддаггүй. Бүрэн буцаах шаардлагатай бол 50-г дахин ажиллуулна
-- (тэр нь ON CONFLICT DO UPDATE тул өөрийн хувилбарыг буцааж тавина).
DELETE FROM ai_knowledge WHERE slug IN (
    'registry-overview',
    'registry-standards',
    'registry-evidences-once-only',
    'registry-life-events',
    'registry-publish-lifecycle',
    'gov-fulfilment-modes',
    'gov-workflow-states',
    'gov-sla-clock',
    'gov-officer-queue',
    'gov-application-events',
    'catalog-public',
    'relay-overview',
    'relay-webhook-hmac',
    'relay-sla-escalation',
    'platform-access-mode',
    'superadmin-onboarding-mfa',
    'ai-public-chat'
);
