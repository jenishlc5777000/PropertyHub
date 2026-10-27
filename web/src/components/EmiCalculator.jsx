import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateEmi, formatINR } from '@propertyhub/shared';

function Slider({ label, value, onChange, min, max, step, display }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-semibold">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#059669]"
        aria-label={label}
      />
    </div>
  );
}

export default function EmiCalculator({ price = 5000000 }) {
  const { t } = useTranslation();
  const [loan, setLoan] = useState(Math.round(price * 0.8));
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);
  const { emi, totalInterest, totalPayment } = calculateEmi(loan, rate, years);
  const principalPct = totalPayment ? Math.round((loan / totalPayment) * 100) : 0;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-5">
        <Slider label={t('loanAmount')} value={loan} onChange={setLoan} min={100000} max={Math.max(price * 1.2, 20000000)} step={50000} display={formatINR(loan)} />
        <Slider label={t('interestRate')} value={rate} onChange={setRate} min={5} max={15} step={0.05} display={`${rate.toFixed(2)}%`} />
        <Slider label={t('tenure')} value={years} onChange={setYears} min={1} max={30} step={1} display={`${years}`} />
      </div>
      <div className="rounded-2xl bg-brand-900 p-5 text-white">
        <p className="text-sm text-brand-200">{t('monthlyEmi')}</p>
        <p className="text-3xl font-extrabold">{formatINR(emi)}</p>
        <div className="my-4 flex h-2.5 overflow-hidden rounded-full bg-amber-400" aria-hidden>
          <div className="bg-accent-500" style={{ width: `${principalPct}%` }} />
        </div>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-accent-500" />{t('loanAmount')}</dt><dd>{formatINR(loan)}</dd></div>
          <div className="flex justify-between"><dt className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-amber-400" />{t('totalInterest')}</dt><dd>{formatINR(totalInterest)}</dd></div>
          <div className="flex justify-between border-t border-white/10 pt-1.5 font-semibold"><dt>{t('totalPayment')}</dt><dd>{formatINR(totalPayment)}</dd></div>
        </dl>
      </div>
    </div>
  );
}
