# GGI Backend Test — AI Chat & Subscription Bundles

Full-stack implementation of the two modules described in
[`GGI-Backend-Test-Posture.pdf`](./GGI-Backend-Test-Posture.pdf): an AI Chat
module with monthly free-quota + subscription-bundle billing, and a
Subscription Bundle module with simulated auto-renew billing — plus a React
frontend and an admin dashboard on top.

## Live demo

- App: _(filled in after deploy)_
- API: _(filled in after deploy)_ — Swagger docs at `/docs`

**Try it as:**
- Admin — pick "Admin" in the user switcher, password `Admin123!`
- Regular user — pick "Ada Lovelace", or create your own via "New user" (no password)

## Stack

- **Backend**: NestJS + TypeScript, TypeORM + PostgreSQL, class-validator, Swagger
- **Frontend**: React + TypeScript + Vite, Tailwind CSS, React Router

## Architecture

Clean/DDD-flavored layering per module (`chat/`, `subscriptions/`, `users/`, `admin/`):

```
module/
  domain/        entities, enums, domain errors, pricing rules
  dto/           request validation
  *.service.ts   business logic (repositories via TypeORM)
  *.controller.ts REST endpoints
  *.module.ts
```

Structured errors: every thrown domain error carries a stable `code` (e.g.
`QUOTA_EXCEEDED`, `SUBSCRIPTION_NOT_FOUND`) via a shared `DomainException`
base class, normalized by a global exception filter so API consumers only
branch on `error.code`.

## Key design decisions

- **"Deduct from the bundle with the latest remaining quota"** is
  interpreted as: among a user's active bundles, deduct from whichever
  currently holds the *largest* remaining balance (Enterprise/unlimited
  counts as infinite) — so a small bundle isn't burned down while a bigger
  one sits untouched.
- **Free-quota auto-reset** falls out of the data model rather than a cron
  job: usage is tracked per `(userId, "YYYY-MM")`, so a new calendar month
  is automatically a fresh row.
- **Billing is simulated**, not real: a `PAYMENT_FAILURE_RATE` constant in
  `billing.service.ts` flips a coin on each renewal — no payment gateway,
  per the spec's "simulate billing logic" / "if payment fails (randomly)".
- **AI responses are mocked**: canned answers + a random delay, per the
  spec's "mocked OpenAI response" / "simulate response time delay".
- **Auth is a dev-picker, not real login**: switching identity is a click
  in the UI, no password — except the seeded Admin account, which is
  password-protected (`verify-password` endpoint) so a regular user can't
  just click into the admin dashboard. This is a deliberate simplification
  for a take-home/demo app, not a production auth model — the `currentUserId`
  trust boundary lives in the browser, not a server session.

## Running locally

```bash
docker compose up -d              # Postgres on :5434

cd backend
cp .env.example .env
npm install
npm run start:dev                 # http://localhost:3000, Swagger at /docs

cd ../frontend
cp .env.example .env
npm install
npm run dev                       # http://localhost:5173
```

The backend seeds a demo `Admin` account (see `.env`'s `ADMIN_EMAIL` /
`ADMIN_PASSWORD`) on first boot. Schema is kept in sync automatically
(`synchronize: true`) — no migration step needed for this demo.

## API surface

- `POST /chat`, `GET /chat/history`, `GET /chat/usage`
- `POST /subscriptions`, `GET /subscriptions`, `GET /subscriptions/history`,
  `PATCH /subscriptions/:id/cancel`, `PATCH /subscriptions/:id/auto-renew`,
  `POST /subscriptions/billing/run` (admin-only)
- `POST /users`, `GET /users`, `POST /users/:id/verify-password`
- `GET /admin/overview`, `GET /admin/users`, `GET /admin/subscriptions`,
  `GET /admin/billing-history` (all admin-only, `?userId=` identifies the caller)

Full interactive docs at `/docs` (Swagger) once the backend is running.
