import React from 'react';
import { redirect } from 'next/navigation';
import PageHead from '@/components/PageHead';
import OrgList from '@/components/me/OrgList';
import { fetchMe } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Байгууллага — Gerege' };

export default async function MeOrganizationsPage() {
  const me = await fetchMe();
  if (!me) redirect('/login?next=/me/organizations');

  return (
    <>
      <PageHead eyebrowKey="sys.user" titleKey="org.title" subKey="org.sub" />
      <OrgList />
    </>
  );
}
