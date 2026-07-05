import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authedFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

// GET /api/integrations/google-login/callback — Google OAuth redirect-ийг хүлээн
// авч, state-ийг тулгаад code-ийг backend /auth/google/link руу дамжуулж, тухайн
// нэвтэрсэн хэрэглэгчид Google account-ийг холбоно.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = process.env.APP_ORIGIN ?? url.origin;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const savedState = cookies().get('gi_oauth_state')?.value;
  cookies().delete('gi_oauth_state');

  const back = (q: string) => NextResponse.redirect(`${origin}/me/integrations?${q}`);

  if (url.searchParams.get('error') || !code) return back('error=denied&provider=google');
  if (!state || !savedState || state !== savedState) return back('error=invalid_state&provider=google');

  const redirectUri = `${origin}/api/integrations/google-login/callback`;
  const r = await authedFetch('/auth/google/link', {
    method: 'POST',
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });

  if (r.ok) return back('connected=Google');
  if (r.status === 409) return back('error=conflict&provider=google');
  return back('error=exchange_failed&provider=google');
}
