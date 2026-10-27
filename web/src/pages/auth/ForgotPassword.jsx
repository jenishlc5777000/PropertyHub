import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiErrorMessage, forgotPasswordSchema, resetPasswordSchema, zodFieldErrors } from '@propertyhub/shared';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Field, Spinner } from '../../components/ui';
import AuthShell from './AuthShell';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const toast = useToast();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ email: '', otp: '', password: '' });
  const [errs, setErrs] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (schema, fn) => {
    const r = schema.safeParse(f);
    if (!r.success) return setErrs(zodFieldErrors(r.error));
    setErrs({});
    setError('');
    setBusy(true);
    try {
      await fn(r.data);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t('resetPassword')} subtitle={step === 1 ? 'We will email you a 6-digit code.' : `Enter the code sent to ${f.email}`}>
      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {step === 1 ? (
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            run(forgotPasswordSchema, async (d) => {
              await api.auth.forgotPassword(d);
              setStep(2);
            });
          }}
        >
          <Field label={t('email')} error={errs.email}>
            <input type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </Field>
          <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="size-4" />}{t('sendOtp')}</button>
        </form>
      ) : (
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            run(resetPasswordSchema, async (d) => {
              await api.auth.resetPassword(d);
              toast('Password updated. Please log in.', 'success');
              nav('/login');
            });
          }}
        >
          <Field label={t('otp')} error={errs.otp}>
            <input inputMode="numeric" maxLength={6} className="input text-center font-mono text-lg tracking-[0.5em]" value={f.otp} onChange={(e) => setF({ ...f, otp: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <Field label="New password" error={errs.password}>
            <input type="password" autoComplete="new-password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          </Field>
          <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="size-4" />}{t('resetPassword')}</button>
          <button type="button" className="btn-ghost w-full" onClick={() => setStep(1)}>{t('back')}</button>
        </form>
      )}
      <p className="mt-6 text-center text-sm"><Link to="/login" className="text-accent-600 hover:underline">{t('login')}</Link></p>
    </AuthShell>
  );
}
