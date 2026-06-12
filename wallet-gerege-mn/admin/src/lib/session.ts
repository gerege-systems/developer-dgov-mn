import 'server-only';
import { cookies } from 'next/headers';

// Admin токеныг httpOnly cookie-д хадгална (browser-т хэзээ ч хүрэхгүй).
const COOKIE = 'wadmin_token';
const secure = process.env.COOKIE_SECURE !== 'false';

export function getToken(): string {
  return cookies().get(COOKIE)?.value ?? '';
}

export function setToken(token: string): void {
  cookies().set(COOKIE, token, { httpOnly: true, secure, sameSite: 'lax', path: '/' });
}

export function clearToken(): void {
  cookies().delete(COOKIE);
}

export function hasSession(): boolean {
  return !!cookies().get(COOKIE)?.value;
}
