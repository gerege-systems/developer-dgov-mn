import React from 'react';
import { redirect } from 'next/navigation';
import UsersManager from '@/components/admin/UsersManager';
import { fetchMe, fetchMyPermissions } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Хэрэглэгчид — Менежер' };

export default async function ManagerUsersPage() {
  const me = await fetchMe();
  if (!me) redirect('/login?next=/manager/users');
  const perms = await fetchMyPermissions();
  if (!perms.includes('users.manage')) redirect('/');

  return (
    <>
      <div className="page-head">
        <span className="page-head__eyebrow">Менежер систем</span>
        <h1>Хэрэглэгчид</h1>
        <p className="page-head__sub">Хэрэглэгчдийг хянах, удирдах.</p>
      </div>
      <UsersManager currentUserId={me.id} />
    </>
  );
}
