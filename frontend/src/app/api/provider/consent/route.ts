// OIDC provider — consent request-ийн товчийг backend-ээс авна.
import { authedFetch } from '@gerege/ui-core/lib/api';
import { proxyResult } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const challenge = new URL(req.url).searchParams.get('consent_challenge') ?? '';
  return proxyResult(
    await authedFetch(`/provider/consent?consent_challenge=${encodeURIComponent(challenge)}`, {
      method: 'GET',
    }),
  );
}
