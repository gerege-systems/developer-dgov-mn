import 'server-only';
import { NextResponse } from 'next/server';
import type { ApiResult } from './api';

// BFF route handler-уудын хуваалцсан туслахууд.

/** Request body-г аюулгүйгээр JSON болгож уншина. */
export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

/**
 * CSRF-ийн эсрэг хоёр давхар хамгаалалт. State-changing route-ууд дээр:
 *
 *  1. Custom header (`x-gerege-csrf: 1`) шаардана — cross-site form POST
 *     custom header тавьж чаддаггүй, cross-origin fetch нь preflight-д
 *     CORS-оор хаагддаг тул энэ header нь хүсэлт өөрийн JS-ээс
 *     (lib/client.ts sendJSON) гарсныг баталдаг. SameSite=Lax-ийн
 *     top-level navigation цонхыг (form POST) бүрэн хаана.
 *  2. `Origin` толгой байвал аппын origin-той тулгана (APP_ORIGIN env,
 *     эсвэл хүсэлтийн өөрийн URL).
 *
 * Зөрвөл 403 буцаах NextResponse-г, тааралцвал `null`-г буцаана.
 */
export function checkOrigin(req: Request): NextResponse | null {
  if (req.headers.get('x-gerege-csrf') !== '1') {
    return NextResponse.json(
      { ok: false, status: 403, message: 'CSRF header дутуу байна.' },
      { status: 403 },
    );
  }

  const origin = req.headers.get('origin');
  if (!origin) return null; // Origin байхгүй (non-browser) — header шалгалт хангалттай.

  const expected = process.env.APP_ORIGIN ?? new URL(req.url).origin;
  if (origin === expected) return null;

  return NextResponse.json(
    { ok: false, status: 403, message: 'Origin тохирохгүй байна.' },
    { status: 403 },
  );
}

/**
 * backend ApiResult-г browser рүү буцаах client хэлбэрт хувиргана. Токен зэрэг
 * нууц талбарыг хэзээ ч client рүү гаргахгүй — зөвхөн ok/status/message/fieldErrors.
 */
export function toClientResponse(r: ApiResult<unknown>): NextResponse {
  const httpStatus = r.ok ? 200 : r.status >= 400 && r.status < 600 ? r.status : 502;
  return NextResponse.json(
    {
      ok: r.ok,
      status: r.status,
      message: r.message,
      ...(r.ok ? {} : { fieldErrors: r.fieldErrors }),
    },
    { status: httpStatus },
  );
}

/**
 * toClientResponse-тэй адил боловч өгөгдлийг (data) клиент рүү дамжуулна.
 * Admin/RBAC жагсаалт зэрэг нууц БУС өгөгдлийг буцаах BFF route-уудад ашиглана
 * (хэзээ ч токен агуулдаггүй).
 */
export function proxyResult<T>(r: ApiResult<T>): NextResponse {
  const httpStatus = r.ok ? 200 : r.status >= 400 && r.status < 600 ? r.status : 502;
  return NextResponse.json(
    {
      ok: r.ok,
      status: r.status,
      message: r.message,
      ...(r.ok ? { data: r.data } : { fieldErrors: r.fieldErrors }),
    },
    { status: httpStatus },
  );
}
