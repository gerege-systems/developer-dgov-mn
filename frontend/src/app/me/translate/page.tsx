import { pageTitle } from '@/brand.config';
import React from 'react';
import { redirect } from 'next/navigation';
import LiveTranslateView from '@gerege/ui-core/components/me/LiveTranslateView';
import { fetchMe } from '@gerege/ui-core/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: pageTitle('Шууд орчуулга') };

export default async function MeTranslatePage() {
  const me = await fetchMe();
  if (!me) redirect('/login?next=/me/translate');
  return <LiveTranslateView />;
}
