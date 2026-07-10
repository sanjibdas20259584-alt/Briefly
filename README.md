# Briefly

A calm, private, single-owner freelancing workspace. Briefly helps you run your
freelance business end-to-end: clients, projects, invoices, proposals, Telegram
reminders, and a personal AI assistant that knows your business.

Built for **Sanjib** — but you can rename in Settings.

> One owner only. No teams, no multi-tenant, no public portals. Secure
> email/password login with `httpOnly` cookie sessions, and Row Level Security on
> every table so only you can ever read your data.

---

## Stack

- **Next.js 14** (App Router) + TypeScript + React 18
- **Tailwind CSS** — monochrome + emerald palette, minimal UI
- **Supabase** — Postgres, Auth (email/password), Storage-ready
- **Server Actions** for all mutations (server-only → secrets never reach the browser)
- **pdf-lib** for invoice/proposal PDF export
- **OpenAI-compatible** model providers for the chatbot (OpenRouter, etc.)

Deploy target: **Vercel** (frontend) + **Supabase** (backend).

---

## Features

| Area | What you get |
| --- | --- |
| **Dashboard** | Active clients, active projects, unpaid invoices, upcoming reminders, recent activity, quick actions. Greets you by name. |
| **Clients** | Add / edit / delete / search. Tags, favorites, social links, notes, last-contact date. Detail page with projects, invoices, proposals, notes. |
| **Projects** | Status, priority, dates, checklist, milestones, progress. Linked client, proposal, invoices, reminders. |
| **Invoices** | Line items, qty/rate, subtotal/tax/discount/total, auto number (`INV-YYYYMM-###`), status flow, **PDF export**, duplicate, mark paid. |
| **Proposals** | Scope, timeline, pricing, terms, items, acceptance status, **PDF export**, duplicate. |
| **Reminders** | One-time or recurring, linked to client/project/invoice/proposal, **delivered to your Telegram bot**, with delivery history. |
| **Assistant** | Chat with a personal freelancing copilot that uses your own data (projects, invoices, reminders) for context. Multiple OpenAI-compatible models, selectable. |
| **Settings** | Your name, Telegram config, and encrypted custom model providers with a "test connection" button. |

---

## Local setup

### 1. Create a Supabase project
1. Go to [supabase.com](https://supabase.com) → New project.
2. Project Settings → API: copy **Project URL**, **anon public key**, and
   **service_role key** (keep this secret).
3. Enable **Email** auth (Authentication → Providers → Email, disable confirmations
   for local testing if you like).

### 2. Install & configure
```bash
npm install
cp .env.example .env.local
```
Fill in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...            # server-only
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENCRYPTION_KEY=<base64 of 32 random bytes>
# optional cron protection:
CRON_SECRET=some-secret
```
Generate `ENCRYPTION_KEY`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Create the database
Run the migrations in `supabase/migrations/` **in order** via the Supabase SQL
Editor (or `supabase db push`):
1. `0001_init.sql` — tables
2. `0002_rls.sql` — row level security
3. `0003_functions.sql` — triggers, numbering, reminder sweep
4. (No seed — you start fresh.)

The triggers auto-create your `user_profiles` + `app_settings` rows on first signup.

### 4. Run
```bash
npm run dev
```
Open http://localhost:3000 → create your owner account → start using Briefly.

---

## Connecting Telegram

1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy the bot token.
2. Message [@userinfobot](https://t.me/userinfobot) → it replies with your numeric **chat id**.
3. Settings → Telegram reminders → paste token + chat id → Save.
4. Click **Test Telegram** on the Reminders page to confirm a message arrives.

Reminders are sent by a **Vercel Cron** every 5 minutes (`/api/reminders/send`),
or instantly with the "Send now" button. Protect the cron with `CRON_SECRET` if you set one.

---

## Adding a model provider (chatbot)

1. Settings → Model providers → Add provider.
2. Name it (e.g. "OpenRouter"), set the Base URL
   (`https://openrouter.ai/api/v1`), and the model name (e.g. `openai/gpt-4o-mini`).
3. Paste your API key — it is **encrypted with `ENCRYPTION_KEY`** before storage and
   is never sent to the browser.
4. Click **Test connection**. Mark one as default.
5. Open the Assistant — chat using your own business context.

Any OpenAI-compatible API works (OpenRouter, OpenAI, Together, Groq, local llama.cpp, …).

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Import** the repo → Framework: Next.js (auto-detected).
3. Add the **Environment Variables** from `.env.local` (same names).
4. Deploy. Set `NEXT_PUBLIC_APP_URL` to your production URL.
5. Run the Supabase migrations (SQL editor) once.
6. Visit the deployed URL → sign up as owner.

No `vercel.json` tweaks needed beyond the reminder cron.

---

## Security notes

- Auth uses Supabase session cookies (`httpOnly`, signed, server-refreshed) — not
  localStorage tokens.
- "Remember me" extends the session (30 days vs 2 days) via `expiresIn`.
- Every table has RLS policies scoped to `auth.uid()`. The anon role gets nothing.
- `SUPABASE_SERVICE_ROLE_KEY` and `ENCRYPTION_KEY` are server-only (never bundled).
- Telegram tokens and model API keys are encrypted (AES-256-GCM) at rest and only
  decrypted inside server code when actually sending/requesting.
- Client components receive provider metadata **without** the key (`has_key` only).

---

## Project layout

```
src/
  app/
    login/                 # email/password + remember me
    (app)/                 # protected shell (sidebar + topbar)
      page.tsx             # Dashboard
      clients/ projects/ invoices/ proposals/ reminders/ chatbot/ settings/ activity/
    api/
      chat/                # proxy to chosen model provider
      reminders/send/      # cron: deliver due reminders to Telegram
      telegram/test/       # send a test message
  components/              # ui primitives + feature components
  lib/
    actions/               # server actions (mutations)
    queries/               # server-side reads
    supabase/              # server / service / client clients
    crypto.ts              # AES-256-GCM
    telegram.ts            # delivery
    pdf/                   # invoice + proposal PDF builders
    types.ts
supabase/migrations/       # 0001_init, 0002_rls, 0003_functions
```

---

## Scripts

```bash
npm run dev        # local dev
npm run build      # production build
npm run start      # serve production
npm run typecheck  # tsc --noEmit
```

---

Made for focused, private freelancing work.
