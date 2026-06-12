import React from 'react';
import Shell from '@/components/Shell';
import ReportsClient from './ReportsClient';

export const dynamic = 'force-dynamic';

export default function ReportsPage() {
  return (
    <Shell title="Тайлан" sub="Trial balance · Эргэлт · Дансны хуулга">
      <ReportsClient />
    </Shell>
  );
}
