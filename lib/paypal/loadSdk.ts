'use client';

let loadingPromise: Promise<typeof window.paypal> | null = null;

type SdkOpts = {
  clientId: string;
  currency?: string; // default USD
  components?: string; // default 'buttons'
  intent?: 'capture' | 'authorize' | 'subscription'; // default 'subscription'
  vault?: boolean; // default true
};

export function loadPayPalSdk(opts: SdkOpts): Promise<typeof window.paypal> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if ((window as any).paypal) return Promise.resolve((window as any).paypal);

  if (loadingPromise) return loadingPromise;

  const {
    clientId,
    currency = 'USD',
    components = 'buttons',
    intent = 'subscription',
    vault = true,
  } = opts;

  const qs = new URLSearchParams({
    'client-id': clientId,
    components,
    currency,
    intent,
    vault: String(vault),
  });

  loadingPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?${qs.toString()}`;
    s.async = true;
    s.onload = () => {
      const pp = (window as any).paypal;
      if (!pp) reject(new Error('PayPal SDK loaded but window.paypal missing'));
      else resolve(pp);
    };
    s.onerror = () => reject(new Error('PayPal SDK failed to load'));
    document.head.appendChild(s);
  });

  return loadingPromise;
}