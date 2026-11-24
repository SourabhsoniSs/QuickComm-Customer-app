import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { PageHeader } from '@/components/ui';
import { useSnackbar } from '@/context/snackbar';
import { customerApi } from '@/lib/api';
import { color, space, type } from '@/theme/tokens';

/** Builds a page that opens Razorpay Checkout and posts the outcome back to the app. */
function checkoutHtml(c: any) {
  const options = {
    key: c.keyId,
    order_id: c.razorpayOrderId,
    amount: c.amount,
    currency: c.currency || 'INR',
    name: c.name || 'A to Z Grocery',
    description: c.description,
    prefill: c.prefill || {},
    theme: { color: '#126b3e' },
  };
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://checkout.razorpay.com/v1/checkout.js"></script></head>
<body style="background:#fffefa">
<script>
  function send(m){ window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  try {
    var o = ${JSON.stringify(options)};
    o.handler = function(r){ send({ type: 'success', data: r }); };
    o.modal = { ondismiss: function(){ send({ type: 'dismiss' }); } };
    var rzp = new Razorpay(o);
    rzp.on('payment.failed', function(r){ send({ type: 'failed', reason: r && r.error && r.error.description }); });
    rzp.open();
  } catch (e) { send({ type: 'error', reason: String(e) }); }
</script></body></html>`;
}

export default function PaymentScreen() {
  const { orderId, merchantOrderId, checkout } = useLocalSearchParams<{ orderId: string; merchantOrderId: string; checkout: string }>();
  const insets = useSafeAreaInsets();
  const snackbar = useSnackbar();
  const [verifying, setVerifying] = useState(false);
  const html = useMemo(() => {
    try {
      return checkoutHtml(JSON.parse(String(checkout)));
    } catch {
      return '';
    }
  }, [checkout]);

  const goToOrder = () => router.replace({ pathname: '/order/[orderId]', params: { orderId: String(orderId) } });

  // Poll the server until the payment is captured (same as the website)
  const confirm = async () => {
    setVerifying(true);
    for (let i = 0; i < 10; i += 1) {
      try {
        const r = await customerApi.verifyPaymentStatus(String(merchantOrderId));
        const status = r.data?.result?.status;
        if (status === 'CAPTURED') {
          snackbar('Payment received. Order placed!', 'success');
          return goToOrder();
        }
        if (status === 'FAILED' || status === 'CANCELLED') {
          snackbar('Payment failed. You can pay again from the order page.', 'error');
          return goToOrder();
        }
      } catch {}
      await new Promise((res) => setTimeout(res, 1500));
    }
    snackbar('Payment is being confirmed by your bank. Check the order for updates.');
    goToOrder();
  };

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: any = {};
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {}
    if (msg.type === 'success') confirm();
    else if (msg.type === 'dismiss') {
      snackbar('Payment not completed. You can pay from the order page.');
      goToOrder();
    } else if (msg.type === 'error') {
      snackbar('Could not open the payment page.', 'error');
      goToOrder();
    }
  };

  return (
    <View style={styles.screen}>
      <PageHeader title="Payment" subtitle={`Order #${String(orderId).slice(-6)}`} back={false} />
      {verifying || !html ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={color.primary} />
          <Text style={styles.text}>{html ? 'Confirming your payment…' : 'Payment details missing'}</Text>
        </View>
      ) : (
        <WebView
          originWhitelist={['*']}
          source={{ html, baseUrl: 'https://checkout.razorpay.com' }}
          onMessage={onMessage}
          javaScriptEnabled
          style={{ marginBottom: insets.bottom }}
          startInLoadingState
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  text: { ...type.bodyMedium, color: color.onSurfaceVariant },
});
