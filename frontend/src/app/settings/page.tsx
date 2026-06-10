import React from 'react';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import SettingsView from '@/components/me/SettingsView';
import { fetchMe } from '@/lib/api';
import { initialsOf } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Аюулгүй байдал — Gerege' };

export default async function SettingsPage() {
  const me = await fetchMe();
  if (!me) redirect('/login?next=/settings');

  return (
    <AppShell user={{ username: me.username, email: me.email, initials: initialsOf(me.username), roleId: me.roleId }}>
      <SettingsView />
    </AppShell>
  );
}
