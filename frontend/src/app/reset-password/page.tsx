import React from 'react';
import SigninShell from '@/components/SigninShell';
import ResetPasswordForm from './ResetPasswordForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Нууц үг шинэчлэх — Gerege Template' };

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const email = typeof searchParams.email === 'string' ? searchParams.email : '';

  return (
    <SigninShell>
      <section className="signin-card signin-card--narrow" aria-labelledby="reset-title">
        <div>
          <div className="page-head__eyebrow" style={{ marginBottom: 6 }}>Нууц үг шинэчлэх</div>
          <h1 id="reset-title">Шинэ нууц үг тохируулах</h1>
          <p className="signin-card__lede" style={{ marginTop: 8, fontSize: 14 }}>
            И-мэйлээр ирсэн 6 оронтой кодоо болон шинэ нууц үгээ оруулна уу. Нууц үг дор хаяж 12 тэмдэгт, том/жижиг үсэг, тоо, тусгай тэмдэгт агуулсан байх ёстой.
          </p>
        </div>
        <ResetPasswordForm initialEmail={email} />
      </section>
    </SigninShell>
  );
}
