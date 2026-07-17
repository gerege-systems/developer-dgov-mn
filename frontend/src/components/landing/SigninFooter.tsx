"use client";

import React from 'react';
import { useT } from '@/lib/lang';
import { pickText, type LandingConfig } from '@/lib/landing';

/** Анонимос бүрхүүлийн footer — тохируулж болох текст (хэлээр). */
export default function SigninFooter({ config }: { config: LandingConfig }) {
  const { lang } = useT();
  const text = pickText(config.footer.text, lang) || '© 2026 Gerege Systems · Gerege Template';
  return (
    <footer className="signin-footer" style={{ justifyContent: 'center', textAlign: 'center' }}>
      <span>{text}</span>
    </footer>
  );
}
