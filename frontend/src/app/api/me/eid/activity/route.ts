import { authedFetch } from '@gerege/ui-core/lib/api';
import { proxyResult } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/me/eid/activity — eID PKI самбар (backend /users/me/eid/activity руу прокси).
export async function GET(req: Request) {
  const qs = new URL(req.url).search;
  return proxyResult(await authedFetch(`/users/me/eid/activity${qs}`, { method: 'GET' }));
}
