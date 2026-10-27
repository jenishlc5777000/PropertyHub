import { GST_RATE } from './constants.js';

/** "9876543210" -> "98XXXXXX10" */
export function maskPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '').slice(-10);
  if (digits.length < 4) return 'XXXXXXXXXX';
  return digits.slice(0, 2) + 'X'.repeat(digits.length - 4) + digits.slice(-2);
}

/** "rahul.sharma@gmail.com" -> "ra*********@gmail.com" */
export function maskEmail(email) {
  if (!email || !email.includes('@')) return '';
  const [user, domain] = email.split('@');
  return user.slice(0, 2) + '*'.repeat(Math.max(user.length - 2, 3)) + '@' + domain;
}

/** Indian number formatting: 1234567 -> "Rs 12,34,567" */
export function formatINR(amount, { symbol = '₹', decimals = 0 } = {}) {
  if (amount == null || isNaN(amount)) return '';
  return (
    symbol +
    Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

/** Compact price: 8500000 -> "₹85 L", 25000000 -> "₹2.5 Cr" */
export function formatPriceShort(amount) {
  if (amount == null) return '';
  const n = Number(amount);
  const trim = (x) => String(Number(x.toFixed(2)));
  if (n >= 1e7) return `₹${trim(n / 1e7)} Cr`;
  if (n >= 1e5) return `₹${trim(n / 1e5)} L`;
  if (n >= 1e3) return `₹${trim(n / 1e3)}K`;
  return `₹${n}`;
}

/** Monthly EMI for a reducing-balance loan. */
export function calculateEmi(principal, annualRatePct, tenureYears) {
  const P = Number(principal) || 0;
  const n = Math.round((Number(tenureYears) || 0) * 12);
  const r = (Number(annualRatePct) || 0) / 12 / 100;
  if (P <= 0 || n <= 0) return { emi: 0, totalInterest: 0, totalPayment: 0 };
  const emi = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalPayment = emi * n;
  return {
    emi: Math.round(emi),
    totalInterest: Math.round(totalPayment - P),
    totalPayment: Math.round(totalPayment),
  };
}

/** Prices are GST-inclusive. 999 -> { base: 846.61, gst: 152.39, total: 999 } */
export function gstBreakdown(inclusiveAmount, rate = GST_RATE) {
  const total = Math.round(Number(inclusiveAmount) * 100) / 100;
  const base = Math.round((total / (1 + rate)) * 100) / 100;
  const gst = Math.round((total - base) * 100) / 100;
  return { base, gst, total };
}

/** Balance summary: "5 free + 40 paid credits left" */
export function formatCredits(balance) {
  if (!balance) return '';
  const free = balance.free ?? 0;
  const paid = balance.paid ?? 0;
  return `${free} free + ${paid} paid credits left`;
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function whatsappLink(phone, text = '') {
  const digits = String(phone || '').replace(/\D/g, '');
  const full = digits.length === 10 ? '91' + digits : digits;
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function titleCase(s) {
  return String(s || '')
    .split(/[-\s]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
