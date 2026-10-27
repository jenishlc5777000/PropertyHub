import { Mail, MapPin, Phone } from 'lucide-react';
import { APP_NAME } from '@propertyhub/shared';
import { Seo } from '../components/ui';

const UPDATED = 'October 2026';

const PAGES = {
  about: {
    title: `About ${APP_NAME}`,
    body: (
      <>
        <p>{APP_NAME} connects home buyers, tenants, owners and agents across India's fastest-growing cities. Every listing is reviewed by our team before going live, and buyers talk to owners directly — no hidden brokerage layers.</p>
        <h2>How it works</h2>
        <ul>
          <li><b>Browse for free.</b> Search by city, locality, budget, bedrooms and amenities, or explore on the map.</li>
          <li><b>Unlock contacts with credits.</b> Every new account gets 7 free contact credits. More are available at ₹999 for 100 (₹9.99 per contact), valid for 12 months.</li>
          <li><b>List for free.</b> Owners and agents post unlimited listings and receive leads in-app.</li>
        </ul>
      </>
    ),
  },
  contact: {
    title: 'Contact us',
    body: (
      <>
        <p>We usually reply within one business day.</p>
        <div className="not-prose mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Mail, label: 'Email', value: 'support@propertyhub.in', href: 'mailto:support@propertyhub.in' },
            { icon: Phone, label: 'Phone', value: '+91 80 0000 0000', href: 'tel:+918000000000' },
            { icon: MapPin, label: 'Office', value: 'Bengaluru, Karnataka' },
          ].map(({ icon: Icon, label, value, href }) => (
            <a key={label} href={href} className="card block p-5">
              <Icon className="size-5 text-accent-600" />
              <p className="mt-2 text-xs text-slate-500">{label}</p>
              <p className="font-semibold">{value}</p>
            </a>
          ))}
        </div>
        <p className="mt-6 text-sm">For payment or invoice issues, include your invoice number (e.g. PH/2026-27/000123).</p>
      </>
    ),
  },
  privacy: {
    title: 'Privacy Policy',
    body: (
      <>
        <p>This policy explains what personal data {APP_NAME} collects and how we use it, in line with India's Digital Personal Data Protection Act, 2023.</p>
        <h2>What we collect</h2>
        <ul>
          <li>Account details: name, email, mobile number, and optional photo and WhatsApp number.</li>
          <li>Listing details you post, including address and map location.</li>
          <li>Activity: saved properties, inquiries, visit requests and contacts you unlock.</li>
          <li>Payment records: order ID, amount and status. Card/UPI details are handled by Razorpay and never stored by us.</li>
        </ul>
        <h2>How we use it</h2>
        <ul>
          <li>To run the service, show your listings, deliver messages and notifications, and issue GST invoices.</li>
          <li>To prevent fraud and scraping (for example, rate-limiting contact unlocks).</li>
        </ul>
        <h2>Sharing</h2>
        <p>Owner contact details are shown only to users who unlock them. We share data with service providers (hosting, email, payments) solely to operate {APP_NAME}. We do not sell personal data.</p>
        <h2>Your rights</h2>
        <p>You can access, correct or delete your data by writing to privacy@propertyhub.in. Invoices are retained as required by tax law.</p>
      </>
    ),
  },
  terms: {
    title: 'Terms of Service',
    body: (
      <>
        <p>By using {APP_NAME} you agree to these terms.</p>
        <h2>Listings</h2>
        <ul>
          <li>Owners and agents must have the right to list a property and must provide accurate information and genuine photos.</li>
          <li>We may reject or remove listings that are misleading, duplicated or unlawful.</li>
        </ul>
        <h2>Contact credits</h2>
        <ul>
          <li>One credit reveals the contact details of one property. Re-viewing an unlocked property is free.</li>
          <li>Free sign-up credits do not expire. Purchased credits are valid for the period shown at purchase (12 months by default).</li>
          <li>Credits are non-transferable and have no cash value.</li>
          <li>Bulk unlocking, scraping or reselling contact data is prohibited and may lead to suspension without refund.</li>
        </ul>
        <h2>Transactions between users</h2>
        <p>{APP_NAME} is a platform. We are not a party to any sale or rental agreement. Verify ownership documents and RERA registration before paying any token amount.</p>
      </>
    ),
  },
  refund: {
    title: 'Refund Policy',
    body: (
      <>
        <ul>
          <li>If you were charged but credits were not added, contact us within 7 days and we will either add the credits or refund the payment in full.</li>
          <li>Unused credit packs can be refunded within 7 days of purchase if no credits from that pack have been used.</li>
          <li>Once credits from a pack are used, the pack is non-refundable.</li>
          <li>Approved refunds are processed to the original payment method via Razorpay within 5–7 business days. Any unused credits from that pack are removed.</li>
          <li>Expired credits are not refundable.</li>
        </ul>
        <p>To request a refund, email billing@propertyhub.in with your invoice number.</p>
      </>
    ),
  },
};

export default function Static({ page }) {
  const p = PAGES[page];
  return (
    <div className="container-x max-w-3xl py-10">
      <Seo title={p.title} path={`/${page === 'refund' ? 'refund-policy' : page}`} />
      <h1 className="text-3xl font-bold tracking-tight">{p.title}</h1>
      {['privacy', 'terms', 'refund'].includes(page) && <p className="mt-1 text-sm text-slate-500">Last updated: {UPDATED}</p>}
      <div className="mt-6 space-y-4 leading-relaxed text-slate-700 dark:text-slate-300 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
        {p.body}
      </div>
    </div>
  );
}
