import { authedFetch } from '@gerege/ui-core/lib/api';
import { proxyResult } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/me/eid/summary — eID PKI самбар (backend /users/me/eid/summary руу прокси).
export async function GET(req: Request) {
  const qs = new URL(req.url).search;
  return proxyResult(await authedFetch(`/users/me/eid/summary${qs}`, { method: 'GET' }));
}
