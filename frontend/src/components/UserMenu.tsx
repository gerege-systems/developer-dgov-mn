"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, User, Settings, Globe, Moon, Sun, Monitor, HelpCircle, LogOut } from 'lucide-react';
import SegmentedControl from './SegmentedControl';
import { usePreferences, showToast } from '@/lib/preferences';
import { useLang, useT } from '@/lib/lang';
import { t as translate, type LangCode } from '@/lib/i18n';
import { signOut } from '@/lib/signout';

// Сонгогчид харагдах богино шошго. Super admin-ий нэмсэн хэлэнд кодыг томоор
// (жишээ нь 'ja' → 'JA') үзүүлнэ — хэлний эх нэр нь aria-label дээр байна.
const LANG_SHORT: Record<string, string> = { mn: 'МН', en: 'EN', zh: '中文', ru: 'RU' };

interface Props {
  username: string;
  email: string;
  initials: string;
  picture?: string; // Google профайл зураг (холбогдсон бол initials-ийн оронд)
}

export default function UserMenu({ username, email, initials, picture }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { theme, setTheme } = usePreferences();
  const { setLang } = useLang();
  const { lang, T, languages } = useT();

  // Гадна дарах + Escape хаах
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleThemeChange = (value: 'light' | 'dark' | 'system') => {
    setTheme(value);
    showToast(T(`toast.theme.${value}`));
  };

  // Шинэ хэл дээрээ мэдэгдэнэ (сонгосон хэлээр нь толь бичгээс шууд).
  const handleLangChange = (value: LangCode) => {
    setLang(value);
    showToast(translate(value, 'menu.langSwitched'));
  };

  return (
    <div ref={menuRef} className={`user-menu${open ? ' is-open' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className="topbar__user"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-menu-popover"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); }
        }}
      >
        {picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="topbar__avatar" src={picture} alt="" width={28} height={28} style={{ objectFit: 'cover', padding: 0 }} referrerPolicy="no-referrer" />
        ) : (
          <span className="topbar__avatar">{initials}</span>
        )}
        <span>{username}</span>
        <ChevronDown size={14} className="topbar__user-chevron" strokeWidth={2} />
      </button>

      {open && (
        <div id="user-menu-popover" role="menu" className="user-menu__popover">
          <div className="user-menu__header">
            <div className="user-menu__name">{username}</div>
            <div className="user-menu__sub mono">{email}</div>
          </div>

          <Link className="user-menu__item" role="menuitem" href="/me/profile" onClick={() => setOpen(false)}>
            <User size={16} strokeWidth={2} />
            <span>{T('nav.profile')}</span>
          </Link>
          <Link className="user-menu__item" role="menuitem" href="/me/settings" onClick={() => setOpen(false)}>
            <Settings size={16} strokeWidth={2} />
            <span>{T('nav.settings')}</span>
          </Link>

          <div className="user-menu__divider" role="separator" />
          <div className="user-menu__section-label">
            {T('menu.preferences')}
          </div>

          <div className="user-menu__control">
            <span className="user-menu__control-label">
              <Globe size={16} strokeWidth={2} />
              <span>{T('menu.language')}</span>
            </span>
            <SegmentedControl
              ariaLabel={T('menu.language')}
              value={lang}
              onChange={handleLangChange}
              options={languages.map((l) => ({
                value: l.code,
                label: LANG_SHORT[l.code] ?? l.code.toUpperCase(),
                ariaLabel: l.label,
              }))}
            />
          </div>

          <div className="user-menu__control">
            <span className="user-menu__control-label">
              <Moon size={16} strokeWidth={2} />
              <span>{T('menu.appearance')}</span>
            </span>
            <SegmentedControl
              ariaLabel={T('menu.appearance')}
              value={theme}
              onChange={handleThemeChange}
              options={[
                { value: 'light',  icon: <Sun     size={14} strokeWidth={2} />, ariaLabel: T('theme.light') },
                { value: 'dark',   icon: <Moon    size={14} strokeWidth={2} />, ariaLabel: T('theme.dark') },
                { value: 'system', icon: <Monitor size={14} strokeWidth={2} />, ariaLabel: T('theme.system') },
              ]}
            />
          </div>

          <div className="user-menu__divider" role="separator" />

          <a className="user-menu__item" role="menuitem" href="https://dgov.mn/help" target="_blank" rel="noreferrer">
            <HelpCircle size={16} strokeWidth={2} />
            <span>{T('nav.help')}</span>
          </a>

          <div className="user-menu__divider" role="separator" />
          <button
            type="button"
            className="user-menu__item user-menu__item--danger"
            role="menuitem"
            onClick={() => signOut()}
          >
            <LogOut size={16} strokeWidth={2} />
            <span>{T('nav.signout')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
