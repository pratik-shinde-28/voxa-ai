const BASE =
  (process.env.PAYPAL_MODE || 'sandbox') === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

export async function paypalAccessToken() {
  const id = process.env.PAYPAL_CLIENT_ID!;
  const sec = process.env.PAYPAL_SECRET!;
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(id + ':' + sec).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('PayPal token failed');
  const j = await res.json();
  return { token: j.access_token as string, base: BASE };
}