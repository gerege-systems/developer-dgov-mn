import React from 'react';
import { redirect } from 'next/navigation';
import SigninShell from '@/components/SigninShell';
import LandingContent from '@/components/LandingContent';
import { hasSession } from '@/lib/session';
import { fetchLandingConfig } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Нэвтэрсэн хэрэглэгчийг /me домэйн руу (admin/manager-тэй адил) шилжүүлнэ;
  // нэвтрээгүй зочдод нийтийн Landing — админаас тохируулсан харагдацаар.
  if (await hasSession()) redirect('/me/dashboard');
  const config = await fetchLandingConfig();
  return (
    <SigninShell config={config}>
      <LandingContent config={config} />
    </SigninShell>
  );
}
