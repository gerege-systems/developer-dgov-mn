import { authedFetch } from '@/lib/api';
import { proxyResult, checkOrigin } from '@/lib/bff';

export const dynamic = 'force-dynamic';

// POST /api/admin/ai/knowledge/reindex — мэдлэгийн сангийн вектор индексийг
// шинэчилнэ (embedding дутуу / агуулга нь өөрчлөгдсөн бичлэгүүд). Backend дээр
// settings.manage эрхээр хамгаалагдсан; хариунд { embedded } тоо ирнэ.
export async function POST(req: Request) {
  const bad = checkOrigin(req);
  if (bad) return bad;

  return proxyResult(await authedFetch('/admin/ai/knowledge/reindex', { method: 'POST' }));
}
