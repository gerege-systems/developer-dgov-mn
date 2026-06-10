import { authedFetch } from '@/lib/api';
import { proxyResult, readJson, checkOrigin } from '@/lib/bff';

export const dynamic = 'force-dynamic';

// PUT /api/admin/users/{id}/active — хэрэглэгчийг идэвхжүүлэх/хаах.
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const bad = checkOrigin(req);
  if (bad) return bad;
  const body = await readJson(req);
  return proxyResult(await authedFetch(`/admin/users/${params.id}/active`, { method: 'PUT', body: JSON.stringify(body) }));
}
