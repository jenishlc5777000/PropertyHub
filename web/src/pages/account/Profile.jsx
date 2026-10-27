import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Camera } from 'lucide-react';
import { LANGUAGES, apiErrorMessage, changePasswordSchema, profileSchema, zodFieldErrors } from '@propertyhub/shared';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CreditBadge } from '../../components/Layout';
import { Field, PageHeader, Seo, Spinner } from '../../components/ui';

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: user.name, phone: user.phone, whatsapp: user.whatsapp || '', bio: user.bio || '', language: user.language || i18n.language });
  const [errs, setErrs] = useState({});
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwErrs, setPwErrs] = useState({});

  const save = useMutation({
    mutationFn: api.users.update,
    onSuccess: (u) => {
      setUser(u);
      i18n.changeLanguage(u.language);
      toast('Profile updated', 'success');
    },
    onError: (e) => {
      setErrs(e.response?.data?.error?.details || {});
      toast(apiErrorMessage(e), 'error');
    },
  });
  const avatar = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('avatar', file);
      return api.users.uploadAvatar(fd);
    },
    onSuccess: (u) => setUser(u),
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  const changePw = useMutation({
    mutationFn: api.users.changePassword,
    onSuccess: () => {
      setPw({ currentPassword: '', newPassword: '' });
      toast('Password changed', 'success');
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  return (
    <div className="container-x max-w-3xl py-8">
      <Seo title={t('profile')} noindex />
      <PageHeader title={t('profile')} actions={<CreditBadge />} />

      <div className="card p-6">
        <div className="mb-6 flex items-center gap-4">
          <label className="group relative cursor-pointer">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="size-20 rounded-full object-cover" />
            ) : (
              <span className="grid size-20 place-items-center rounded-full bg-brand-900 text-2xl font-bold text-white">{user.name[0]}</span>
            )}
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
              {avatar.isPending ? <Spinner /> : <Camera className="size-5" />}
            </span>
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files[0] && avatar.mutate(e.target.files[0])} />
          </label>
          <div>
            <p className="text-lg font-semibold">{user.name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
            <span className="chip mt-1 bg-slate-100 capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{user.role}</span>
          </div>
        </div>

        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const r = profileSchema.safeParse(f);
            if (!r.success) return setErrs(zodFieldErrors(r.error));
            setErrs({});
            save.mutate(r.data);
          }}
        >
          <Field label={t('name')} error={errs.name}>
            <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label={t('phone')} error={errs.phone}>
            <input className="input" inputMode="numeric" maxLength={10} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <Field label={t('whatsapp')} error={errs.whatsapp}>
            <input className="input" inputMode="numeric" maxLength={10} value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <Field label={t('language')}>
            <select className="input" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>
          {user.role !== 'buyer' && (
            <div className="sm:col-span-2">
              <Field label="About you (shown on your agent profile)" error={errs.bio}>
                <textarea className="input min-h-24" maxLength={500} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />
              </Field>
            </div>
          )}
          <div className="sm:col-span-2">
            <button className="btn-primary" disabled={save.isPending}>{save.isPending && <Spinner className="size-4" />}{t('save')}</button>
          </div>
        </form>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="mb-4 font-semibold">Change password</h2>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const r = changePasswordSchema.safeParse(pw);
            if (!r.success) return setPwErrs(zodFieldErrors(r.error));
            setPwErrs({});
            changePw.mutate(r.data);
          }}
        >
          <Field label="Current password" error={pwErrs.currentPassword}>
            <input type="password" autoComplete="current-password" className="input" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          </Field>
          <Field label="New password" error={pwErrs.newPassword}>
            <input type="password" autoComplete="new-password" className="input" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <button className="btn-outline" disabled={changePw.isPending}>{changePw.isPending && <Spinner className="size-4" />}Update password</button>
          </div>
        </form>
      </div>
    </div>
  );
}
