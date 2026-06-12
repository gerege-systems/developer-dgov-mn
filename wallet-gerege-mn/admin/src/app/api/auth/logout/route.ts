import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/auth/logout — токен cookie-г устгаад /login руу.
// Relative Location ашиглана: nginx proxy-гийн ард Next нь контейнерийн дотоод
// host-ийг (req.url) авдаг тул absolute redirect буруу хаяг руу явуулдаг. Relative
// бол browser нь одоогийн public origin (admin.wallet.gerege.mn)-д тулгаж шийднэ.
export async function GET() {
  const res = new NextResponse(null, { status: 302, headers: { Location: '/login' } });
  res.cookies.delete('wadmin_token');
  return res;
}
