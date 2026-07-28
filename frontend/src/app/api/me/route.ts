import { authedFetch } from '@gerege/ui-core/lib/api';
import { proxyResult } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/me — нэвтэрсэн хэрэглэгчийн профайл (backend /users/me руу прокси).
// Browser-ийн RSC нь fetchMe() ашигладаг ч native клиент (iOS TemplateApp) энэ
// BFF route-оор хэрэглэгчийн мэдээллийг cookie session-оор авна.
export async function GET() {
  return proxyResult(await authedFetch('/users/me', { method: 'GET' }));
}
