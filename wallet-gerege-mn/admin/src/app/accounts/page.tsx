import React from 'react';
import Shell from '@/components/Shell';
import { adminFetch } from '@/lib/api';
import AccountsClient, { type Account } from './AccountsClient';

export const dynamic = 'force-dynamic';

interface Client { client_id: string; name: string }

export default async function AccountsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const page = Math.max(0, parseInt(searchParams.page || '0', 10) || 0);
  const PAGE = 50;
  const [r, cr] = await Promise.all([
    adminFetch<{ accounts: Account[] }>(`/admin/accounts?offset=${page * PAGE}&limit=${PAGE + 1}`),
    adminFetch<{ clients: Client[] }>('/admin/clients'),
  ]);
  const all = r.ok ? r.data?.accounts ?? [] : [];
  const hasNext = all.length > PAGE;
  // owner_id → партнёр client-ийн нэр (эх сурвалжийг таних).
  const clientMap: Record<string, string> = {};
  (cr.ok ? cr.data?.clients ?? [] : []).forEach((c) => { clientMap[c.client_id] = c.name || c.client_id; });

  return (
    <Shell title="Дансууд" sub="Бүх хэтэвч (RLS тойрсон admin харагдац)">
      <AccountsClient accounts={all.slice(0, PAGE)} page={page} hasNext={hasNext} clientMap={clientMap} />
    </Shell>
  );
}
