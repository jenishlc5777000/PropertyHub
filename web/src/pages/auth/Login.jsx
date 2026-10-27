import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiErrorMessage, loginSchema, zodFieldErrors } from '@propertyhub/shared';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Field, Spinner } from '../../components/ui';
import AuthShell from './AuthShell';

export default function Login() {
  const { t } = useTranslation();
  const { user, signIn } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || '/';
  const [f, setF] = useState({ email: '', password: '' });
  const [errs, setErrs] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const r = loginSchema.safeParse(f);
    if (!r.success) return setErrs(zodFieldErrors(r.error));
    setErrs({});
    setError('');
    setBusy(true);
    try {
      signIn(await api.auth.login(r.data));
      nav(from, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t('welcomeBack')} subtitle={loc.state?.reason ? t(loc.state.reason) : undefined}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
        <Field label={t('email')} error={errs.email}>
          <input type="email" autoComplete="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label={t('password')} error={errs.password}>
          <input type="password" autoComplete="current-password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </Field>
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-medium text-accent-600 hover:underline">{t('forgotPassword')}</Link>
        </div>
        <button className="btn-primary w-full py-3" disabled={busy}>{busy && <Spinner className="size-4" />}{t('login')}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        {t('noAccount')}{' '}
        <Link to="/register" state={loc.state} className="font-semibold text-accent-600 hover:underline">{t('register')}</Link>
      </p>
      {import.meta.env.DEV && (
        <p className="mt-4 rounded-lg bg-slate-100 p-3 text-xs text-slate-500 dark:bg-slate-800">
          Demo: buyer@propertyhub.in / Buyer@12345 · priya@propertyhub.in / Agent@12345 · admin@propertyhub.in / Admin@12345
        </p>
      )}
    </AuthShell>
  );
}
