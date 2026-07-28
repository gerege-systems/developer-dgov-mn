import React from 'react';
import PageHead from '@/components/PageHead';
import RegistryOverviewView from '@/components/registry/RegistryOverviewView';
import { requireRegistryAccess } from './guard';
import { pageTitle } from '@/brand.config';

export const dynamic = 'force-dynamic';
export const metadata = { title: pageTitle('Үйлчилгээний регистр') };

export default async function Page() {
  await requireRegistryAccess();
  return (
    <>
      <PageHead eyebrowKey="group.registry" titleKey="nav.registryOverview" subKey="registry.overview.sub" />
      <RegistryOverviewView />
    </>
  );
}
