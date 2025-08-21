# Voxa AI – Context

## Stack
- Next.js (App Router), TypeScript, Tailwind
- Supabase (auth, DB)
- Make.com (webhooks & automations)
- WordPress (draft publishing)

## Key env vars (no secrets)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
MAKE_WEBHOOK_URL=...
MAKE_WEBHOOK_SECRET=...
NEXT_PUBLIC_BASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
WP_CRED_SECRET_BASE64 = <32 bytes random, base64>  (generate once)

## Important routes
- /api/jobs (create job, ping Make)
- /api/webhooks/make (status callbacks)

## Tables
- jobs: {id, user_id, keyword, target_wc, additional_details, status, slug, wp_post_id, wp_url, error, created_at}
- wp_configs: {id, user_id, base_url, username, app_password_enc, created_at, uploaded_at}

## Make scenario (high level)
1) Webhook (Custom)
2) Set Variable
3) HTTP POST request with error handler
4) OpenAI → JSON (With error handler)
5) HTTP POST (Published on WP with error handler)