import React from 'react';
import SigninHeader from './landing/SigninHeader';
import SigninFooter from './landing/SigninFooter';
import { DEFAULT_LANDING_CONFIG, themeCss, type LandingConfig } from '@/lib/landing';

interface Props {
  /** Нүүрний тохируулдаг харагдац (өнгө/фонт/текст/цэс). Өгөгдөөгүй бол
   *  өгөгдмөл (одоогийн харагдац) — жишээ нь backend унасан client контекст. */
  config?: LandingConfig;
  /** topbar баруун талын нэмэлт навигаци (анхдагч: загвар солигч). */
  rightNav?: React.ReactNode;
  hideFooter?: boolean;
  children: React.ReactNode;
}

/**
 * Анонимос бүрхүүл — landing (/) болон auth хуудаснуудад. Rail / UserMenu /
 * session байхгүй. Брэнд topbar + төвлөрсөн агуулга + footer. Админаас
 * тохируулсан харагдацыг (өнгө/фонт/хэмжээ CSS хувьсагчид + advanced CSS)
 * .signin-shell-д шахаж, landing болон login хоёуланд нэгэн адил үйлчилнэ.
 */
export default function SigninShell({ config, rightNav, hideFooter, children }: Props) {
  const cfg = config ?? DEFAULT_LANDING_CONFIG;
  const css = themeCss(cfg);
  return (
    <div className="signin-shell">
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <SigninHeader config={cfg} rightNav={rightNav} />
      <main className="signin-shell__body">{children}</main>
      {!hideFooter && <SigninFooter config={cfg} />}
    </div>
  );
}
