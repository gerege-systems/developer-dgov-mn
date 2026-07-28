import { authedFetch } from '@gerege/ui-core/lib/api';
import { proxyResult } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/registry/overview — Ring R1 регистрийн нэгтгэл. registry.view.
export async function GET() {
  return proxyResult(await authedFetch('/registry/overview', { method: 'GET' }));
}
