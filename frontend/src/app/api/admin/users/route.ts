import { authedFetch } from '@/lib/api';
import { proxyResult } from '@/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/admin/users — хэрэглэгчдийн жагсаалт (query: offset/limit/role/active).
// users.manage эрхээр хамгаалагдсан (backend дээр).
export async function GET(req: Request) {
  const qs = new URL(req.url).search;
  return proxyResult(await authedFetch(`/admin/users${qs}`, { method: 'GET' }));
}
