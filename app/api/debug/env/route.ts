import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasMakeWebhookUrl: Boolean(process.env.MAKE_WEBHOOK_URL),
    hasMakeSecret: Boolean(process.env.MAKE_WEBHOOK_SECRET),
  });
}