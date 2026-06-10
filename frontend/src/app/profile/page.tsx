import React from 'react';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import ProfileView from '@/components/me/ProfileView';
import { fetchMe } from '@/lib/api';
import { initialsOf } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Профайл — Gerege' };

export default async function ProfilePage() {
  const me = await fetchMe();
  if (!me) redirect('/login?next=/profile');

  return (
    <AppShell user={{ username: me.username, email: me.email, initials: initialsOf(me.username), roleId: me.roleId }}>
      <ProfileView me={me} />
    </AppShell>
  );
}
