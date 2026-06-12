import React from 'react';
import Shell from '@/components/Shell';
import { adminFetch } from '@/lib/api';
import AuditClient, { type AuditRow } from './AuditClient';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const r = await adminFetch<{ audit: AuditRow[] }>('/admin/audit?limit=200');
  const rows = r.ok ? r.data?.audit ?? [] : [];
  return (
    <Shell title="Audit" sub="Сүүлийн 200 API хандалт (api_audit_logs)">
      <AuditClient rows={rows} />
    </Shell>
  );
}
