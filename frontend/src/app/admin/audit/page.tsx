import React from 'react';
import { redirect } from 'next/navigation';
import PageHead from '@/components/PageHead';
import AuditViewer from '@/components/admin/AuditViewer';
import { fetchMe } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Аудит лог — Админ' };

const ROLE_ADMIN = 1; // backend domain.RoleAdmin

export default async function AdminAuditPage() {
  const me = await fetchMe();
  if (!me) redirect('/login?next=/admin/audit');
  if (me.roleId !== ROLE_ADMIN) redirect('/');

  return (
    <>
      <PageHead eyebrowKey="sys.admin" titleKey="audit.title" subKey="audit.sub" />
      <AuditViewer />
    </>
  );
}
