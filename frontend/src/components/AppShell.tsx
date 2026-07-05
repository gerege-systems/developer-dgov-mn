"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getJSON } from '@/lib/client';
import {
  LayoutDashboard, User, ShieldCheck, HelpCircle, LogOut, Menu, Search,
  Users, ShieldHalf, UserCircle, Briefcase, Bot, Languages, Building2,
  ScrollText, ShieldAlert, CreditCard, KeyRound, Smartphone,
  Landmark, FileText, FileCheck, CalendarClock, Wallet, Bell,
} from 'lucide-react';
import UserMenu from './UserMenu';
import { signOut } from '@/lib/signout';
import { useT } from '@/lib/lang';
import type { DictKey } from '@/lib/i18n';
import { displayName } from '@/lib/types';

const ROLE_ADMIN = 1; // backend domain.RoleAdmin

export interface AppUser {
  username: string;
  fullName: string;
  fullNameEn: string;
  email: string;
  initials: string;
  roleId: number;
}

interface Props {
  user: AppUser;
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  labelKey: DictKey;
  icon: typeof User;
  perm?: string; // шаардагдах эрх; байхгүй бол бүх нэвтэрсэн хэрэглэгчид
}
interface NavGroup {
  labelKey?: DictKey;
  items: NavItem[];
}
// Систем = icon rail дахь дээд түвшний бүлэг. adminOnly бол зөвхөн admin харна.
interface NavSystem {
  key: string;
  labelKey: DictKey;
  icon: typeof User;
  adminOnly?: boolean;
  groups: NavGroup[];
}

