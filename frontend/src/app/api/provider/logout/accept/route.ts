import { authedFetch } from '@gerege/ui-core/lib/api';
import { checkOrigin, proxyResult, readJson } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const bad = checkOrigin(req);
  if (bad) return bad;
  const body = await readJson<{ logout_challenge?: string }>(req);
  return proxyResult(
    await authedFetch('/provider/logout/accept', { method: 'POST', body: JSON.stringify(body) }),
  );
}
