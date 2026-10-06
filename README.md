# OpsPilot

A small Turkish-language B2B service landing page and persistent service-request form, built as a technical hiring assessment. OpsPilot is fictional: it does not deliver services, send emails, or promise a response. Use test contact details.

The product explains how small and medium-sized businesses could reduce repetitive data entry, reporting, request routing, and notifications. Its scope is deliberately limited to one page, four services, and one form. There is no authentication, dashboard, admin interface, payment flow, or actual AI processing.

## Stack and architecture

- Next.js App Router and React, strict TypeScript
- Tailwind CSS v4 with a small custom CSS design system
- Shared Zod validation
- Supabase PostgreSQL, accessed through the server-only Supabase SDK
- Vitest for schema/server tests; Playwright for browser tests
- Node.js runtime compatible with Vercel

```text
Browser: RequestForm
  → shared Zod schema
  → POST /api/requests (JSON)
  → origin/content-type/body-size checks
  → shared Zod schema again
  → server-only Supabase INSERT … RETURNING id
  → 201 with receipt → success UI
  → non-2xx / network error / missing receipt → error UI, input retained
```

The landing page is a server component. Only the form needs client JavaScript. The database client is initialized lazily: building the static page does not require secrets. A successful HTTP response is sent only after Supabase returns the inserted row ID. There is no mock persistence or success fallback in application code.

## Project structure

```text
src/app/
  page.tsx                   Landing page and service copy
  layout.tsx                 Turkish document language and metadata
  globals.css                Responsive layout and visual styles
  api/requests/route.ts       Request boundary and HTTP responses
src/components/
  request-form.tsx            Form, accessible errors and submission states
  workflow-preview.tsx       Illustrative workflow, not live operational data
  icon.tsx                   Small local SVG icon set
src/lib/
  request-schema.ts          Shared rules, service choices and types
  supabase.ts                Server-only database insert
supabase/migrations/001_service_requests.sql
tests/unit/                  Schema, route and persistence adapter tests
tests/e2e/                   Browser flow and viewport checks
AI_LOG.md                    AI assistance and verification record
```

## Local installation

Use Node.js 22 or 24 LTS and npm. This project was generated with Node 24.13.1. The lockfile is the reproducible dependency source.

```powershell
npm ci
Copy-Item .env.example .env.local
```

On macOS/Linux, use `cp .env.example .env.local` instead. Fill in the two variables below after completing database setup, then run:

```sh
npm run dev
```

Open <http://localhost:3000>. Restart the dev server after editing environment variables. Without valid database configuration, the page still renders, but valid submissions return a safe `503` error. That is intentional.

## Environment variables

| Variable | Value | Exposure |
| --- | --- | --- |
| `SUPABASE_URL` | Your project API URL, e.g. `https://<project-ref>.supabase.co` | Server only in this project |
| `SUPABASE_SECRET_KEY` | Supabase secret key (`sb_secret_…`), or the legacy `service_role` key | Server only; privileged |

Do not use an anonymous/publishable key for this server adapter. Do not add a `NEXT_PUBLIC_` prefix. `.env*` files are ignored except `.env.example`, which contains placeholders. No browser Supabase client is created.

## Supabase setup

The developer has configured a Supabase project, submitted a fictional request through the UI, and confirmed that the resulting row persisted in `service_requests`. The coding agent did not create the account or inspect the live database.

