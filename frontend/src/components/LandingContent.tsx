"use client";

import React from 'react';
import Link from 'next/link';
import { LogIn, ShieldCheck, KeyRound, Info, Lock, User, Mail, Globe, ArrowRight, Fingerprint } from 'lucide-react';
import { useT } from '@/lib/lang';
import { pickText, type LandingConfig, type LandingButton } from '@/lib/landing';
import type { Lang } from '@/lib/i18n';

// Товчинд зөвшөөрсөн дүрсний allowlist — танихгүй нэр = зураггүй.
const ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  LogIn,
  ShieldCheck,
  KeyRound,
  Info,
  Lock,
  User,
  Mail,
  Globe,
  ArrowRight,
  Fingerprint,
};

/** cssSize нь тоон утганд px залгана; дурын CSS утгыг хэвээр үлдээнэ. */
function cssSize(v: string): string | undefined {
  const s = (v || '').trim();
  if (!s) return undefined;
  return /^\d+(\.\d+)?$/.test(s) ? `${s}px` : s;
}

/**
 * Нүүрний карт — гарчиг/тайлбар/туслах текст (хэлээр), тохируулж болох
 * нэвтрэх товчнууд ба итгэлийн тэмдгүүд. Бүгд config-оос удирдагдана; хоосон/
 * дутуу үед SigninShell-ийн өгөгдмөл (DEFAULT_LANDING_CONFIG) дүүргэсэн байна.
 */
export default function LandingContent({ config }: { config: LandingConfig }) {
  const { lang } = useT();
  const { content, theme } = config;
  const titleWeight = Number(theme.weights.title) || undefined;
  const buttons = config.buttons.filter((b) => b.show).slice().sort((a, b) => a.order - b.order);
  const badges = config.badges.filter((b) => b.show);
  const helper = pickText(content.helper, lang);

  return (
    <section className="signin-card" aria-labelledby="landing-title">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="signin-card__crest" src={config.brand.logoUrl || '/brand.webp'} alt="" aria-hidden="true" />

      <div>
        <h1 id="landing-title" style={{ fontSize: cssSize(theme.sizes.titlePx), fontWeight: titleWeight }}>
          {pickText(content.title, lang)}
        </h1>
        <p className="signin-card__lede" style={{ marginTop: 12, fontSize: cssSize(theme.sizes.bodyPx) }}>
          {pickText(content.lede, lang)}
        </p>
      </div>

      {buttons.map((btn, i) => (
        <LandingButtonEl key={btn.id || i} btn={btn} lang={lang} first={i === 0} />
      ))}

      {helper && (
        <p className="signin-card__helper">
          <Info size={14} strokeWidth={2} />
          <span>{helper}</span>
        </p>
      )}

      {badges.length > 0 && (
        <div className="signin-card__trust" aria-label="Аюулгүй байдлын тэмдэг">
          {badges.map((bd, i) => (
            <span className="badge" key={i}>
              {pickText(bd.label, lang)}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

/** Нэг нэвтрэх товч — дотоод route нь <Link>, BFF/гадаад URL нь <a> (redirect
 *  эхлүүлэх эсвэл шинэ таб). SSO гэх мэт '/api/*' үйлдэл заавал <a> байх ёстой. */
function LandingButtonEl({ btn, lang, first }: { btn: LandingButton; lang: Lang; first: boolean }) {
  const Icon = ICONS[btn.icon];
  const cls = `btn btn--${btn.variant === 'secondary' ? 'secondary' : 'primary'} btn--lg btn--block`;
  const style = first ? undefined : { marginTop: 10 };
  const label = pickText(btn.label, lang);
  const inner = (
    <>
      {Icon && <Icon size={18} strokeWidth={2} />}
      <span>{label}</span>
    </>
  );

  const external = /^https?:\/\//i.test(btn.action);
  const rawAnchor = external || btn.action.startsWith('/api/');

  if (rawAnchor) {
    return (
      <a
        className={cls}
        href={btn.action}
        style={style}
        aria-label={label}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link className={cls} href={btn.action || '#'} style={style} aria-label={label}>
      {inner}
    </Link>
  );
}