// BPMN, translator, AI зэрэг хэсгүүдийг хассан — зөвхөн generic admin цөм.
const SYSTEMS: NavSystem[] = [
  {
    key: 'admin',
    labelKey: 'sys.admin',
    icon: ShieldHalf,
    adminOnly: true,
    groups: [
      {
        labelKey: 'group.general',
        items: [
          { href: '/admin/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, perm: 'dashboard.view' },
        ],
      },
      {
        labelKey: 'group.management',
        items: [
          { href: '/admin/users', labelKey: 'nav.users', icon: Users, perm: 'users.manage' },
          { href: '/admin/roles', labelKey: 'nav.roles', icon: ShieldHalf, perm: 'roles.manage' },
          { href: '/admin/settings', labelKey: 'nav.settings', icon: ShieldCheck, perm: 'settings.manage' },
        ],
      },
      {
        labelKey: 'group.security',
        items: [
          { href: '/admin/audit', labelKey: 'nav.audit', icon: ScrollText },
          { href: '/admin/security', labelKey: 'nav.security', icon: ShieldAlert },
        ],
      },
    ],
  },
  {
    key: 'manager',
    labelKey: 'sys.manager',
    icon: Briefcase,
    groups: [
      {
        labelKey: 'group.manager',
        items: [
          { href: '/manager/dashboard', labelKey: 'nav.managerDashboard', icon: LayoutDashboard, perm: 'manager.view' },
          { href: '/manager/users', labelKey: 'nav.users', icon: Users, perm: 'users.manage' },
        ],
      },
    ],
  },
  {
    key: 'me',
    labelKey: 'sys.user',
    icon: UserCircle,
    groups: [
      {
        labelKey: 'group.personal',
        // Профайл, Тохиргоо нь баруун дээд dropdown-д байгаа тул зүүн цэсэнд давхардуулахгүй.
        items: [
          { href: '/me/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
          { href: '/me/organizations', labelKey: 'nav.org', icon: Building2 },
          { href: '/me/ai', labelKey: 'nav.ai', icon: Bot },
          { href: '/me/translate', labelKey: 'nav.translate', icon: Languages },
        ],
      },
      {
        labelKey: 'group.eid',
        items: [
          { href: '/me/eid/id', labelKey: 'nav.eidId', icon: CreditCard },
          { href: '/me/eid/certificates', labelKey: 'nav.eidCerts', icon: KeyRound },
          { href: '/me/eid/devices', labelKey: 'nav.eidDevices', icon: Smartphone },
          { href: '/me/eid/logs', labelKey: 'nav.eidLogs', icon: ScrollText },
          { href: '/me/eid/security', labelKey: 'nav.eidSecurity', icon: ShieldCheck },
        ],
      },
      {
        labelKey: 'group.govServices',
        items: [
          { href: '/me/services', labelKey: 'nav.govServices', icon: Landmark },
          { href: '/me/applications', labelKey: 'nav.govApplications', icon: FileText },
          { href: '/me/references', labelKey: 'nav.govReferences', icon: FileCheck },
          { href: '/me/appointments', labelKey: 'nav.govAppointments', icon: CalendarClock },
          { href: '/me/payments', labelKey: 'nav.govPayments', icon: Wallet },
          { href: '/me/notifications', labelKey: 'nav.govNotifications', icon: Bell },
        ],
      },
    ],
  },
];

/**
 * Хоёр түвшний бүрхүүл — icon rail дахь "систем" (Админ / Менежер / Хэрэглэгч)
 * тус бүр өөрийн дэд цэстэй. Хэрэглэгчийн эрхээр (/api/rbac/me) цэсийг шүүж,
 * хэлийг useT()-ээр (mn/en) орчуулна.
 */
export default function AppShell({ user, children }: Props) {
  const pathname = usePathname() ?? '/';
  const { T, lang } = useT();
  const isAdmin = user.roleId === ROLE_ADMIN;

  // TanStack Query — олон component зэрэг mount хийгдсэн ч /api/rbac/me-г
  // нэг л удаа татна (deduplication + кэш).
  const permsQuery = useQuery({
    queryKey: ['rbac-me'],
    queryFn: () => getJSON<string[]>('/api/rbac/me'),
  });
  const perms = permsQuery.isPending ? null : (permsQuery.data ?? []);

  const canSee = (perm?: string) => !perm || isAdmin || (perms?.includes(perm) ?? false);
  const visibleGroups = (s: NavSystem) =>
    s.groups
      .map((g) => ({ ...g, items: g.items.filter((i) => canSee(i.perm)) }))
      .filter((g) => g.items.length > 0);
  const systems = SYSTEMS.filter((s) => {
    if (s.adminOnly && !isAdmin) return false;
    return visibleGroups(s).length > 0;
  });

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  // Нүүр '/' нь "me" системд багтдаг ч default панелийг түүгээр сонгохгүй —
  // ингэснээр admin/manager нэвтрэхдээ нүүрэн дээр өөрийн дээд системээ нээлттэй
  // хардаг; гүн холбоос (/admin/*, /manager/*) хэвээр зөв.
  const systemMatches = (s: NavSystem) =>
    visibleGroups(s).some((g) => g.items.some((i) => i.href !== '/' && isActive(i.href)));

  const activeSystem = systems.find(systemMatches) ?? systems[0];
  const [openKey, setOpenKey] = useState(activeSystem?.key ?? '');
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (activeSystem) setOpenKey(activeSystem.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSystem?.key]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 900) setCollapsed(true);
  }, []);

  if (!activeSystem) {
    return (
      <div className="shell2 shell2--loading" aria-busy="true">
        <aside className="iconrail" />
        <main className="maincol" />
      </div>
    );
  }

  const panel = systems.find((s) => s.key === openKey) ?? activeSystem;

  return (
    <div className={`shell2${collapsed ? ' is-collapsed' : ''}`}>
      <aside className="iconrail">
        <Link href="/" className="iconrail__brand" aria-label="Gerege">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand.webp" alt="Gerege" />
        </Link>
        <nav className="iconrail__nav" aria-label={T('shell.menu')}>
          {systems.map((s) => {
            const Icon = s.icon;
            const active = s.key === activeSystem.key;
            return (
              <button
                key={s.key}
                type="button"
                className={`iconrail__btn${active ? ' is-active' : ''}`}
                title={T(s.labelKey)}
                aria-label={T(s.labelKey)}
                onClick={() => {
                  setOpenKey(s.key);
                  setCollapsed(false);
                }}
              >
                <Icon size={20} strokeWidth={2} />
              </button>
            );
          })}
        </nav>
        <div className="iconrail__bottom">
          <a className="iconrail__btn" href="https://gerege.mn/help" target="_blank" rel="noreferrer" title={T('nav.help')} aria-label={T('nav.help')}>
            <HelpCircle size={20} strokeWidth={2} />
          </a>
          <button className="iconrail__btn iconrail__signout" type="button" title={T('nav.signout')} aria-label={T('nav.signout')} onClick={() => signOut()}>
            <LogOut size={20} strokeWidth={2} />
          </button>
        </div>
      </aside>

      <aside className="sidepanel">
        <div className="sidepanel__head">
          <span className="sidepanel__brand-name">Gerege Template</span>
          <span className="sidepanel__title">{T(panel.labelKey)}</span>
        </div>
        <nav className="sidepanel__nav">
          {visibleGroups(panel).map((g, gi) => (
            <div key={gi} className="sidepanel__group">
              {g.labelKey && <span className="sidepanel__group-label">{T(g.labelKey)}</span>}
              {g.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidepanel__link${active ? ' is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={16} strokeWidth={2} />
                    <span>{T(item.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <div className="maincol">
        <header className="topbar2">
          <button className="topbar2__toggle" type="button" aria-label={T('shell.menu')} onClick={() => setCollapsed((c) => !c)}>
            <Menu size={20} strokeWidth={2} />
          </button>
          <div className="topbar2__spacer" />
          <div className="topbar2__search">
            <Search size={16} strokeWidth={2} />
            <input className="topbar2__search-input" type="search" placeholder={T('shell.search')} aria-label={T('shell.search')} />
          </div>
          <div className="topbar2__actions">
            <UserMenu username={displayName(user, lang)} email={user.email} initials={user.initials} />
          </div>
        </header>

        <main className="main">
          <div className="main__inner">{children}</div>
        </main>
      </div>
    </div>
  );
}
