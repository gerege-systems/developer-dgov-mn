import React from 'react';
import SigninShell from '@/components/SigninShell';
import { safeNext } from '@/lib/navigation';
import { fetchLandingConfig } from '@/lib/api';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Нэвтрэх — Gerege' };

export default async function LoginPage(
  props: {
    searchParams: Promise<{ next?: string; notice?: string; glink?: string; gerror?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const next = safeNext(searchParams.next);
  const config = await fetchLandingConfig();

  return (
    <SigninShell config={config}>
      <section className="signin-card" aria-labelledby="login-title">
        <LoginForm
          next={next}
          notice={searchParams.notice}
          googleLink={searchParams.glink === '1'}
          googleError={!!searchParams.gerror}
        />
      </section>
    </SigninShell>
  );
}
