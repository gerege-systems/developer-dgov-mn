import React from 'react';
import { redirect } from 'next/navigation';
import PageHead from '@gerege/ui-core/components/PageHead';
import ThemeManager from '@gerege/ui-core/components/admin/ThemeManager';
import { UiCoreProvider } from '@gerege/ui-core';
import { landingCopy } from '@/components/landing/copy';
import { fetchMe, fetchMyPermissions } from '@gerege/ui-core/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Landing theme — Админ' };

export default async function AdminThemesPage() {
  const me = await fetchMe();
  if (!me) redirect('/login?next=/admin/themes');
  const perms = await fetchMyPermissions();
  if (!perms.includes('settings.manage')) redirect('/');

  return (
    <>
      <PageHead eyebrowKey="sys.admin" titleKey="themes.title" subKey="themes.sub" />
      {/* landingCopy (460 мөр) нь зөвхөн ThemeEditor-т хэрэгтэй — root layout-д
          өгвөл бүх хуудасны client bundle-д орох тул энд л нэмнэ. */}
      <UiCoreProvider landingCopy={landingCopy}>
        <ThemeManager />
      </UiCoreProvider>
    </>
  );
}
