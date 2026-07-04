<div align="center">

<img src="public/logo.png" alt="Marketing Mailer Logo" width="96" height="96" />

# 📧 Marketing Mailer

### An enterprise-grade, AI-assisted email marketing platform with intelligent queue throttling, IMAP inbox sync, and full bilingual (Arabic / English) RTL support.

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img alt="Resend" src="https://img.shields.io/badge/Resend-Batch_API-000000?style=for-the-badge&logo=resend&logoColor=white" />
  <img alt="Gemini" src="https://img.shields.io/badge/Google_Gemini-AI-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white" />
</p>

<p>
  <img alt="License" src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
  <img alt="Status" src="https://img.shields.io/badge/status-active-success?style=flat-square" />
  <img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" />
</p>

</div>

---

## 🚀 Overview

**Marketing Mailer** is a full-stack SaaS application for planning, composing, queuing, and dispatching marketing email campaigns at scale — without tripping spam filters or exhausting sending reputation.

Blasting thousands of emails from a single domain is the fastest way to get blocklisted. This platform solves that by pairing a **rich HTML composer** and an **AI copywriting assistant** with a **reputation-aware delivery engine**: a background worker drips campaign emails through hourly/daily caps and pacing delays, sends them via the Resend Batch API, and syncs real replies back into a unified inbox over IMAP.

The result is an **app-like, bilingual (Arabic/English), fully role-controlled** control center where teams can safely run their entire outbound email operation from one dashboard.

---

## ✨ Key Features

- **🤖 AI-Assisted Composing** — Generate and refine full HTML marketing emails (subject + body) from a natural-language prompt, powered by Google Gemini with automatic multi-model fallback and rate-limit backoff.
- **📝 Rich HTML Email Editor** — A TipTap-based WYSIWYG editor with images, links, text alignment, colors, highlights, resizable images, and reusable templates.
- **⏱️ Reputation-Aware Queue Engine** — A background worker processes the queue with configurable throttling: daily caps (50/day), hourly caps (5/hour), and a 12-minute drip delay between campaign emails to protect sender reputation.
- **📦 Batch Dispatch via Resend** — Sends up to 100 emails per batch request, avoiding serverless timeouts while efficiently clearing the queue.
- **📥 IMAP Inbox Sync** — Pulls real replies from an external mail server (`imap-simple` + `mailparser`) into a unified Inbox / Sent view.
- **🛡️ Spam Score Analyzer** — A bilingual (Arabic + English) heuristic engine scores drafts before send — trigger words, urgency/phishing patterns, URL shorteners, link-to-text ratio, gibberish detection, and subject-line checks.
- **🔐 Dual-Layer RBAC** — Granular permissions stored as JSONB on the user profile, enforced both in the UI (`usePermissions` hook) and on every mutating API route (`checkServerActionPermission`) to prevent direct-API bypass.
- **📊 Real-Time Dashboards** — Live campaign, queue, and delivery stats with throttled background polling guarded against React state races.
- **🏨 Domain Modules** — Hotel data importer/manager and AI-powered content merging for vertical-specific campaigns.
- **🌍 Full RTL & i18n** — First-class Arabic/English bidirectional support via a custom dictionary-driven `LanguageProvider`.
- **🌗 System-Wide Dark Mode** — Fully themed light/dark UI powered by `next-themes`.
- **📬 Webhook Delivery Tracking** — Resend webhooks (verified with Svix) update bounce/delivery status back into Postgres.

---