1. Sign in to Supabase and create or choose a project. Wait until it is ready.
2. Open that project's **SQL Editor**, create a new query, paste the complete contents of `supabase/migrations/001_service_requests.sql`, and run it once. This migration intentionally fails if the table already exists; inspect an existing table before applying schema changes.
3. In **Table Editor**, confirm `public.service_requests` exists with `id`, `full_name`, `email`, `service`, `description`, and `created_at`.
4. Confirm Row Level Security is enabled and there are no public access policies. The migration revokes table access for `anon` and `authenticated`; inserts use the privileged server key. It includes basic database constraints in addition to Zod validation.
5. Copy the project URL from the project's Connect/API settings and a server secret from **Settings → API Keys**. A legacy `service_role` key is supported. Keep the secret private.
6. Put these values in `.env.local` under the names above. Restart `npm run dev`.
7. Submit a valid form using a unique test email, for example `opspilot-test-001@example.com`. Confirm the network request returns `201` and only then the success message appears.
8. In SQL Editor, verify the record and refresh the page/editor to confirm persistence:

   ```sql
   select id, full_name, email, service, description, created_at
   from public.service_requests
   where email = 'opspilot-test-001@example.com'
   order by created_at desc;
   ```

   Confirm the returned ID matches the API response ID. Use a different test email on each run. Remove your own test rows through Table Editor when finished.

The database service values are `workflow`, `ai`, `integration`, and `custom`; Turkish labels live in the shared schema file. Changing services requires updating both the enum and the SQL constraint.

