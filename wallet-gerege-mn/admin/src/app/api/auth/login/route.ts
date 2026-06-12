import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api';
import { setToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

// POST /api/auth/login — admin API руу нэвтэрч токеныг httpOnly cookie-д хадгална.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const r = await adminFetch<{ token: string }>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: body.username ?? '', password: body.password ?? '' }),
  });
  if (r.ok && r.data?.token) {
    setToken(r.data.token);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, message: r.ok ? 'no token' : r.message }, { status: 401 });
}
