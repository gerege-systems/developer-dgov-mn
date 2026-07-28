import { backendFetch } from '@gerege/ui-core/lib/api';
import { proxyResult, checkLangCode } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/public/languages/{code}/dictionary — тухайн хэлний орчуулгын багц.
// Апп үүнийг багцлагдсан dictionary дээрээ давхарлана; хоосон/алдаа гарвал
// багцлагдсан утга хэвээр ажиллана.
export async function GET(_req: Request, props: { params: Promise<{ code: string }> }) {
  const { code } = await props.params;
  const bad = checkLangCode(code);
  if (bad) return bad;
  return proxyResult(await backendFetch(`/languages/${code}/dictionary`, { method: 'GET' }));
}
