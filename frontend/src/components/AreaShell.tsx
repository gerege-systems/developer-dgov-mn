import React from 'react';
import { redirect } from 'next/navigation';
import AppShell from './AppShell';
import { fetchMe } from '@/lib/api';
import { initialsOf } from '@/lib/format';

/**
 * AreaShell нь /admin, /manager бүлгийн нийтлэг server layout — session-г нэг
 * удаа шалгаж, AppShell-ийг render хийнэ (тус бүрийн нарийн эрхийн шалгалт
 * хуудсууддаа хэвээр). next нь нэвтрээгүй үед буцах зам.
 */
export default async function AreaShell({ next, children }: { next: string; children: React.ReactNode }) {
  const me = await fetchMe();
  if (!me) redirect(`/login?next=${encodeURIComponent(next)}`);
  return (
    <AppShell user={{ username: me.username, fullName: me.fullName, fullNameEn: me.fullNameEn, email: me.email, initials: initialsOf(me.fullName || me.username), picture: me.google?.picture, roleId: me.roleId }}>
      {children}
    </AppShell>
  );
}
