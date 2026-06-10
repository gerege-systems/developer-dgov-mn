"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, User, ShieldCheck, HelpCircle, LogOut, Menu,
  Users, ShieldHalf, UserCircle, Briefcase,
} from 'lucide-react';
import UserMenu from './UserMenu';
import { signOut } from '@/lib/signout';

const ROLE_ADMIN = 1; // backend domain.RoleAdmin

export interface AppUser {
  username: string;
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
  label: string;
  icon: typeof User;
  perm?: string; // шаардагдах эрх; байхгүй бол бүх нэвтэрсэн хэрэглэгчид
}
interface NavGroup {
  label?: string;
  items: NavItem[];
}
// Систем = icon rail дахь дээд түвшний бүлэг.
interface NavSystem {
  key: string;
  label: string;
  icon: typeof User;
  groups: NavGroup[];
}

// BPMN, translator, AI зэрэг хэсгүүдийг хассан — зөвхөн generic admin цөм.
const SYSTEMS: NavSystem[] = [
  {
    key: 'admin',
    label: 'Админ систем',
    icon: ShieldHalf,
    groups: [
      {
        label: 'Ерөнхий',
        items: [
          { href: '/admin/dashboard', label: 'Хяналтын самбар', icon: LayoutDashboard, perm: 'dashboard.view' },
        ],
      },
      {
        label: 'Удирдлага',
        items: [
          { href: '/admin/users', label: 'Хэрэглэгчид', icon: Users, perm: 'users.manage' },
          { href: '/admin/roles', label: 'Эрх (RBAC)', icon: ShieldHalf, perm: 'roles.manage' },
          { href: '/admin/settings', label: 'Тохиргоо', icon: ShieldCheck, perm: 'settings.manage' },
        ],
      },
    ],
  },
  {
    key: 'manager',
    label: 'Менежер систем',
    icon: Briefcase,
    groups: [
      {
        label: 'Менежер',
        items: [
          { href: '/manager/dashboard', label: 'Менежерийн самбар', icon: LayoutDashboard, perm: 'manager.view' },
          { href: '/manager/users', label: 'Хэрэглэгчид', icon: Users, perm: 'users.manage' },
        ],
      },
    ],
  },
  {
    key: 'me',
    label: 'Хэрэглэгч систем',
    icon: UserCircle,
    groups: [
      {
        label: 'Хувийн',
        items: [
          { href: '/', label: 'Хяналтын самбар', icon: LayoutDashboard, perm: 'personal.view' },
          { href: '/profile', label: 'Профайл', icon: User, perm: 'personal.view' },
          { href: '/settings', label: 'Аюулгүй байдал', icon: ShieldCheck, perm: 'personal.view' },
        ],
      },
    ],
  },
];

/**
 * Хоёр түвшний бүрхүүл — icon rail дахь "систем" (Админ / Менежер / Хэрэглэгч)
 * тус бүр өөрийн дэд цэстэй. Хэрэглэгчийн эрхээр (/api/rbac/me) цэсийг шүүнэ:
 * admin (role 1) бүгдийг харна; бусад нь зөвхөн эрх бүхий зүйлээ. Бүх өнгө
 * дизайн системээс (OKLCH).
 */
export default function AppShell({ user, children }: Props) {
  const pathname = usePathname() ?? '/';
  const isAdmin = user.roleId === ROLE_ADMIN;

  const [perms, setPerms] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/rbac/me', { method: 'GET' })
      .then((r) => r.json())
      .then((b) => {
        if (alive && b?.ok && Array.isArray(b.data)) setPerms(b.data as string[]);
        else if (alive) setPerms([]);
      })
      .catch(() => alive && setPerms([]));
    return () => {
      alive = false;
    };
  }, []);

  const canSee = (perm?: string) => !perm || isAdmin || (perms?.includes(perm) ?? false);
  const visibleGroups = (s: NavSystem) =>
    s.groups
      .map((g) => ({ ...g, items: g.items.filter((i) => canSee(i.perm)) }))
      .filter((g) => g.items.length > 0);
  const systems = SYSTEMS.filter((s) => visibleGroups(s).length > 0);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const systemMatches = (s: NavSystem) => visibleGroups(s).some((g) => g.items.some((i) => isActive(i.href)));

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
        <nav className="iconrail__nav" aria-label="Системүүд">
          {systems.map((s) => {
            const Icon = s.icon;
            const active = s.key === activeSystem.key;
            return (
              <button
                key={s.key}
                type="button"
                className={`iconrail__btn${active ? ' is-active' : ''}`}
                title={s.label}
                aria-label={s.label}
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
          <a className="iconrail__btn" href="https://gerege.mn/help" target="_blank" rel="noreferrer" title="Тусламж" aria-label="Тусламж">
            <HelpCircle size={20} strokeWidth={2} />
          </a>
          <button className="iconrail__btn iconrail__signout" type="button" title="Гарах" aria-label="Гарах" onClick={() => signOut()}>
            <LogOut size={20} strokeWidth={2} />
          </button>
        </div>
      </aside>

      <aside className="sidepanel">
        <div className="sidepanel__head">
          <span className="sidepanel__brand-name">Gerege Template</span>
          <span className="sidepanel__title">{panel.label}</span>
        </div>
        <nav className="sidepanel__nav">
          {visibleGroups(panel).map((g, gi) => (
            <div key={gi} className="sidepanel__group">
              {g.label && <span className="sidepanel__group-label">{g.label}</span>}
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
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <div className="maincol">
        <header className="topbar2">
          <button className="topbar2__toggle" type="button" aria-label="Цэс" onClick={() => setCollapsed((c) => !c)}>
            <Menu size={20} strokeWidth={2} />
          </button>
          <div className="topbar2__spacer" />
          <div className="topbar2__actions">
            <UserMenu username={user.username} email={user.email} initials={user.initials} />
          </div>
        </header>

        <main className="main">
          <div className="main__inner">{children}</div>
        </main>
      </div>
    </div>
  );
}
