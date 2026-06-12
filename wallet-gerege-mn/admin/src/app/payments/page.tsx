import React from 'react';
import Shell from '@/components/Shell';
import { adminFetch } from '@/lib/api';
import PaymentsClient, { type PaymentRow } from './PaymentsClient';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const r = await adminFetch<{ payments: PaymentRow[] }>('/admin/payments?limit=200');
  const rows = r.ok ? r.data?.payments ?? [] : [];
  return (
    <Shell title="Төлбөр (QR / нэхэмжлэх)" sub="Бүх payment_request — static QR ба dynamic invoice">
      <PaymentsClient rows={rows} />
    </Shell>
  );
}
