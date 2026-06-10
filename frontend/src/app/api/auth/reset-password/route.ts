import { backendFetch } from '@/lib/api';
import { readJson, toClientResponse, checkOrigin } from '@/lib/bff';

export const dynamic = 'force-dynamic';

// POST /api/auth/reset-password — и-мэйлээр ирсэн OTP код + шинэ нууц үгээр
// сэргээнэ. Нууц үг сэргээх нь GeregeCloud Verify OTP-аар явдаг тул токены
// оронд email + код шаардана.
export async function POST(req: Request) {
  const bad = checkOrigin(req);
  if (bad) return bad;

  const { email, code, new_password } = await readJson<{
    email?: string;
    code?: string;
    new_password?: string;
  }>(req);
  const result = await backendFetch('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ email, code, new_password }),
  });
  return toClientResponse(result);
}
