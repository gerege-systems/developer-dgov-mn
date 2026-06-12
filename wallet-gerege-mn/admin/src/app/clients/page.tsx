import React from 'react';
import Shell from '@/components/Shell';
import { adminFetch } from '@/lib/api';
import ClientsClient, { type Client } from './ClientsClient';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const r = await adminFetch<{ clients: Client[] }>('/admin/clients');
  const clients = r.ok ? r.data?.clients ?? [] : [];
  return (
    <Shell title="Client-ууд" sub="OAuth2 client_credentials — бусад систем энэ id/secret-ээр холбогдоно">
      <ClientsClient clients={clients} />
    </Shell>
  );
}
