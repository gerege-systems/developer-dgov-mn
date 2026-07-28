import { authedFetch } from '@gerege/ui-core/lib/api';
import { proxyResult } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/admin/ai/prompts — AI prompt давхаргуудын жагсаалт.
// settings.manage эрхээр хамгаалагдсан (backend дээр).
export async function GET() {
  return proxyResult(await authedFetch('/admin/ai/prompts', { method: 'GET' }));
}
