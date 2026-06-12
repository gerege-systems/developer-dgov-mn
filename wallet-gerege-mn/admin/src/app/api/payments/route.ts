import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('limit') ?? '200';
  const r = await adminFetch<{ payments: unknown[] }>(`/admin/payments?limit=${encodeURIComponent(q)}`);
  if (r.ok) return NextResponse.json(r.data);
  return NextResponse.json({ message: r.message }, { status: r.status });
}
