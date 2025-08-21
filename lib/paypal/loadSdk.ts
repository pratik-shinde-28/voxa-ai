'use client';

// Let TS know window.paypal exists on the client.
declare global {
  interface Window {
    paypal?: any;
  }
}

let loadingPromise: Promise<any> | null = null;

type SdkOpts = {
  clientId: string;
  components?: string;                // e.g., 'buttons' or 'buttons,subscriptions'
  currency?: string;                  // e.g., 'USD'
  vault?: boolean;                    // true when using subscriptions
  intent?: 'capture' | 'authorize' | 'subscription';
};

/**
 * Load the PayPal JS SDK once per page. Returns the window.paypal namespace.
 */
export async function loadPayPalSDK(opts: SdkOpts) {
  if (typeof window === 'undefined') return null;

  // Already loaded?
  if (window.paypal) return window.paypal;

  // Already loading?
  if (loadingPromise) return loadingPromise;

  const params = new URLSearchParams({
    'client-id': opts.clientId,
    components: opts.components ?? 'buttons',
    currency: opts.currency ?? 'USD',
  });

  if (opts.vault) params.set('vault', 'true');
  if (opts.intent) params.set('intent', opts.intent);

  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
    script.async = true;

    script.onload = () => {
      if (window.paypal) resolve(window.paypal);
      else reject(new Error('PayPal SDK failed to load'));
    };
    script.onerror = () => reject(new Error('PayPal SDK network error'));

    document.head.appendChild(script);
  });

  try {
    return await loadingPromise;
  } finally {
    // If it failed, allow a reattempt; if it succeeded, this is harmless.
    loadingPromise = null;
  }
}

export type PayPalNS = any;