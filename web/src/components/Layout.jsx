import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Building2,
  ChevronDown,
  Coins,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  Receipt,
  Shield,
  Sun,
  Unlock,
  User,
  X,
} from 'lucide-react';
import { LANGUAGES, APP_NAME } from '@propertyhub/shared';
import { useAuth } from '../context/AuthContext';
import { useBalance, useConfig, useNotifications } from '../hooks/useData';
import { api } from '../lib/api';

function useOutside(ref, cb) {
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && cb();
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, cb]);
}

export function Logo({ light }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="PropertyHub home">
      <span className={`grid size-9 place-items-center rounded-full ${light ? 'bg-white/10 text-accent-400 ring-1 ring-white/20' : 'bg-brand-900 text-accent-400 dark:bg-brand-700'}`}>
        <Home className="size-[18px]" strokeWidth={2} />
      </span>
      <span className={`font-display text-[22px] font-semibold tracking-[-0.02em] ${light ? 'text-white' : 'text-brand-900 dark:text-white'}`}>
        Property<span className={light ? 'text-accent-400' : 'text-accent-600 dark:text-accent-400'}>Hub</span>
      </span>
    </Link>
  );
}

export function CreditBadge({ compact }) {
  const { t } = useTranslation();
  const { data } = useBalance();
  if (!data) return null;
  return (
    <Link
      to="/account/credits"
      title={t('creditsLeft', { free: data.free, paid: data.paid })}
      className="chip border border-accent-200 bg-accent-50 py-1.5 text-accent-700 hover:bg-accent-100 dark:border-accent-600/30 dark:bg-accent-600/10 dark:text-accent-500"
    >
      <Coins className="size-3.5" />
      {compact ? data.total : t('creditsLeft', { free: data.free, paid: data.paid })}
    </Link>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('ph_theme', next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  };
  return (
    <button onClick={toggle} className="btn-ghost p-2" aria-label="Toggle dark mode">
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}

function LanguageSelect({ className = '' }) {
  const { i18n, t } = useTranslation();
  return (
    <select
      aria-label={t('language')}
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className={`rounded-lg border border-slate-300 bg-transparent px-2 py-1.5 text-sm dark:border-slate-700 ${className}`}
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code} className="text-slate-900">
          {l.label}
        </option>
      ))}
    </select>
  );
}

