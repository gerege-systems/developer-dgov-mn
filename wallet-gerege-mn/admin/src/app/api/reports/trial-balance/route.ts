import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get('date') ?? '';
  const r = await adminFetch<{ rows: unknown[] }>(`/admin/reports/trial-balance${date ? `?date=${encodeURIComponent(date)}` : ''}`);
  if (r.ok) return NextResponse.json(r.data);
  return NextResponse.json({ message: r.message }, { status: r.status });
}
