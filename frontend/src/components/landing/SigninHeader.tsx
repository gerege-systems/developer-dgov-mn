"use client";

import React from 'react';
import Link from 'next/link';
import AnonThemeToggle from '../AnonThemeToggle';
import { useT } from '@/lib/lang';
import { pickText, type LandingConfig } from '@/lib/landing';

/**
 * Анонимос бүрхүүлийн дээд мөр — брэнд (лого + нэр), тохируулж болох цэс
 * (config.nav) ба баруун талын навигаци (өгөгдмөл: загвар солигч). Хэл (mn/en)
 * солиход шошго шууд шинэчлэгддэг тул client component.
 */
export default function SigninHeader({ config, rightNav }: { config: LandingConfig; rightNav?: React.ReactNode }) {
  const { lang } = useT();
  const brandName = pickText(config.brand.name, lang) || 'Gerege Template';
  const nav = config.nav.filter((n) => n.show && n.href);

  return (
    <header className="signin-shell__nav">
      <Link className="topbar__brand" href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="topbar__brand-mark" src={config.brand.logoUrl || '/brand.webp'} alt={brandName} />
        <div className="topbar__brand-text">
          <span className="topbar__brand-name">{brandName}</span>
        </div>
      </Link>

      {nav.length > 0 && (
        <nav className="signin-shell__links" aria-label="Цэс">
          {nav.map((item, i) =>
            item.external ? (
              <a key={i} href={item.href} target="_blank" rel="noopener noreferrer">
                {pickText(item.label, lang)}
              </a>
            ) : (
              <Link key={i} href={item.href}>
                {pickText(item.label, lang)}
              </Link>
            ),
          )}
        </nav>
      )}

      {rightNav ?? <AnonThemeToggle />}
    </header>
  );
}
