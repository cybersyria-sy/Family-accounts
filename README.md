# Family Accounts · حسابات العائلة

A simple bilingual (Arabic / English) app to track what family members lend to and borrow from each other, in any currency, gold, silver, shares or other items. Balances are kept separately per asset.

## Stack
- Next.js (client-side app) on Vercel
- Supabase: email sign-in and Postgres with row-level security (`supabase/migrations`)

## Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=https://obfpxfbmjdubshwdlamy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key from Supabase → Project settings → API keys>
```

## Local development
```
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

## Deploy
Hosted on Vercel (project `family-accounts`). Every push to `main` deploys automatically.
After the first deploy, set Supabase → Authentication → URL Configuration → Site URL to the Vercel address.
