import React from 'react';
import { redirect } from 'next/navigation';
import LiveTranslateView from '@/components/me/LiveTranslateView';
import { fetchMe } from '@/lib/api';
import { pageTitle } from '@/brand.config';

export const dynamic = 'force-dynamic';
export const metadata = { title: pageTitle('Шууд орчуулга') };

export default async function MeTranslatePage() {
  const me = await fetchMe();
  if (!me) redirect('/login?next=/me/translate');
  return <LiveTranslateView />;
}
