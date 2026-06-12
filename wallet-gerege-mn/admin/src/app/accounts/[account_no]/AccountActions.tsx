"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/Confirm';
import { BP } from '@/lib/basepath';

export default function AccountActions({ accountNo, status }: { accountNo: string; status: string }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  const setStatus = async (s: string) => {
    const freeze = s === 'frozen';
    const ok = await confirm({
      title: freeze ? 'Данс царцаах' : 'Данс сэргээх',
      message: <>Данс <span className="mono">{accountNo}</span>-г {freeze ? 'царцаах' : 'дахин идэвхжүүлэх'} үү?{freeze ? ' Царцсан данснаас гүйлгээ хийх боломжгүй болно.' : ''}</>,
      confirmText: freeze ? 'Царцаах' : 'Сэргээх',
      variant: freeze ? 'danger' : 'primary',
    });
    if (!ok) return;
    await fetch(`${BP}/api/accounts/${encodeURIComponent(accountNo)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: s }),
    });
    router.refresh();
  };

  return (
    <>
      {dialog}
      {status === 'active'
        ? <button className="btn btn--red" onClick={() => setStatus('frozen')}>Царцаах</button>
        : status === 'frozen'
          ? <button className="btn btn--green" onClick={() => setStatus('active')}>Сэргээх</button>
          : null}
    </>
  );
}
