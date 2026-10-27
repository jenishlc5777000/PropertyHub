import { useTranslation } from 'react-i18next';
import EmiCalculator from '../components/EmiCalculator';
import { PageHeader, Seo } from '../components/ui';

export default function EmiPage() {
  const { t } = useTranslation();
  return (
    <div className="container-x max-w-4xl py-8">
      <Seo title="Home Loan EMI Calculator" description="Calculate your monthly home loan EMI, total interest and total payment instantly." path="/emi-calculator" />
      <PageHeader title={t('emiCalculator')} subtitle="Estimate your monthly home loan instalment. Rates shown are indicative; check with your bank." />
      <div className="card p-6">
        <EmiCalculator price={7500000} />
      </div>
      <div className="mt-8 space-y-3 text-sm text-slate-600 dark:text-slate-300">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">How is EMI calculated?</h2>
        <p>EMI = P × r × (1 + r)<sup>n</sup> / ((1 + r)<sup>n</sup> − 1), where P is the loan amount, r is the monthly interest rate (annual rate ÷ 12 ÷ 100) and n is the number of monthly instalments.</p>
        <p>Most Indian banks finance up to 75–90% of the property value. Stamp duty, registration and interiors are usually paid by the buyer upfront.</p>
      </div>
    </div>
  );
}
