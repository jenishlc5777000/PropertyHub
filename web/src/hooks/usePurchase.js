import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiErrorMessage } from '@propertyhub/shared';
import { api } from '../lib/api';
import { openCheckout } from '../lib/razorpay';
import { useToast } from '../context/ToastContext';

/**
 * Runs the full purchase flow: create order -> Razorpay Checkout -> server verify.
 * status: idle | creating | checkout | verifying | success | failed | pending | cancelled
 */
export function usePurchase() {
  const qc = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['balance'] });
    qc.invalidateQueries({ queryKey: ['orders'] });
  };

  async function buy(planId, promoCode) {
    setError(null);
    setStatus('creating');
    let order;
    try {
      order = await api.payments.createOrder({ planId, promoCode: promoCode || undefined });
    } catch (e) {
      setStatus('failed');
      setError(apiErrorMessage(e));
      toast(apiErrorMessage(e), 'error');
      return { status: 'failed' };
    }

    setStatus('checkout');
    let result;
    if (order.mock) {
      // Dev only: the API has no Razorpay keys, so simulate the checkout.
      const okPay = window.confirm(
        `[TEST MODE – no Razorpay keys configured]\n\nSimulate a successful payment of ₹${order.amount}?\nOK = success, Cancel = failure`
      );
      result = okPay
        ? {
            status: 'success',
            response: {
              razorpay_order_id: order.razorpayOrderId,
              razorpay_payment_id: `pay_mock_${Date.now()}`,
              razorpay_signature: 'mock',
            },
          }
        : { status: 'failed', error: { description: 'Simulated failure' } };
    } else {
      result = await openCheckout(order);
    }

    if (result.status === 'dismissed') {
      setStatus('cancelled');
      api.payments.markFailed(order.orderId, 'Checkout closed by user').catch(() => {});
      return { status: 'cancelled' };
    }
    if (result.status === 'failed') {
      setStatus('failed');
      const msg = result.error?.description || t('paymentFailed');
      setError(msg);
      toast(`${t('paymentFailed')} (${msg})`, 'error', 7000);
      api.payments.markFailed(order.orderId, msg).catch(() => {});
      return { status: 'failed' };
    }

    setStatus('verifying');
    try {
      const v = await api.payments.verify(result.response);
      qc.setQueryData(['balance'], v.balance);
      refresh();
      setStatus('success');
      toast(t('paymentSuccess'), 'success');
      return { status: 'success', data: v };
    } catch (e) {
      // Money may have been captured; the webhook will credit the wallet. Poll for a bit.
      if (!e.response || e.response.status >= 500) {
        setStatus('pending');
        toast(t('paymentPending'), 'info', 8000);
        [5000, 15000, 30000].forEach((ms) => setTimeout(refresh, ms));
        return { status: 'pending' };
      }
      setStatus('failed');
      setError(apiErrorMessage(e));
      toast(apiErrorMessage(e), 'error');
      return { status: 'failed' };
    }
  }

  return { buy, status, error, busy: ['creating', 'checkout', 'verifying'].includes(status), reset: () => setStatus('idle') };
}
