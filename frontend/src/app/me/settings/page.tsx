import { pageTitle } from '@/brand.config';
import React from 'react';
import { redirect } from 'next/navigation';
import SettingsView from '@gerege/ui-core/components/me/SettingsView';
import { fetchMe } from '@gerege/ui-core/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: pageTitle('Тохиргоо') };

export default async function MeSettingsPage() {
  const me = await fetchMe();
  if (!me) redirect('/login?next=/me/settings');
  return <SettingsView />;
}
