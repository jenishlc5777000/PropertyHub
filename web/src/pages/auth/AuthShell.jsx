import { Seo } from '../../components/ui';

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="container-x flex min-h-[80vh] items-center justify-center py-12">
      <Seo title={title} noindex />
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

