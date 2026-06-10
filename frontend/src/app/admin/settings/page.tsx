import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { fetchMe, fetchMyPermissions } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Тохиргоо — Админ' };

export default async function AdminSettingsPage() {
  const me = await fetchMe();
  if (!me) redirect('/login?next=/admin/settings');
  const perms = await fetchMyPermissions();
  if (!perms.includes('settings.manage')) redirect('/');

  return (
    <>
      <div className="page-head">
        <span className="page-head__eyebrow">Админ систем</span>
        <h1>Тохиргоо</h1>
        <p className="page-head__sub">Системийн тохиргоо. (Энэ template-д суурь тохиргоо орхигдсон — өргөтгөх боломжтой.)</p>
      </div>
      <div className="card" style={{ padding: 22 }}>
        <p className="muted" style={{ marginTop: 0 }}>
          Өөрийн бүртгэлийн аюулгүй байдал (нууц үг солих)-ийг{' '}
          <Link href="/settings">Хэрэглэгч → Аюулгүй байдал</Link> хэсгээс хийнэ.
        </p>
      </div>
    </>
  );
}
