// Works for both one-time buttons and subscriptions.
// Single loader to avoid double-including the SDK on client navigation.

export function loadPayPalSdk(): Promise<any> {
  const clientId = (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '').trim();
  if (!clientId) return Promise.reject(new Error('PayPal client ID missing'));

  const EXISTING = document.getElementById('pp-sdk-master') as HTMLScriptElement | null;
  if (EXISTING) {
    if ((window as any).paypal) return Promise.resolve((window as any).paypal);
    return new Promise((resolve, reject) => {
      EXISTING.addEventListener('load', () => resolve((window as any).paypal));
      EXISTING.addEventListener('error', () => reject(new Error('PayPal SDK failed to load')));
    });
  }

  // NO "components=subscriptions" (that causes 400s in sandbox).
  // Use buttons + vault + subscription intent – this covers both flows.
  const src =
    `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}` +
    `&components=buttons&vault=true&intent=subscription&currency=USD`;

  const s = document.createElement('script');
  s.id = 'pp-sdk-master';
  s.src = src;
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.referrerPolicy = 'no-referrer-when-downgrade';

  const p = new Promise<any>((resolve, reject) => {
    s.onload = () => resolve((window as any).paypal);
    s.onerror = () => reject(new Error('PayPal SDK failed to load'));
  });

  document.head.appendChild(s);
  return p;
}