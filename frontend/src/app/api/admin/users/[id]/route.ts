import { authedFetch } from '@/lib/api';
import { proxyResult, checkOrigin } from '@/lib/bff';

export const dynamic = 'force-dynamic';

// DELETE /api/admin/users/{id} — хэрэглэгчийг зөөлөн устгах.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const bad = checkOrigin(req);
  if (bad) return bad;
  return proxyResult(await authedFetch(`/admin/users/${params.id}`, { method: 'DELETE' }));
}