## Commands and testing

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit --omit=dev
```

`npm run typecheck` generates Next.js route types before running `tsc --noEmit`. `next build` does not replace the separate lint command. To serve a production build yourself, run `npm run build` then `npm start`.

The browser suite requires a completed build and port 3000 to be free. It launches and stops its own production server with empty database credentials, so it cannot write to your database. The success and server-validation browser cases explicitly mock HTTP responses; they verify UI behavior, not real database persistence. The configuration-failure browser case uses the real endpoint. Unit tests mock only the persistence boundary/SDK as appropriate.

Tests cover normalization, required values, invalid emails/services, length limits, server rejection, delayed persistence, safe database errors, missing insert receipts, malformed/oversized requests, content type, origin checks, loading and retained input. Browser checks include 320, 390, 768, and 1440px viewports. Current executed results and their limits are recorded in `AI_LOG.md`.

## Validation and error handling

| Input | Rule |
| --- | --- |
| Full name | Trimmed, 2–100 characters; no culturally restrictive name regex |
| Email | Trimmed, lowercased, valid email syntax, at most 254 characters |
| Service | One of four explicit service identifiers |
| Description | Trimmed, 20–2000 characters |

The same Zod schema runs in the browser and at the API boundary. HTML controls also expose required/max-length information, but native validation is disabled so the Turkish error messages are consistent. Extra JSON keys are stripped; clients cannot provide record IDs or timestamps.

The API returns `400` for malformed/empty JSON, `403` for a mismatching browser Origin, `413` for bodies exceeding 16 KiB, `415` for non-JSON content, `422` for invalid fields, and `503` for unconfirmed persistence. Unsupported methods use Next.js's `405`. Responses are not cached.

The database call has an eight-second timeout; the browser allows fifteen seconds. Database errors and missing credentials never produce `201`. The client requires both status `201` and a nonempty receipt ID before showing success. Raw server/database errors are never returned. Server logs contain a fixed failure message without submitted text, email, credentials, or stack traces.

The button and fields are disabled during submission. An immediate ref guard also blocks repeat submission before React rerenders. After failure, all input is retained and retry is available. After confirmed success, fields reset and focus moves to the confirmation.

## Security and accessibility decisions

- Database credentials are read only in a module protected by `server-only`. RLS and database grants block direct public table access.
- Body size is counted while streaming, rather than trusting `Content-Length`. Text is stored as data and never rendered through raw HTML.
- Same-origin browser checks reduce unwanted cross-site submissions; they are **not** authentication or bot protection. Direct API clients can omit Origin.
- Security headers disable framing and unused camera/microphone/geolocation permissions, prevent content-type sniffing, and limit referrer disclosure.
- Semantic sections, headings, navigation, skip link, native controls, real labels, required indicators, visible focus, and error descriptions support keyboard use.
- `aria-invalid`/`aria-describedby` connect errors to fields. Submission status uses a polite live region; request failures use an alert. The first invalid field receives focus.
- Layout adapts to narrow screens; mobile input text is 16px. Reduced-motion preferences disable scrolling animation and the loading spinner animation. Decorative icons are hidden from assistive technology.
- Fonts and SVG icons are local/system resources, so rendering and builds do not depend on a font CDN. No analytics or tracking scripts are included. Demo pages are marked `noindex`.

## Manual verification checklist

Checks marked complete were reported by the developer and are identified as such in `AI_LOG.md`; they were not performed by the coding agent.

- [x] **Valid submission and persistence (developer):** a fictional request submitted through the UI was confirmed in the live `service_requests` table.
- [ ] **Invalid email:** enter `not-an-email`; confirm a Turkish field error and no API request.
- [ ] **Missing required field:** leave name or service empty; confirm the error, focus, and no submission.
- [ ] **Server-side rejection:** bypass the form in browser DevTools with `fetch('/api/requests', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({fullName:'A', email:'bad', service:'other', description:''})})`; inspect the `422` response and verify no row was inserted.
- [x] **Database failure (agent):** a separate local production server was started with a process-scoped invalid server credential. A browser submission reached the endpoint, returned `503`, retained input, showed the safe error, and never showed success. `.env.local` was not edited.
- [ ] **Mobile/tablet/desktop:** inspect at 320, 390, 768, and 1440px; test select, textarea, CTA scrolling, and on-screen keyboard on a real phone. Check 200% zoom and no horizontal overflow.
- [ ] **Accessibility:** Tab/Shift+Tab through navigation and every control; test screen-reader announcements, success focus, error associations, reduced motion, and contrast with an accessibility tool.

## Vercel deployment (manual, not performed)

1. Review the recorded Supabase success/failure checks in `AI_LOG.md`.
2. Inspect staged files before any future Git commit: never include `.env.local`, credentials, real customer data, `node_modules`, or generated test/build files. Commit/push only when you choose to do so.
3. Import the repository into Vercel, select the Next.js preset, use this directory as the project root, and choose Node.js 24 LTS. Default install/build commands are appropriate (`npm ci`, `npm run build`).
4. Configure `SUPABASE_URL` and `SUPABASE_SECRET_KEY` as server environment variables for the intended environments. Prefer a separate Supabase project for previews; a preview request otherwise writes to whichever database you configure.
5. Apply the migration to the intended database before testing the deployment. Deploy, then repeat the valid, invalid, failure, and persistence checks on the deployed URL. Verify same-origin submission behind the hosting proxy.

No deployment or external account creation is part of this local implementation.

## Known limitations and next steps

- Live successful persistence was verified manually by the developer. The agent did not independently inspect the live row or verify the deployed database grants/RLS configuration.
- There is no distributed rate limiter, CAPTCHA, or spam prevention. Before public traffic, configure platform-level rate limits or an appropriate bot defense. An in-memory limiter was deliberately avoided because Vercel instances do not share memory.
- There is no idempotency key. Disabling repeat clicks prevents common accidental duplicates, but a lost response after a committed insert or a later retry can create duplicates. The UI says persistence could not be confirmed instead of claiming a write definitely did not happen.
- This demo stores contact details but has no retention/deletion workflow or production privacy notice. Use synthetic data. Define retention and privacy requirements before collecting actual customer information.
- There is no notification, CRM integration, admin UI, or real AI service. The illustrated workflow is an example only.
- Automated browser checks use Chromium. Real mobile Safari, Firefox, assistive technology, and live database checks remain manual.
- The current full dependency audit reports a development-only `braces` advisory through Next's ESLint tooling. The suggested automated fix downgrades `eslint-config-next` across major versions and is not applied. See `AI_LOG.md` for exact audit results; reassess upstream fixes before submission.

## Reference documentation

Implementation references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [Zod validation](https://zod.dev/api), [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), and [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
