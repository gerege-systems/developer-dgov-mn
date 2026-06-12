import { NextResponse, type NextRequest } from 'next/server';

// JWT payload-ийн exp-ийг (HS256, гарын үсэг шалгахгүй — зөвхөн UX) уншиж хүчинтэй
// эсэхийг буцаана. Гарын үсгийн жинхэнэ шалгалтыг admin API хийнэ.
function tokenLive(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64)) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

// Хамгаалалт: токен cookie БАЙГАА БА хүчинтэй (exp дуусаагүй) эсэхийг шалгана.
// Дууссан/буруу бол cookie-г устгаад /login руу — токен дуусахад автоматаар гарна.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }
  if (!tokenLive(req.cookies.get('wadmin_token')?.value)) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    const res = NextResponse.redirect(url);
    res.cookies.delete('wadmin_token');
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
