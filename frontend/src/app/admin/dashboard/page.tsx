import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Users, ShieldHalf, ShieldCheck } from 'lucide-react';
import { fetchMe, fetchMyPermissions } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Админ — Хяналтын самбар' };

const CARDS = [
  { href: '/admin/users', title: 'Хэрэглэгчид', desc: 'Хэрэглэгч жагсаах, role солих, идэвхжүүлэх/устгах.', icon: Users, perm: 'users.manage' },
  { href: '/admin/roles', title: 'Эрх (RBAC)', desc: 'Role болон permission матрицыг удирдах.', icon: ShieldHalf, perm: 'roles.manage' },
  { href: '/admin/settings', title: 'Тохиргоо', desc: 'Системийн тохиргоо.', icon: ShieldCheck, perm: 'settings.manage' },
];

export default async function AdminDashboardPage() {
  const me = await fetchMe();
  if (!me) redirect('/login?next=/admin/dashboard');
  const perms = await fetchMyPermissions();
  if (!perms.includes('dashboard.view')) redirect('/');

  const cards = CARDS.filter((c) => perms.includes(c.perm));

  return (
    <>
      <div className="page-head">
        <span className="page-head__eyebrow">Админ систем</span>
        <h1>Хяналтын самбар</h1>
        <p className="page-head__sub">Сайн байна уу, {me.username}. Доорх хэсгүүдээс удирдлагаа сонгоно уу.</p>
      </div>
      <div className="card-grid">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href} className="card" style={{ padding: 20, textDecoration: 'none' }}>
              <Icon size={22} strokeWidth={2} />
              <h3>{c.title}</h3>
              <p className="muted">{c.desc}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
