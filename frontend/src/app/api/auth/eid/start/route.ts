import { backendFetch } from '@/lib/api';
import { checkOrigin, proxyResult } from '@/lib/bff';

export const dynamic = 'force-dynamic';

// eID нэвтрэлтийн эхлэл — backend /auth/eid/start руу прокси. Энд токен
// үүсэхгүй тул start өгөгдлийг (session_id, device_link_url, verification_code,
// expires_at) клиент рүү шууд дамжуулна. State-changing тул checkOrigin эхэлнэ.
export interface EidStartData {
  session_id: string;
  device_link_url: string;
  verification_code: string;
  expires_at: string;
}

export async function POST(req: Request) {
  const bad = checkOrigin(req);
  if (bad) return bad;

  const result = await backendFetch<EidStartData>('/auth/eid/start', { method: 'POST' });
  return proxyResult(result);
}
