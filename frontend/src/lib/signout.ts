import { postJSON } from './client';

// Гарах: BFF-ийн logout route-г дуудаж (refresh токенг backend-ийн blacklist руу
// илгээж, cookie-г цэвэрлэнэ), дараа нь /login руу шилжинэ. Сүлжээ амжилтгүй ч
// гэсэн client талаас шилжүүлж, дахин нэвтрэхийг шаардана.
export async function signOut(): Promise<void> {
  try {
    await postJSON('/api/auth/logout', undefined);
  } catch {
    /* алдаа гарсан ч доор шилжүүлнэ */
  } finally {
    window.location.href = '/login';
  }
}
