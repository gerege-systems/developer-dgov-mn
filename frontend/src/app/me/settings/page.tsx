import React from 'react';
import { redirect } from 'next/navigation';
import SettingsView from '@/components/me/SettingsView';
import { fetchMe } from '@/lib/api';
import { pageTitle } from '@/brand.config';

export const dynamic = 'force-dynamic';
export const metadata = { title: pageTitle('Тохиргоо') };

export default async function MeSettingsPage() {
  const me = await fetchMe();
  if (!me) redirect('/login?next=/me/settings');
  return <SettingsView />;
}
