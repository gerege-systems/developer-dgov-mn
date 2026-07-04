import { authedFetch } from '@/lib/api';
import { proxyResult } from '@/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/me/eid/organizations — нэвтэрсэн eID хэрэглэгчийн төлөөлдөг
// байгууллагууд (eidmongolia.mn representations). backend /users/me/eid/
// organizations руу проксилно.
export async function GET() {
  return proxyResult(await authedFetch('/users/me/eid/organizations', { method: 'GET' }));
}
