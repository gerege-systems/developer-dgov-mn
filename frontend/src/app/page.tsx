import React from 'react';
import Link from 'next/link';
import { KeyRound, Info, LogIn } from 'lucide-react';
import AppShell from '@/components/AppShell';
import HomeView from '@/components/me/HomeView';
import SigninShell from '@/components/SigninShell';
import { hasSession } from '@/lib/session';
import { fetchMe } from '@/lib/api';
import { initialsOf } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Home() {
  if (!hasSession()) return <Landing />;

  const me = await fetchMe();
  if (!me) return <Landing />;

  return (
    <AppShell user={{ username: me.username, email: me.email, initials: initialsOf(me.username), roleId: me.roleId }}>
      <HomeView me={me} />
    </AppShell>
  );
}

/** Нийтийн landing — нэвтрээгүй зочдод харагдах нүүр. */
function Landing() {
  return (
    <SigninShell>
      <section className="signin-card" aria-labelledby="landing-title">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="signin-card__crest" src="/brand.webp" alt="" aria-hidden="true" />

        <div>
          <h1 id="landing-title">Gerege Template</h1>
          <p className="signin-card__lede" style={{ marginTop: 12 }}>
            <strong style={{ color: 'var(--fg)', fontWeight: 600 }}>Gerege Template</strong>{' '}
            (chi + pgx) дээр суурилсан жишээ апп. И-мэйл хаягаараа{' '}
            <strong style={{ color: 'var(--fg)', fontWeight: 600 }}>бүртгүүлж</strong>,{' '}
            нэг удаагийн кодоор баталгаажуулаад, профайл болон аюулгүй байдлын тохиргоогоо нэг дороос удирдана.
          </p>
        </div>

        <Link className="btn btn--primary btn--lg btn--block" href="/login" aria-label="И-мэйлээр нэвтрэх">
          <LogIn size={18} strokeWidth={2} />
          <span>Нэвтрэх</span>
        </Link>

        <p className="signin-card__alt">
          Бүртгэлгүй юу? <Link href="/register">Шинээр бүртгүүлэх</Link>
        </p>

        <p className="signin-card__helper">
          <Info size={14} strokeWidth={2} />
          <span>
            Нууц үг нь <span className="mono" style={{ color: 'var(--fg)' }}>bcrypt</span>-ээр хэшлэгдэж хадгалагдана.
            Нэвтрэлт нь богино TTL-тэй access болон урт TTL-тэй refresh JWT хослолоор хийгдэнэ.
          </span>
        </p>

        <div className="signin-card__trust" aria-label="Аюулгүй байдлын тэмдэг">
          <span className="badge"><KeyRound size={11} strokeWidth={2} /> JWT</span>
          <span className="badge">bcrypt</span>
          <span className="badge">chi + pgx</span>
          <span className="badge"><span className="mono" style={{ fontSize: 11 }}>TLS 1.3</span></span>
        </div>
      </section>
    </SigninShell>
  );
}
