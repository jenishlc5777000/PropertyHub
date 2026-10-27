import { Alert, NativeModules, TurboModuleRegistry } from 'react-native';
import { APP_NAME } from '@propertyhub/shared';

// react-native-razorpay is a native module: it exists in EAS dev/production builds, not in Expo Go.
// Only require it when the native side is present, otherwise its getEnforcing() call would throw.
let RazorpayCheckout = null;
const hasNative = (() => {
  try {
    return Boolean(TurboModuleRegistry.get('RNRazorpayCheckout') || NativeModules.RNRazorpayCheckout);
  } catch {
    return false;
  }
})();
if (hasNative) {
  RazorpayCheckout = require('react-native-razorpay').default;
}
export const razorpayAvailable = () => Boolean(RazorpayCheckout);

const confirmAsync = (title, message) =>
  new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Fail', style: 'destructive', onPress: () => resolve(false) },
      { text: 'Succeed', onPress: () => resolve(true) },
    ])
  );

/**
 * Opens checkout for a server-created order.
 * Resolves { status: 'success', response } | { status: 'dismissed' } | { status: 'failed', error }.
 */
export async function openCheckout(order) {
  if (order.mock) {
    const ok = await confirmAsync('Test mode', `No Razorpay keys on the server. Simulate payment of ₹${order.amount}?`);
    return ok
      ? {
          status: 'success',
          response: { razorpay_order_id: order.razorpayOrderId, razorpay_payment_id: `pay_mock_${Date.now()}`, razorpay_signature: 'mock' },
        }
      : { status: 'failed', error: { description: 'Simulated failure' } };
  }
  if (!RazorpayCheckout) {
    return { status: 'failed', error: { description: 'Payments need the PropertyHub app build (not Expo Go).' } };
  }
  try {
    const data = await RazorpayCheckout.open({
      key: order.keyId,
      amount: order.amountPaise,
      currency: order.currency,
      name: APP_NAME,
      description: `${order.plan.credits} contact credits`,
      order_id: order.razorpayOrderId,
      prefill: order.prefill,
      theme: { color: '#059669' },
    });
    return { status: 'success', response: data };
  } catch (e) {
    // code 0 / 2 = user cancelled (Android/iOS); everything else is a failure
    const code = e?.code ?? e?.error?.code;
    if (code === 0 || code === 2 || /cancel/i.test(e?.description || e?.error?.description || '')) return { status: 'dismissed' };
    return { status: 'failed', error: { description: e?.error?.description || e?.description || 'Payment failed' } };
  }
}
