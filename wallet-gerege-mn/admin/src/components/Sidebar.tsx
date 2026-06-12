"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IcoOverview, IcoClients, IcoAccounts, IcoReports, IcoFees, IcoAudit, IcoLogout, IcoMenu, IcoClose, IcoBook, IcoQR,
} from './icons';
import { useConfirm } from './Confirm';
import ThemeToggle from './ThemeToggle';
import { BP } from '@/lib/basepath';

const NAV = [
  { href: '/', label: 'Тойм', Icon: IcoOverview },
  { href: '/clients', label: 'Client-ууд', Icon: IcoClients },
  { href: '/accounts', label: 'Дансууд', Icon: IcoAccounts },
  { href: '/payments', label: 'Төлбөр (QR)', Icon: IcoQR },
  { href: '/reports', label: 'Тайлан', Icon: IcoReports },
  { href: '/fee-rules', label: 'Шимтгэл', Icon: IcoFees },
  { href: '/audit', label: 'Audit', Icon: IcoAudit },
  { href: '/docs', label: 'Баримт (API)', Icon: IcoBook },
];

export default function Sidebar() {
  const path = usePathname();
  const { confirm, dialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

  // Маршрут солигдоход mobile drawer-ийг хаана.
  useEffect(() => { setOpen(false); }, [path]);

  const onLogout = async () => {
    const ok = await confirm({
      title: 'Системээс гарах',
      message: 'Та админ панелаас гарахдаа итгэлтэй байна уу?',
      confirmText: 'Гарах',
      variant: 'danger',
    });
    if (ok) window.location.href = `${BP}/api/auth/logout`;
  };

  return (
    <>
      {dialog}
      <button className="rail-toggle" onClick={() => setOpen((v) => !v)} type="button" aria-label="Цэс">
        {open ? <IcoClose /> : <IcoMenu />}
      </button>
      {open && <div className="rail-backdrop" onClick={() => setOpen(false)} />}

      <aside className={`rail${open ? ' rail--open' : ''}`}>
        <div className="brand">
          <div className="brand__logo">₮</div>
          <div>
            <div className="brand__name">Gerege Core Banking</div>
            <div className="brand__sub">Platform</div>
          </div>
        </div>

        <nav className="nav">
          <div className="nav__label">Удирдлага</div>
          {NAV.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className={`navlink${isActive(href) ? ' navlink--active' : ''}`}>
              <Icon />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="rail__spacer" />

        <div className="rail__foot">
          <ThemeToggle />
          <div className="rail__user">
            <div className="avatar">SA</div>
            <div>
              <div className="who">superadmin</div>
              <div className="role">Системийн админ</div>
            </div>
          </div>
          <button className="logout" onClick={onLogout} type="button">
            <IcoLogout />
            <span>Гарах</span>
          </button>
        </div>
      </aside>
    </>
  );
}
