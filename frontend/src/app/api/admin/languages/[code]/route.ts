import { NextResponse } from 'next/server';
import { authedFetch } from '@/lib/api';
import { proxyResult, toClientResponse, checkOrigin, checkLangCode, readJson } from '@/lib/bff';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/languages/{code} — идэвхжүүлэх/унтраах, нэр, locale, эрэмбэ.
// Заагаагүй талбар хэвээр үлдэнэ (хэсэгчилсэн шинэчлэлт).
export async function PATCH(req: Request, props: { params: Promise<{ code: string }> }) {
  const { code } = await props.params;
  const badCode = checkLangCode(code);
  if (badCode) return badCode;
  const bad = checkOrigin(req);
  if (bad) return bad;

  const body = await readJson<{
    label?: unknown;
    locale?: unknown;
    enabled?: unknown;
    sort_order?: unknown;
  }>(req);

  const patch: Record<string, unknown> = {};
  if (body.label !== undefined) {
    if (typeof body.label !== 'string' || body.label.trim() === '' || body.label.length > 80) {
      return NextResponse.json({ ok: false, status: 400, message: 'Хэлний нэр буруу байна.' }, { status: 400 });
    }
    patch.label = body.label.trim();
  }
  if (body.locale !== undefined) {
    if (typeof body.locale !== 'string') {
      return NextResponse.json({ ok: false, status: 400, message: 'Locale буруу байна.' }, { status: 400 });
    }
    patch.locale = body.locale.trim();
  }
  if (body.enabled !== undefined) {
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ ok: false, status: 400, message: 'enabled буруу байна.' }, { status: 400 });
    }
    patch.enabled = body.enabled;
  }
  if (body.sort_order !== undefined) {
    if (typeof body.sort_order !== 'number' || !Number.isInteger(body.sort_order)) {
      return NextResponse.json({ ok: false, status: 400, message: 'Эрэмбэ буруу байна.' }, { status: 400 });
    }
    patch.sort_order = body.sort_order;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, status: 400, message: 'Өөрчлөх талбар алга.' }, { status: 400 });
  }

  return proxyResult(
    await authedFetch(`/languages/${code}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  );
}

// DELETE /api/admin/languages/{code} — хэлийг устгах. Багцлагдсан хэлийг
// устгахыг backend хориглоно (зөвхөн унтраана).
export async function DELETE(req: Request, props: { params: Promise<{ code: string }> }) {
  const { code } = await props.params;
  const badCode = checkLangCode(code);
  if (badCode) return badCode;
  const bad = checkOrigin(req);
  if (bad) return bad;
  return toClientResponse(await authedFetch(`/languages/${code}`, { method: 'DELETE' }));
}
