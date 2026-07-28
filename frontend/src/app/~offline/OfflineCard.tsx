// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

'use client';

import React from 'react';
import { WifiOff } from 'lucide-react';
import { useT } from '@/lib/lang';

/** Офлайн мэдэгдэл + дахин оролдох товч. Хэлийг useT-ээс авна. */
export default function OfflineCard() {
  const { T } = useT();

  return (
    <section className="signin-card signin-card--narrow">
      {/* signin-card__crest нь <img>-д зориулсан (object-fit) тул энд
          хэрэглэхгүй — дүрсийг шууд, муутгасан өнгөөр үзүүлнэ. */}
      <WifiOff size={40} strokeWidth={1.5} aria-hidden="true" style={{ color: 'var(--muted)' }} />

      <div>
        <h1>{T('offline.title')}</h1>
        <p className="signin-card__lede" style={{ marginTop: 6 }}>
          {T('offline.body')}
        </p>
      </div>

      <button
        type="button"
        className="btn btn--primary btn--lg btn--block"
        onClick={() => window.location.reload()}
      >
        {T('offline.retry')}
      </button>
    </section>
  );
}
