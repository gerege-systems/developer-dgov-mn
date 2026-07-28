import React from 'react';
import { redirect } from 'next/navigation';
import PageHead from '@/components/PageHead';
import GovReferencesView from '@/components/gov/GovReferencesView';
import { fetchMe } from '@/lib/api';
import { pageTitle } from '@/brand.config';

export const dynamic = 'force-dynamic';
export const metadata = { title: pageTitle('Лавлагаа') };

export default async function MeReferencesPage() {
  const me = await fetchMe();
  if (!me) redirect('/');
  return (
    <>
      <PageHead eyebrowKey="group.govServices" titleKey="nav.govReferences" subKey="gov.references.sub" />
      <GovReferencesView />
    </>
  );
}