## 💻 Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router, Server Actions, Standalone output), [React 19](https://react.dev) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com), PostCSS, `@tailwindcss/typography`, `tw-animate-css` |
| **UI Components** | [Radix UI](https://www.radix-ui.com), [shadcn/ui](https://ui.shadcn.com), [Lucide](https://lucide.dev) icons, `class-variance-authority`, `clsx`, `tailwind-merge` |
| **Database & Auth** | [Supabase](https://supabase.com) — PostgreSQL, Auth, Row Level Security (`@supabase/supabase-js`, `@supabase/ssr`) |
| **Email Delivery** | [Resend](https://resend.com) Batch API, [Svix](https://www.svix.com) (webhook verification) |
| **Inbox Sync** | `imap-simple`, `mailparser` |
| **AI** | [Google Generative AI](https://ai.google.dev) (Gemini) |
| **Editor** | [TipTap](https://tiptap.dev) (StarterKit + image, link, color, highlight, text-align extensions) |
| **Forms & Validation** | `react-hook-form`, [Zod](https://zod.dev), `@hookform/resolvers` |
| **State & Theming** | React Context (`next-themes`, custom `AuthProvider` & `LanguageProvider`) |
| **UX Utilities** | `sonner` (toasts), `date-fns`, `react-day-picker`, `react-textarea-autosize` |
| **Tooling** | ESLint 9, `concurrently` (dev server + worker), `shadcn` CLI |
| **Deployment** | Vercel (frontend + serverless) or self-hosted standalone (cPanel / VPS / PM2) |

---

## 📂 Folder Structure

```
marketing-mailer/
├── app/
│   ├── (main)/               # Authenticated app shell (dashboard, inbox, compose, history…)
│   │   ├── admin/            #   Admin: users, queue, platform settings
│   │   ├── compose/          #   Email composer
│   │   ├── dashboard/        #   Live stats & activity
│   │   ├── hotels/           #   Hotel data module
│   │   ├── inbox/            #   Unified inbox / sent view
│   │   └── layout.tsx        #   Sidebar + header shell
│   ├── api/                  # Serverless route handlers
│   │   ├── ai/               #   Gemini generate / refine / merge
│   │   ├── queue/            #   add · process · stats · campaigns
│   │   ├── inbox/            #   IMAP sync
│   │   ├── webhooks/resend/  #   Delivery/bounce webhooks (Svix-verified)
│   │   └── admin/            #   Admin-only endpoints
│   ├── login/                # Auth screens
│   └── layout.tsx            # Root layout (providers)
├── components/
│   ├── auth/                 # AuthProvider, quick-login, add-account
│   ├── email/                # ComposeWindow, Editor, SpamChecker, TemplateManager…
│   ├── hotels/               # Importer & detail modals
│   ├── layout/               # Sidebar, Header, MainLayoutShell
│   ├── providers/            # Language / Theme / RTL Toaster
│   └── ui/                   # shadcn primitives (button, dialog, switch…)
├── hooks/
│   └── usePermissions.ts     # Frontend RBAC source of truth
├── lib/
│   ├── permissions.server.ts # Backend RBAC enforcement
│   ├── gemini.ts             # AI client with multi-model fallback
│   ├── spamChecker.ts        # Bilingual spam scoring engine
│   ├── imap-helper.ts        # IMAP fetch/parse helpers
│   ├── supabase.ts / supabase-server.ts
│   └── dictionaries.ts       # i18n (AR / EN)
├── scripts/
│   └── worker.mjs            # Background queue-processing worker
├── supabase/migrations/      # SQL schema, RLS policies, RPCs, RBAC
├── next.config.ts            # Standalone output + image config
└── vercel.json
```

---

## ⚙️ Getting Started

### Prerequisites

- **Node.js 18+** (native `fetch` is required by the worker)
- A **[Supabase](https://supabase.com)** project (PostgreSQL + Auth)
- A **[Resend](https://resend.com)** account with a verified sending domain
- A **[Google AI Studio](https://ai.google.dev)** API key (Gemini)
- An **IMAP-enabled mailbox** for inbox sync (optional, for reply syncing)

### 1. Installation

```bash
git clone https://github.com/<your-username>/marketing-mailer.git
cd marketing-mailer
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the project root:

```bash
# ── Supabase ─────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ── Email Delivery (Resend) ──────────────
RESEND_API_KEY=re_xxxxxxxx
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxx

# ── AI (Google Gemini) ───────────────────
GEMINI_API_KEY=your-gemini-key

# ── Sending Identity ─────────────────────
SMTP_FROM_EMAIL=newsletter@yourdomain.com
SMTP_SENDER_NAME=Your Brand
ADMIN_EMAIL=admin@yourdomain.com

# ── IMAP Inbox Sync (optional) ───────────
SMTP_HOST=imap.yourprovider.com
SMTP_PORT=993
SMTP_SECURE=true
SMTP_USER=newsletter@yourdomain.com
SMTP_PASS=your-mailbox-password

# ── App ──────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

Apply the migrations in [`supabase/migrations/`](supabase/migrations) to your Supabase project (via the Supabase SQL editor or CLI). These provision the `email_queue`, `campaigns`, `inbox`, `sent_logs`, and `profiles` tables, along with RLS policies, RPC functions, and the RBAC permission schema.

### 4. Run the Development Server

The dev script runs the **Next.js app and the background worker together** via `concurrently`:

```bash
npm run dev
```

- App → [http://localhost:3000](http://localhost:3000)
- Worker → polls `/api/queue/process` every 10s to drip the email queue

> Run just the app with `next dev`, or just the worker with `npm run worker`.

### 5. Production Build

```bash
npm run build   # produces a standalone build (.next/standalone)
npm run start
```

See [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) for self-hosted (cPanel / VPS / PM2) deployment steps.

---

## 📸 Previews / Screenshots

> _Add your GIFs and screenshots here._

| Dashboard | Composer + AI Assistant |
|-----------|-------------------------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Composer](docs/screenshots/composer.png) |

| Queue Throttling | Unified Inbox (RTL) |
|------------------|---------------------|
| ![Queue](docs/screenshots/queue.png) | ![Inbox](docs/screenshots/inbox.png) |

---

## 🧠 Technical Decisions & Architecture

- **Why Next.js + Supabase?** Next.js App Router lets the UI, serverless API routes, and Server Actions live in one deployable unit, while Supabase provides Postgres, Auth, and Row Level Security out of the box — collapsing what would otherwise be three services into a single, cohesive full-stack app.

- **Reputation-aware delivery over naive blasting.** Rather than firing an entire list at once, a decoupled background worker (`scripts/worker.mjs`) polls a serverless processor that enforces **daily caps, hourly caps, and a 12-minute pacing delay**, then dispatches via the **Resend Batch API** (≤100/request). This protects domain reputation and sidesteps serverless execution-time limits.

- **Dual-layer RBAC — defense in depth.** Permissions live in a JSONB column and are enforced **twice**: the `usePermissions` hook masks the UI, and `checkServerActionPermission` guards every mutating API route. Hiding a button is never treated as security — the server is the source of truth.

- **Pragmatic RLS with the service role.** Where legacy rows lacked `user_id` and RLS produced false lockouts, the app uses the service-role key on the server but **manually chains explicit ownership filters** (e.g. `.eq('sender_email', userEmail)`) — preserving strict data isolation without the false-negative side effects.

- **Resilient AI layer.** `lib/gemini.ts` iterates a **priority list of Gemini models** with per-model retry/backoff on 429s and automatic skip on 404s, so AI features degrade gracefully instead of hard-failing when a model is throttled or deprecated.

- **App-like layout, not a scrolling page.** The compose experience uses constrained flexbox (`flex-1` + `overflow-y-auto`) to keep headers and action bars fixed while only the editor scrolls — closer to a desktop mail client than a webpage.

---

## 🤝 Contributing

Contributions are welcome! To propose a change:

1. Fork the repository
2. Create a feature branch — `git checkout -b feature/amazing-feature`
3. Commit your changes — `git commit -m "feat: add amazing feature"`
4. Push the branch — `git push origin feature/amazing-feature`
5. Open a Pull Request

Please run `npm run lint` before submitting.

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<div align="center">
  <sub>Built with ❤️ using Next.js, Supabase & Resend.</sub>
</div>
