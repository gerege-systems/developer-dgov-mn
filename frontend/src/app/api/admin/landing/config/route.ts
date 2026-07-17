import { NextResponse } from 'next/server';
import { authedFetch } from '@/lib/api';
import { proxyResult, readJson, checkOrigin } from '@/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/admin/landing/config — одоогийн нүүрний тохиргоог админ засварлагчид
// татна. Backend уншилт нь нийтийн боловч токентой дамжуулж нэгдсэн байлгана.
export async function GET() {
  return proxyResult(await authedFetch('/landing/config', { method: 'GET' }));
}

// PUT /api/admin/landing/config — нүүрний тохиргооны баримтыг бүхэлд нь солих
// (settings.manage эрхээр backend дээр хамгаалагдсан). Body нь бүрэн JSON
// объект; хэмжээ/схем/ариутгал шалгалтыг backend хийнэ.
export async function PUT(req: Request) {
  const bad = checkOrigin(req);
  if (bad) return bad;

  const body = await readJson<Record<string, unknown>>(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ ok: false, status: 400, message: 'Тохиргоо буруу байна.' }, { status: 400 });
  }

  return proxyResult(
    await authedFetch('/admin/landing/config', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  );
}
