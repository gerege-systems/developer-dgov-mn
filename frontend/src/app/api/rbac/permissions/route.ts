import { authedFetch } from '@gerege/ui-core/lib/api';
import { proxyResult } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/rbac/permissions — эрхийн каталог (RBAC matrix-ийн багана). roles.manage.
export async function GET() {
  return proxyResult(await authedFetch('/rbac/permissions', { method: 'GET' }));
}
