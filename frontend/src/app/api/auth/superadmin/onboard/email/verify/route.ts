import { backendFetch } from '@gerege/ui-core/lib/api';
import { checkOrigin, proxyResult, readJson } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

// POST /api/auth/superadmin/onboard/email/verify — онбординг и-мэйлийн 6 оронтой
// кодыг шалгах. Invite-gated тул НЭВТРЭЭГҮЙ (onboard_token + code).
export async function POST(req: Request) {
  const bad = checkOrigin(req);
  if (bad) return bad;
  const body = await readJson(req);
  return proxyResult(
    await backendFetch('/auth/superadmin/onboard/email/verify', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
}
