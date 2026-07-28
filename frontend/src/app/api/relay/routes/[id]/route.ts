import { authedFetch } from '@gerege/ui-core/lib/api';
import { proxyResult, checkOrigin, checkUUID } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

// DELETE /api/relay/routes/{id} — чиглүүлэлт устгах. relay.manage.
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const bad = checkOrigin(req) ?? checkUUID(params.id);
  if (bad) return bad;
  return proxyResult(await authedFetch(`/relay/routes/${params.id}`, { method: 'DELETE' }));
}
