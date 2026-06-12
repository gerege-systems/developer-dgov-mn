import { NextResponse } from 'next/server';
import { hasSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Wallet API-ийн OpenAPI spec-ийг сервер талаас татаж буцаана. Зөвхөн нэвтэрсэн
// admin (cookie session) хандана — middleware + энд давхар шалгана (defense-in-depth).
const SRC = process.env.WALLET_OPENAPI_URL ?? 'https://wallet.gerege.mn/openapi.yaml';

export async function GET() {
  if (!hasSession()) {
    return new NextResponse('unauthorized', { status: 401 });
  }
  try {
    const res = await fetch(SRC, { cache: 'no-store' });
    if (!res.ok) return new NextResponse('spec unavailable', { status: 502 });
    const text = await res.text();
    return new NextResponse(text, {
      status: 200,
      headers: { 'Content-Type': 'application/yaml; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch {
    return new NextResponse('spec fetch failed', { status: 502 });
  }
}