function NotificationBell() {
  const { t } = useTranslation();
  const { data } = useNotifications();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutside(ref, () => setOpen(false));
  const readAll = useMutation({
    mutationFn: api.notifications.readAll,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const link = (n) =>
    n.data?.review ? '/admin' : n.data?.inquiryId ? `/account/inquiries?id=${n.data.inquiryId}` : n.data?.slug ? `/property/${n.data.slug}` : n.data?.propertyId ? `/account/listings` : n.type === 'credits' || n.type === 'payment' ? '/account/credits' : null;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost relative p-2" aria-label={t('notifications')}>
        <Bell className="size-5" />
        {data?.unread > 0 && (
          <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="card absolute right-0 z-50 mt-2 w-80 overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <span className="font-semibold">{t('notifications')}</span>
            {data?.unread > 0 && (
              <button onClick={() => readAll.mutate()} className="text-xs font-medium text-accent-600">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!data?.items?.length && <p className="p-6 text-center text-sm text-slate-500">{t('empty')}</p>}
            {data?.items?.slice(0, 20).map((n) => {
              const href = link(n);
              const body = (
                <div className={`border-b border-slate-100 px-4 py-3 text-sm dark:border-slate-800 ${n.read ? '' : 'bg-accent-50/60 dark:bg-accent-600/5'}`}>
                  <p className="font-medium">{n.title}</p>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-slate-500">{n.body}</p>}
                  <p className="mt-1 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString('en-IN')}</p>
                </div>
              );
              return href ? (
                <Link key={n._id} to={href} onClick={() => { setOpen(false); if (!n.read) api.notifications.read(n._id); }}>
                  {body}
                </Link>
              ) : (
                <div key={n._id}>{body}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutside(ref, () => setOpen(false));
  const isAgent = user.role === 'agent' || user.role === 'admin';
  const items = [
    { to: '/account/profile', icon: User, label: t('profile') },
    { to: '/favorites', icon: Heart, label: t('favorites') },
    { to: '/account/inquiries', icon: MessageSquare, label: t('inquiries') },
    { to: '/account/unlocked', icon: Unlock, label: t('unlockedContacts') },
    { to: '/account/credits', icon: Receipt, label: t('creditsBilling') },
    ...(isAgent ? [{ to: '/account/listings', icon: LayoutDashboard, label: t('myListings') }] : []),
    ...(user.role === 'admin' ? [{ to: '/admin', icon: Shield, label: t('admin') }] : []),
  ];
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost gap-2 px-2">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="size-8 rounded-full object-cover" />
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-brand-900 text-sm font-bold text-white">
            {user.name?.[0]?.toUpperCase()}
          </span>
        )}
        <ChevronDown className="size-4" />
      </button>
      {open && (
        <div className="card absolute right-0 z-50 mt-2 w-60 p-2">
          <div className="px-3 py-2">
            <p className="font-semibold">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <hr className="my-1 border-slate-200 dark:border-slate-800" />
          {items.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
              <Icon className="size-4 text-slate-500" /> {label}
            </Link>
          ))}
          <hr className="my-1 border-slate-200 dark:border-slate-800" />
          <button
            onClick={async () => {
              setOpen(false);
              await signOut();
              nav('/');
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <LogOut className="size-4" /> {t('logout')}
          </button>
        </div>
      )}
    </div>
  );
}

/** Admin-only header link showing how many ads are waiting in the review queue. */
function AdminLink() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isAdmin = user?.role === 'admin';
  const { data } = useQuery({ queryKey: ['adminStats'], queryFn: api.admin.stats, enabled: isAdmin, refetchInterval: 60_000 });
  if (!isAdmin) return null;
  const pending = data?.properties?.pending || 0;
  return (
    <Link to="/admin" className="btn-ghost relative hidden gap-1.5 px-3 py-2 md:inline-flex" title={`${pending} ads waiting for review`}>
      <Shield className="size-4" /> {t('admin')}
      {pending > 0 && (
        <span className="grid min-w-5 place-items-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">{pending}</span>
      )}
    </Link>
  );
}

function Header() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const { user } = useAuth();
  const [mobile, setMobile] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    setMobile(false);
  }, [loc.pathname, loc.search]);
  const purpose = new URLSearchParams(loc.search).get('purpose');
  const navCls = ({ isActive }, want) =>
    `relative px-3 py-2 text-sm font-medium transition after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:transition ${isActive && (!want || (loc.pathname === '/properties' && purpose === want)) ? 'text-slate-900 after:bg-accent-600 dark:text-white' : 'text-slate-500 after:bg-transparent hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`;
  return (
    <header className={`sticky top-0 z-40 border-b bg-white/80 backdrop-blur-xl backdrop-saturate-150 transition-shadow duration-300 dark:bg-slate-950/80 ${scrolled ? 'border-slate-200/70 shadow-[0_8px_24px_-16px_rgb(15_42_74/0.35)] dark:border-slate-800' : 'border-transparent'}`}>
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center md:flex">
            <NavLink to="/properties?purpose=sale" className={(a) => navCls(a, 'sale')}>{t('buy')}</NavLink>
            <NavLink to="/properties?purpose=rent" className={(a) => navCls(a, 'rent')}>{t('rent')}</NavLink>
            <NavLink to="/emi-calculator" className={navCls}>EMI</NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="hidden items-center gap-1.5 lg:flex">
            <LanguageSelect />
            <ThemeToggle />
          </div>
          {user && (
            <div className="hidden sm:block">
              <CreditBadge />
            </div>
          )}
          <Link to="/post-property" className="btn-primary hidden py-2 sm:inline-flex">
            <Plus className="size-4" /> {t('postProperty')}
          </Link>
          <AdminLink />
          {user ? (
            <>
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <Link to="/login" className="btn-outline hidden py-2 sm:inline-flex">{t('login')}</Link>
          )}
          <button className="btn-ghost p-2 md:hidden" onClick={() => setMobile((m) => !m)} aria-label="Menu">
            {mobile ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {mobile && (
        <div className="border-t border-slate-200 px-4 py-4 md:hidden dark:border-slate-800">
          <div className="flex flex-col gap-1">
            {user && <div className="mb-2"><CreditBadge /></div>}
            <NavLink to="/properties?purpose=sale" className={(a) => navCls(a, 'sale')}>{t('buy')}</NavLink>
            <NavLink to="/properties?purpose=rent" className={(a) => navCls(a, 'rent')}>{t('rent')}</NavLink>
            <NavLink to="/emi-calculator" className={navCls}>{t('emiCalculator')}</NavLink>
            <NavLink to="/post-property" className={navCls}>{t('postProperty')}</NavLink>
            {!user && <NavLink to="/login" className={navCls}>{t('login')}</NavLink>}
            <div className="mt-2 flex items-center gap-2">
              <LanguageSelect className="flex-1" />
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  const { t } = useTranslation();
  const { cities, singleCity } = useConfig();
  const areas = singleCity ? singleCity.localities.slice(0, 6).map((l) => ({ label: l.name, to: `/properties?locality=${encodeURIComponent(l.name)}` })) : cities.map((c) => ({ label: c.name, to: `/properties?city=${c.name}` }));
  return (
    <footer className="mt-28 bg-brand-900 text-white/70">
      <div className="container-x grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-3 text-sm text-slate-400">{singleCity ? t('taglineCity', { city: singleCity.name }) : t('tagline')}</p>
        </div>
        <div>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-white">{singleCity ? `${t('listings')} in ${singleCity.name}` : t('listings')}</h4>
          <ul className="space-y-2 text-sm">
            {areas.map((a) => (
              <li key={a.label}>
                <Link to={a.to} className="hover:text-white">
                  <Building2 className="mr-1.5 inline size-3.5" />
                  {a.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-white">{APP_NAME}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-white">{t('about')}</Link></li>
            <li><Link to="/contact" className="hover:text-white">{t('contact')}</Link></li>
            <li><Link to="/emi-calculator" className="hover:text-white">{t('emiCalculator')}</Link></li>
            <li><Link to="/post-property" className="hover:text-white">{t('postProperty')}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-white">Legal</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/privacy" className="hover:text-white">{t('privacy')}</Link></li>
            <li><Link to="/terms" className="hover:text-white">{t('terms')}</Link></li>
            <li><Link to="/refund-policy" className="hover:text-white">{t('refund')}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-white/50">
        © {new Date().getFullYear()} {APP_NAME}. Made in India.
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* keyed on the path so each page fades in on navigation */}
      <main key={pathname} className="flex-1 animate-fade-in">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
