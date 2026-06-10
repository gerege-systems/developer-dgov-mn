import React from 'react';
import { redirect } from 'next/navigation';
import RolesManager from '@/components/admin/RolesManager';
import { fetchMe, fetchMyPermissions } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Эрх (RBAC) — Админ' };

export default async function AdminRolesPage() {
  const me = await fetchMe();
  if (!me) redirect('/login?next=/admin/roles');
  const perms = await fetchMyPermissions();
  if (!perms.includes('roles.manage')) redirect('/');

  return (
    <>
      <div className="page-head">
        <span className="page-head__eyebrow">Админ систем</span>
        <h1>Эрх (RBAC)</h1>
        <p className="page-head__sub">Role болон permission-уудын матриц. Admin бүх эрхийг автоматаар авна.</p>
      </div>
      <RolesManager />
    </>
  );
}
