# OpsPilot interview notes

## The request flow

When a user presses **Talep gönder**, the client prevents the browser's normal form submission and reads the four fields. The shared Zod schema trims and validates them. Invalid input stays in the browser, displays Turkish field errors, and focuses the first invalid field.

Valid input is sent as JSON to `POST /api/requests`. The route checks origin, content type, and streamed body size, parses JSON, then runs the same Zod schema again. It calls the server-only persistence function with normalized data. That function inserts one row into Supabase and requests the generated ID. The API returns `201` only if it receives a nonempty ID. The client requires both `201` and that ID before showing success.

```text
form → client Zod → API boundary → server Zod → Supabase insert
                                                ↓
error UI ← non-2xx / missing receipt     returned row ID → success UI
```

## Why the key decisions exist

1. **Validation on both sides:** client validation gives fast, accessible feedback. Server validation is the trust boundary because callers can bypass or modify browser code.
2. **Allow-listed services and limits:** the enum accepts only four stable IDs. Name, email, description, and request-body limits prevent unreasonable input and align with database constraints.
3. **Server-only Supabase credentials:** the secret key bypasses RLS and must never enter a browser bundle. `server-only`, unprefixed environment variables, and the API route keep it on the server.
4. **Success waits for the database:** an HTTP request reaching the API is not proof of persistence. The route awaits the insert, requests the row ID, and treats a database error or missing ID as failure.
5. **Database failure:** the API catches internal errors, logs only a fixed message, and returns a safe `503`. The form keeps the user's input, enables retry, displays an alert, and never displays success.
6. **Why Zod:** one small schema supplies runtime validation, normalization, error messages, and inferred TypeScript types to both client and server without a second validation model.

## Architecture

- `page.tsx`: server-rendered landing page and product copy.
- `request-form.tsx`: the only client component; form state and browser validation.
- `request-schema.ts`: shared schema, service options, and types.
- `api/requests/route.ts`: HTTP boundary and safe responses.
- `supabase.ts`: server-only insert and receipt check.
- SQL migration: table constraints, RLS, and restricted grants.
- Vitest: schema, route, and database-adapter behavior. Playwright: user-visible states, keyboard flow, and responsive layout.

## Security decisions

- Secret stored only in environment variables and ignored by Git.
- No direct browser database client; public roles have no table access.
- Server validation remains authoritative.
- Body-size, content-type, and same-origin browser checks reject malformed requests early.
- Errors omit form contents, SDK details, credentials, and stack traces.
- Text is rendered normally; no raw HTML injection path exists.

## Known limitations

- No distributed rate limiting, CAPTCHA, or spam prevention.
- No idempotency key, so a retry after a committed insert with a lost response can create a duplicate.
- No retention/deletion workflow or production privacy notice; the demo asks for fictional data.
- No authentication, admin UI, notification system, CRM integration, or actual AI processing.
- Automated browser testing covers Chromium; physical mobile devices, Safari/Firefox, and a real screen reader remain manual checks.

## Likely interview modifications

1. **Add a phone or company field:** update the Zod schema, form label/control, database migration, insert mapping, and focused validation/API tests.
2. **Add a service option:** update the shared `services` list/Zod enum and the SQL check constraint, then update tests that assert allow-listing.
3. **Prevent duplicate retries:** accept an idempotency key, store it in a unique database column, return the original receipt for repeated keys, and test a lost-response retry.
