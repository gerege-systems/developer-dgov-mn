import React from 'react';
import { redirect } from 'next/navigation';
import PageHead from '@/components/PageHead';
import SecurityViewer from '@/components/admin/SecurityViewer';
import { fetchMe } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Аюулгүй байдал — Админ' };

const ROLE_ADMIN = 1; // backend domain.RoleAdmin

export default async function AdminSecurityPage() {
  const me = await fetchMe();
  if (!me) redirect('/login?next=/admin/security');
  if (me.roleId !== ROLE_ADMIN) redirect('/');

  return (
    <>
      <PageHead eyebrowKey="sys.admin" titleKey="security.title" subKey="security.sub" />
      <SecurityViewer />
    </>
  );
}
