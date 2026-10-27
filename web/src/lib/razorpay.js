import { APP_NAME } from '@propertyhub/shared';

let loader;
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  if (!loader) {
    loader = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true);
      s.onerror = () => {
        loader = null;
        resolve(false);
      };
      document.body.appendChild(s);
    });
  }
  return loader;
}

/**
 * Opens Razorpay Checkout for a server-created order.
 * Resolves with { status: 'success', response } | { status: 'dismissed' } | { status: 'failed', error }.
 */
export async function openCheckout(order) {
  const ok = await loadRazorpay();
  if (!ok) return { status: 'failed', error: { description: 'Could not load Razorpay. Check your connection.' } };
  return new Promise((resolve) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amountPaise,
      currency: order.currency,
      name: APP_NAME,
      description: `${order.plan.credits} contact credits`,
      order_id: order.razorpayOrderId,
      prefill: order.prefill,
      theme: { color: '#059669' },
      handler: (response) => resolve({ status: 'success', response }),
      modal: { ondismiss: () => resolve({ status: 'dismissed' }), confirm_close: true },
    });
    rzp.on('payment.failed', (resp) => resolve({ status: 'failed', error: resp.error }));
    rzp.open();
  });
}
