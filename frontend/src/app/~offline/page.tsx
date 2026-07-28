// Gerege Template Platform V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Офлайн fallback хуудас. Service worker үүнийг precache хийж (next.config.mjs
// дахь additionalPrecacheEntries), сүлжээ унасан үед аль ч хуудасны оронд
// үзүүлнэ. Энэ бол цорын ганц офлайнд хадгалагддаг HTML — аппын бодит агуулга
// хэзээ ч кэшлэгддэггүй.

import SigninShell from '@/components/SigninShell';
import OfflineCard from './OfflineCard';

export const metadata = {
  title: 'Офлайн — Gerege Template Platform V3.0',
};

export default function OfflinePage() {
  return (
    <SigninShell>
      <OfflineCard />
    </SigninShell>
  );
}
