import { Check } from 'lucide-react';
import { Seo } from '../../components/ui';
import { useConfig } from '../../hooks/useData';

export default function AuthShell({ title, subtitle, children }) {
  const { cities, freeCredits } = useConfig();
  return (
    <div className="container-x py-10 lg:py-16">
      <Seo title={title} noindex />
      <div className="card mx-auto grid max-w-5xl overflow-hidden p-0 lg:grid-cols-[1fr_1.05fr]">
        <div className="p-8 sm:p-12">
          <h1 className="text-[32px] leading-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
        <aside className="relative hidden min-h-[560px] lg:block">
          <img
            src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=75&auto=format&fit=crop"
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-900/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-white">
            <p className="font-display text-3xl leading-tight">Homes across {cities.map((c) => c.name).join(', ')}, straight from the owner.</p>
            <ul className="mt-5 space-y-2 text-sm text-white/85">
              {[`${freeCredits ?? 7} free owner contacts when you sign up`, 'Every listing reviewed before it goes live', 'Save homes and get price-drop alerts'].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <Check className="size-4 text-accent-400" /> {x}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
