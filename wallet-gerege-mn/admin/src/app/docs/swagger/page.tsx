import React from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import SwaggerView from './SwaggerView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Swagger UI — Gerege Core Banking' };

export default function SwaggerPage() {
  return (
    <Shell
      title="OpenAPI — Swagger UI"
      sub="Wallet API-ийн интерактив баримт (зөвхөн нэвтэрсэн админд)"
      actions={<Link className="btn btn--ghost" href="/docs">← Баримт</Link>}
    >
      <div className="card" style={{ background: '#fff', padding: 0, overflow: 'hidden', borderRadius: 14 }}>
        <SwaggerView />
      </div>
    </Shell>
  );
}
