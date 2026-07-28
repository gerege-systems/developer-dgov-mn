// OIDC provider — login request-ийн товч (RP нэр гэх мэт)-ыг backend-ээс авна.
import { authedFetch } from '@gerege/ui-core/lib/api';
import { proxyResult } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const challenge = new URL(req.url).searchParams.get('login_challenge') ?? '';
  return proxyResult(
    await authedFetch(`/provider/login?login_challenge=${encodeURIComponent(challenge)}`, {
      method: 'GET',
    }),
  );
}
