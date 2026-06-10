import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { fetchMe, fetchMyPermissions } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Менежер — Хяналтын самбар' };

export default async function ManagerDashboardPage() {
  const me = await fetchMe();
  if (!me) redirect('/login?next=/manager/dashboard');
  const perms = await fetchMyPermissions();
  if (!perms.includes('manager.view')) redirect('/');

  const canUsers = perms.includes('users.manage');

  return (
    <>
      <div className="page-head">
        <span className="page-head__eyebrow">Менежер систем</span>
        <h1>Менежерийн самбар</h1>
        <p className="page-head__sub">Сайн байна уу, {me.username}.</p>
      </div>
      {canUsers && (
        <div className="card-grid">
          <Link href="/manager/users" className="card" style={{ padding: 20, textDecoration: 'none' }}>
            <Users size={22} strokeWidth={2} />
            <h3>Хэрэглэгчид</h3>
            <p className="muted">Хэрэглэгчдийг хянах, удирдах.</p>
          </Link>
        </div>
      )}
    </>
  );
}
