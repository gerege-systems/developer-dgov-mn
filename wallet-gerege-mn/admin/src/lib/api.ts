import 'server-only';
import { getToken } from './session';

// Admin API (cmd/admin) рүү server талаас хандах цорын ганц цэг. Browser энд
// хүрэхгүй; токен httpOnly cookie-оос.
const BASE = (process.env.ADMIN_API_URL ?? 'http://localhost:8093').replace(/\/$/, '');

export type ApiResult<T> =
  | { ok: true; status: number; data?: T }
  | { ok: false; status: number; message: string };

export async function adminFetch<T = unknown>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    return { ok: false, status: 503, message: 'admin API-тай холбогдож чадсангүй' };
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* 204 / non-JSON */
  }
  if (res.ok) return { ok: true, status: res.status, data: body as T };
  const msg = (body as { error?: string } | null)?.error ?? `Хүсэлт амжилтгүй (${res.status})`;
  return { ok: false, status: res.status, message: msg };
}
