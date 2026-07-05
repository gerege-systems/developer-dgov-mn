import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { cookieOptions } from '@/lib/cookies';

export const dynamic = 'force-dynamic';

// GET /api/integrations/google-login/connect — нэвтэрсэн хэрэглэгч Google account-аа
// профайлдаа холбохын тулд Google consent руу redirect. Login-ий start-аас ялгаатай
// нь энэ нь callback-даа тухайн ХЭРЭГЛЭГЧИД холбоно (шинэ session нээхгүй).
export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const origin = process.env.APP_ORIGIN ?? new URL(req.url).origin;
  if (!clientId) {
    return NextResponse.redirect(`${origin}/me/integrations?error=not_configured&provider=google`);
  }

  const state = crypto.randomUUID();
  cookies().set('gi_oauth_state', state, { ...cookieOptions(600), maxAge: 600 }); // 10 мин

  const redirectUri = `${origin}/api/integrations/google-login/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
