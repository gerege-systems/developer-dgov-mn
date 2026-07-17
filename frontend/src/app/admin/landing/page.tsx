import React from 'react';
import { redirect } from 'next/navigation';
import PageHead from '@/components/PageHead';
import LandingEditor from '@/components/admin/LandingEditor';
import { fetchMe, fetchMyPermissions } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Нүүр хуудас — Админ' };

export default async function AdminLandingPage() {
  const me = await fetchMe();
  if (!me) redirect('/login?next=/admin/landing');
  const perms = await fetchMyPermissions();
  if (!perms.includes('settings.manage')) redirect('/');

  return (
    <>
      <PageHead eyebrowKey="sys.admin" titleKey="nav.landing" subKey="admin.landing.sub" />
      <LandingEditor />
    </>
  );
}
