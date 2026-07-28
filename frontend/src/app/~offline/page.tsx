// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Офлайн fallback хуудас. Service worker үүнийг precache хийж (next.config.mjs
// дахь additionalPrecacheEntries), сүлжээ унасан үед аль ч хуудасны оронд
// үзүүлнэ. Энэ бол цорын ганц офлайнд хадгалагддаг HTML — аппын бодит агуулга
// хэзээ ч кэшлэгддэггүй.

import SigninShell from '@/components/SigninShell';
import OfflineCard from './OfflineCard';
import { pageTitle } from '@/brand.config';

export const metadata = {
  title: pageTitle('Офлайн'),
};

export default function OfflinePage() {
  return (
    <SigninShell>
      <OfflineCard />
    </SigninShell>
  );
}
