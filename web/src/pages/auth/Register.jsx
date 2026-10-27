import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Gift } from 'lucide-react';
import { apiErrorMessage, registerSchema, zodFieldErrors } from '@propertyhub/shared';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Field, Spinner } from '../../components/ui';
import AuthShell from './AuthShell';

export default function Register() {
  const { t } = useTranslation();
  const { user, signIn } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', role: 'buyer' });
  const [errs, setErrs] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={loc.state?.from || '/'} replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const r = registerSchema.safeParse(f);
    if (!r.success) return setErrs(zodFieldErrors(r.error));
    setErrs({});
    setError('');
    setBusy(true);
    try {
      const data = await api.auth.register(r.data);
      signIn(data);
      toast(`Welcome! You have ${data.balance.free} free contact credits.`, 'success');
      nav(loc.state?.from || (r.data.role === 'agent' ? '/post-property' : '/properties'), { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t('createAccount')}>
      <div className="mb-5 flex items-center gap-3 rounded-xl bg-accent-50 p-3 text-sm text-accent-700 dark:bg-accent-600/10 dark:text-accent-500">
        <Gift className="size-5 shrink-0" /> Sign up and get 7 free owner contacts.
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
        <Field label={t('name')} error={errs.name}>
          <input className="input" autoComplete="name" value={f.name} onChange={set('name')} />
        </Field>
        <Field label={t('email')} error={errs.email}>
          <input type="email" autoComplete="email" className="input" value={f.email} onChange={set('email')} />
        </Field>
        <Field label={t('phone')} error={errs.phone}>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">+91</span>
            <input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} className="input rounded-l-none" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '') })} />
          </div>
        </Field>
        <Field label={t('password')} error={errs.password} hint="At least 8 characters with a letter and a number">
          <input type="password" autoComplete="new-password" className="input" value={f.password} onChange={set('password')} />
        </Field>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 accent-[#059669]" checked={f.role === 'agent'} onChange={(e) => setF({ ...f, role: e.target.checked ? 'agent' : 'buyer' })} />
          {t('iAmAgent')}
        </label>
        <button className="btn-primary w-full py-3" disabled={busy}>{busy && <Spinner className="size-4" />}{t('register')}</button>
        <p className="text-xs text-slate-500">
          By signing up you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        {t('haveAccount')}{' '}
        <Link to="/login" state={loc.state} className="font-semibold text-accent-600 hover:underline">{t('login')}</Link>
      </p>
    </AuthShell>
  );
}
