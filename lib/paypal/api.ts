const MODE = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase();
export const PAYPAL_BASE =
  MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

export async function getPayPalAccessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID || '';
  const sec = process.env.PAYPAL_SECRET || '';
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + Buffer.from(id + ':' + sec).toString('base64') },
    body: new URLSearchParams({ grant_type: 'client_credentials' })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`PayPal token error: ${res.status} ${t}`);
  }
  const j = await res.json();
  return j.access_token as string;
}