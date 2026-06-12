import React from 'react';
import Shell from '@/components/Shell';
import { adminFetch } from '@/lib/api';
import FeeRulesClient, { type FeeRule } from './FeeRulesClient';

export const dynamic = 'force-dynamic';

export default async function FeeRulesPage() {
  const r = await adminFetch<{ fee_rules: FeeRule[] }>('/admin/fee-rules');
  const rules = r.ok ? r.data?.fee_rules ?? [] : [];
  return (
    <Shell title="Шимтгэлийн дүрэм" sub="Гүйлгээний төрөл тус бүрийн идэвхтэй/template fee">
      <FeeRulesClient rules={rules} />
    </Shell>
  );
}
