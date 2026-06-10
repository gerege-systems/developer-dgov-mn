import React from 'react';
import { redirect } from 'next/navigation';
import UsersManager from '@/components/admin/UsersManager';
import { fetchMe, fetchMyPermissions } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Хэрэглэгчид — Админ' };

export default async function AdminUsersPage() {
  const me = await fetchMe();
  if (!me) redirect('/login?next=/admin/users');
  const perms = await fetchMyPermissions();
  if (!perms.includes('users.manage')) redirect('/');

  return (
    <>
      <div className="page-head">
        <span className="page-head__eyebrow">Админ систем</span>
        <h1>Хэрэглэгчид</h1>
        <p className="page-head__sub">Хэрэглэгчдийн эрх, төлөвийг удирдана.</p>
      </div>
      <UsersManager currentUserId={me.id} />
    </>
  );
}
