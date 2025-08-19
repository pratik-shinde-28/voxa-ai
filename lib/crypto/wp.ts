import crypto from 'crypto';

const ALG = 'aes-256-gcm';
// 32-byte key in base64 in env
const RAW_KEY = process.env.WP_CRED_SECRET_BASE64 || '';
const KEY = RAW_KEY ? Buffer.from(RAW_KEY, 'base64') : undefined;

export function encrypt(text: string): string {
  if (!KEY) throw new Error('WP_CRED_SECRET_BASE64 missing');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, KEY, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64'); // iv|tag|cipher
}

export function decrypt(b64: string): string {
  if (!KEY) throw new Error('WP_CRED_SECRET_BASE64 missing');
  const buf = Buffer.from(b64, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALG, KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}