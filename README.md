# Tessera

A freelance marketplace where clients and freelancers sign up, build profiles, publish and apply to projects, and get matched on facts that can be checked. A client describes a project in plain language; Tessera turns it into a structured brief, scores freelancers on skills, experience, budget and availability, explains each match (including a "watch out" note), and watches scope and budget once work starts.

The idea is a mosaic. The brief breaks into notched tiles, and freelancers are tiles that snap into place when they fit. A weak match stops short and shows a labelled gap, such as "needs SQL".

## Quick start

You need a PostgreSQL database. The quickest way is Docker (`docker compose up -d` uses the `docker-compose.yml` in this repo), or install Postgres yourself (`brew install postgresql@16` on a Mac) and create an empty database called `tessera`.

```bash
cp .env.example .env        # then check DATABASE_URL points at your Postgres
npm install && npx prisma migrate deploy && npm run seed && npm run dev
```

Open http://localhost:3000, choose **Sign up**, and create a Client or Freelancer account. `npm run seed` is optional: it adds clearly labelled **Sample** freelancers and projects so the Matches page is not empty. The app works with an empty database.

Other scripts: `npm test`, `npm run lint` (type check), `npm run build`.

## Accounts, authentication and permissions

This project already had a database (Prisma) but no authentication, so real auth was added to that stack rather than introducing a second backend. Supabase was not used because nothing in the project is configured for it and I cannot create a Supabase project for you. The `Deploying` section explains how to host this on Postgres, including Supabase's Postgres.

- **Sign up, sign in, sign out, password reset, change password and email.** Passwords are hashed with scrypt and a per-password salt (`src/lib/auth.ts`). Rules: 8 to 128 characters with a letter and a number.
- **Sessions are stored in the database.** The cookie holds a random 256-bit token; only its SHA-256 is stored. The cookie is `httpOnly`, `sameSite=lax`, and `secure` in production. Sessions last 30 days, work across devices, and are revoked when the password is reset or changed. An expired session redirects to sign-in.
- **One person, up to two profiles.** You pick Client or Freelancer at sign-up, and can add the other profile any time from the account menu (**Add a client profile** / **Add a freelancer profile**). People with both get a **Client | Freelancer** switch in the header. The active profile controls the dashboard, matches, profile form and available actions. You can never match with, apply to, or hire your own other profile, and a project you own stays yours in either view (the app offers a one-click switch when an action needs the other profile).
- **Throttling.** Sign-in, sign-up and reset requests are rate limited (`src/lib/ratelimit.ts`), and sign-in errors never reveal whether an email exists. Set `REDIS_URL` and the limits are shared by every server instance and survive restarts; without it they are kept in memory per instance.
- **Sample accounts cannot be signed in to.** Seeded people have no password, and `@tessera.demo` addresses are reserved so no one can register one.
- **Authorization is enforced on the server**, not by hiding buttons. `middleware.ts` keeps signed-out visitors off private pages; every page and API route then checks the session and the resource owner. Examples: only a project's owner can edit, close, delete, invite or hire; a freelancer only ever sees their own proposals; a draft brief is invisible to everyone but its owner; someone else's project or file answers 404.
- **Postgres row-level security is not used.** The equivalent checks live in the route handlers listed above. Add RLS policies as a second layer if you expose the database directly (see `Deploying`).

**Email verification.** New accounts get a single-use link by email (valid 24 hours). Until it is confirmed, a person cannot publish a brief, apply to a project or invite a freelancer; everything else works, and a banner plus Account Settings offer a fresh link. Changing your email resets confirmation and sends a link to the new address. The link opens a page with a **Confirm my email** button (a POST, so mail scanners that pre-open links cannot use it up). Verification is enforced when an email provider is configured (`RESEND_API_KEY` and `EMAIL_FROM`), so a site that cannot send email never locks people out. Set `REQUIRE_EMAIL_VERIFICATION=true` to force it on (in development the link is printed in the server log and shown by the resend button), or `false` to force it off. Password-reset emails use the same [Resend](https://resend.com) setup. Without it, in development the reset link is shown on screen, and in production nothing is shown or sent (the server logs a warning).

## Profiles, uploads and privacy

- **Freelancer onboarding** (`/onboarding`, later `/profile/edit`): name, title, current position (student, recent graduate, dropout / self-taught, working professional, full-time freelancer, other), country, introduction, searchable skills with levels, years of experience, languages, education, hourly or project pricing, weekly hours, availability, start date, time zone, LinkedIn, portfolio site, previous projects, and **sidequests** (side projects, hackathons and experiments, each with an optional link). Save progress at any time; only name is needed to save, and title, introduction and one skill are required for "Save and continue". A completion meter updates as you type.
- **Client profile:** name, company, website, industry, description, location and time zone, logo.
- **Uploads** (`/api/uploads`): profile picture (PNG, JPG, WebP, 2 MB), resume (PDF or DOCX, 5 MB), portfolio files (PNG, JPG, WebP, PDF, 8 MB, up to 10). Type, size and the file's real signature are checked on the server. The browser shows real upload progress; a file only appears once the server has stored it. Files can be replaced or removed.
- **Storage is private.** Files are written outside `/public` (`./storage`, or `STORAGE_DIR`) and served only through `/api/files/[id]`, which checks who is asking. **Resumes** are visible to their owner and to a client who has invited that freelancer or received their proposal. Anyone else gets a 404. Avatars and portfolio files are visible to signed-in users.
- For production, replace the three functions in `src/lib/storage.ts` with S3 or Supabase Storage. Nothing else touches the disk.

## Screens

| Screen | Route |
| --- | --- |
| Landing | `/` (signed out) |
| Sign in, sign up, forgot and reset password | `/login`, `/signup`, `/forgot-password`, `/reset-password` |
| Onboarding, my profile, edit profile, account settings | `/onboarding`, `/profile`, `/profile/edit`, `/settings` |
| Dashboard (client or freelancer, from the database) | `/dashboard` |
| Matches (freelancers for clients, projects for freelancers) | `/matches` |
| New brief, brief review and publish | `/brief/new`, `/brief/[id]` |
| Mosaic match view for one brief | `/brief/[id]/matches` |
| Freelancer profile | `/freelancers/[id]` |
| Projects list, project page, project room, thank-yous | `/projects`, `/projects/[id]`, `/projects/[id]/thanks` |

**Client flow:** write a brief, edit deliverables, skills, budget, timeline, start date and availability, save a draft or publish. Published briefs appear for freelancers. Owners can unpublish, close, reopen or delete (not while in progress), invite freelancers, shortlist them, review proposals and hire. Statuses: draft, open, in progress, completed, cancelled.

**Freelancer flow:** see matched projects with a score and the reasons, filter and sort, save a project, apply with a cover note, price and timeline (optionally with the proposal coach), respond to invitations, withdraw a proposal, and work in the project room once hired.

**Numbers on dashboards are calculated from stored records.** For example, "Spending this month" is the sum of budgets of the client's projects hired this month, and "Strong matches" counts freelancers whose scored fit for an open brief is a snap.

**Matching** uses the deterministic scoring below on real profile and brief data. If a freelancer has no skills, rate or weekly hours, or a brief has no skills or budget, the page asks for that data instead of showing a score. Freelancers with incomplete profiles are left out of rankings.

### The seven AI features

All are server-side, return zod-validated JSON, retry once on invalid output, and fall back gracefully. All prompts live in `src/lib/ai/prompts.ts`; schemas in `schemas.ts`; the fallback logic in `src/lib/heuristics.ts` and `features.ts`.

1. **Brief translator** `POST /api/brief`. Title, summary, deliverables, skills, budget range, timeline, tone and at most two clarifying questions. Skills are chosen from the vocabulary actually present in the freelancer data.
2. **Fair-price meter** `POST /api/fair-price`. The low / fair / generous verdict is computed deterministically so the gauge moves instantly while you drag. The model writes the one-sentence reason.
3. **Matching** `POST /api/match/explain`. The score is deterministic (below). The model only writes one explanation sentence and one honest "watch out" line per candidate.
4. **Project outlook** `POST /api/outlook`. Clear, cloudy or stormy, rated from scope clarity, budget-to-hours and deadline realism. The rating is deterministic; the model writes the reason and the single most useful fix.
5. **Scope-creep detector**, run on each client message in an active project. Flagged messages offer the freelancer a one-click "Send mini-quote" with an AI-drafted message. Price is calculated in code as hours × the freelancer's rate, not by the model.
6. **Proposal coach** `POST /api/coach`. What is missing, what is generic, and an improved opener grounded in the freelancer's real portfolio.
7. **Chat recap** `POST /api/projects/[id]/recap`. Agreed, changes, open.

### Deterministic scoring (`src/lib/scoring.ts`)

Skills overlap 50%, experience fit 15%, budget-to-rate fit 20%, availability and time zone fit 15%. It is a pure module with no network access, so the browser runs it directly: dragging the budget or timeline tile re-scores and re-ranks instantly, and only the explanations are debounced (800 ms) and fetched.

A tile **snaps** only if no required skill is missing, the total is at least 65, and no other dimension has collapsed. Otherwise it **stops short**, with a gap that grows as the fit gets worse and a label taken from the biggest real gap.

### Keeping explanations honest

- The model is given only profile and brief data, and is told never to invent facts.
- The server recomputes the ranking from the database; it does not trust client-supplied profile data.
- **Grounding check:** every number in a model-written explanation must appear in the data that was sent. Otherwise that explanation is discarded and the deterministic facts are shown instead (tested in `tests/explain.test.ts`).

### The Mosaic interaction

- The text breaks into words that fly into five labelled tiles while the AI works, so the animation is the loading state.
- Each tile has its own notched outline (`src/components/notch.ts`); match tiles carry a seating tab and a per-person chamfer.
- Strong matches settle with an under-damped spring and a soft synthesized click (no audio files). Weak matches stop short and jiggle once, with the dashed empty seat and gap label showing.
- Budget and timeline tiles are sliders: drag, or use arrow keys (Shift for bigger steps, Home and End for the extremes). They have proper `role="slider"` semantics.
- Match tiles are focusable; Enter or Space opens the detail drawer, which traps focus and closes on Escape.
- Sound is off by default (header toggle, remembered per browser). `prefers-reduced-motion` gives a static layout with no flight, jiggle or layout animation.
- A "Plain list" toggle shows the same matches without any animation.

## Working together: the live workspace

Once a client hires a freelancer, `/projects/[id]` opens a shared **Workspace** (and a second tab for chat and the agreed scope).

- The agreed deliverables become trackable items; either person can add more.
- **Freelancer:** start an item, then submit it for review with a note on what changed and an optional link to the work (a design, a staging site, a repository).
- **Client:** approve it, or request changes with a description of what to change. The freelancer resubmits and the loop repeats. Each item keeps its full history.
- **Live updates:** changes appear on the other person's screen immediately, with a toast saying what happened (for example "Priya submitted ... for review"), a highlight on the item, and a "here now / offline" indicator. This uses Server-Sent Events (`/api/projects/[id]/stream`); if the connection drops the page shows "Reconnecting" and polls every 15 seconds until it returns.
- Only the owner and the hired freelancer can read or write the workspace; anyone else gets a 404. Status changes are enforced on the server (for example only the client can approve, and only submitted work can be approved).
- **Several servers:** with `REDIS_URL` set, live events travel over Redis pub/sub and presence is kept in Redis, so people connected to different instances still see each other instantly. Without it everything stays in one process. Presence entries expire after 60 s, so a server that crashes disappears from "here now" within a minute.
- **Chat is live too.** New messages, mini-quote replies and a "… is typing" hint arrive over the same stream, so the Chat tab no longer waits on a timer. If the stream drops the room shows "Reconnecting" and polls every 4 seconds until it is back; while connected it only does a slow 30 s check for anything missed.
- **Sharing files.** In chat you can attach one PNG, JPG, WebP, PDF, DOCX or ZIP (up to 15 MB) per message. The bytes are checked against the real file signature, stored privately, and readable only by the project's client and hired freelancer, and only once the file has actually been sent. A file you pick but never send is removed automatically. Sent files stay with the project history and cannot be deleted from it.
- **Files on submissions.** A freelancer can attach the finished work (and the client a marked-up image or document) to any submission, comment or change request, next to or instead of a link. Same rules as chat attachments: private, checked, and visible only to the two people on the project.
- **Limits:** there are no read receipts yet.

## Seed data and sample accounts

`npm run seed` creates 13 sample freelancers, 3 sample clients and 5 sample projects in different states (one active with chat history and a flagged scope-creep message, three open, one completed with thank-yous). They are marked **Sample** in the interface and have no passwords. Re-running the seed replaces only sample rows; real users and their data are not touched (invitations real clients sent to sample freelancers are removed with them).

## Turning on AI and email (and checking they work)

Both are optional. Without them the app still works: AI features use rule-based logic, and email links are only shown on screen in development.

**AI (Anthropic).** Create an API key at [console.anthropic.com](https://console.anthropic.com) (the account needs credit), then set `ANTHROPIC_API_KEY`. The model is set in `src/lib/ai/client.ts`. If a request fails, the feature falls back to its rule-based answer and the server logs a line starting with `[ai]` that includes the status code. The key is never logged.

**Email (Resend).** Create an account at [resend.com](https://resend.com), make an API key with sending access, and verify the domain you will send from (it gives you DNS records to add). Then set:

```
RESEND_API_KEY=re_...
EMAIL_FROM="Tessera <noreply@yourdomain.com>"
APP_URL=https://your-site.example.com
```

Until a domain is verified, Resend only lets you send tests from its own `onboarding@resend.dev` address, and only to the email of your Resend account. If a send is refused the server logs `[mail] Resend rejected the message (status ...)` with Resend's reason.

**Check it.** This runs real calls against every service you have configured and says what to fix:

```bash
npm run check:integrations                          # database, storage, Redis, AI
npm run check:integrations -- --send-to you@example.com   # also sends one real test email
```

It never prints secrets, reports a service you have not set up as "not set up" rather than a failure, and exits with an error if something configured does not work. The AI check makes one small real request.

> **Status:** the code paths for failure (bad key, unverified domain, network down, unreachable Redis or S3) are covered by tests and by running the checker with deliberately broken settings. It has **not** been run with a real Anthropic key or a verified Resend domain, so run the checker once with your own credentials before relying on either.

## Environment variables

See `.env.example`. Only `DATABASE_URL` is required. `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `STORAGE_DIR`, `REDIS_URL` and the `S3_*` settings are optional. Everything secret is read on the server only; nothing is exposed to browser code, and keys are never logged.

## Deploying

1. **Database.** Create a hosted Postgres database (Supabase, Neon, Railway, RDS) and set `DATABASE_URL` to its connection string (add `?sslmode=require` if the host needs it). In production run `npx prisma migrate deploy`; it applies the migrations in `prisma/migrations`. To change the schema locally, edit `prisma/schema.prisma`, run `npx prisma migrate dev --name what_changed`, and commit the new migration folder.
2. **Row-level security (optional second layer).** Prisma connects with a database role that bypasses RLS, so the server checks above remain the primary protection. If you also expose the database to clients directly (for example through Supabase's API), enable RLS on every table and write policies per table; none are provided here.
3. **Files.** A serverless host has no durable disk, so use object storage: set `S3_BUCKET` (plus `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`, and `S3_ENDPOINT` for services other than AWS) and uploads go there instead of the local folder. It works with AWS S3, Cloudflare R2, Supabase Storage (its S3 endpoint) and MinIO. Keep the bucket **private**: the app never links to it, it streams every file through `/api/files/[id]` after checking who is asking. Files saved on disk before you switched still open (the app falls back to the old folder), but copy them into the bucket when convenient. `S3_PREFIX` keeps several environments in one bucket apart; `S3_REGION` defaults to `us-east-1`.
4. **Environment.** Set `DATABASE_URL`, `APP_URL` (your public URL), `RESEND_API_KEY` and `EMAIL_FROM` (so reset emails send), and optionally `ANTHROPIC_API_KEY`.
5. **Build and run.** `npm run build && npm start`, or deploy to Vercel (set the variables in project settings). If you run more than one instance, set `REDIS_URL` (Upstash, Redis Cloud, Railway, ElastiCache) so live updates, presence and rate limits are shared. With one instance you can leave it empty.

## Decisions and assumptions

- **Invitations and applications share one table** (`Proposal`, with a `source` of `invitation` or `application`). Accepting an invitation means sending a proposal; declining sets it to declined.
- **Skills and project skills are relational tables** (`FreelancerSkill`, `ProjectSkill`) with a proficiency level for freelancers. Other arrays (languages) are JSON strings, which keeps the schema simple and portable.
- **Publishing is explicit.** The brief flow saves a private draft; nothing is visible or invitable until it is published.
- **Pricing model.** "Project-based" freelancers also give an indicative hourly rate, because budget fit is scored against an hourly figure.
- **Estimated hours** come from the suggested budget range (midpoint divided by $75/h). Minimum experience is inferred from brief size.
- **The model decides scope-creep; code decides money.** Quote price is hours times the hired freelancer's rate.
- **Chat opens when a proposal is accepted**, since scope creep is measured against an agreed brief.
- **Fonts** (Instrument Serif and Instrument Sans) load from Google Fonts with system fallbacks. Accent is verdigris `#09786C` on warm off-white and deep ink; dark mode uses `#3FCFB8`.
- The AI model is `claude-sonnet-5-5`. If the API rejects `temperature`, the client retries without it.

## Quality checks

```bash
npm run lint            # type-check
npm test                # unit tests (scoring, validation, auth, rate limits, storage, mail, verification)
npm run build           # production build
npm run test:e2e        # end-to-end tests in a real browser (see below)
npm run check:integrations   # real calls to the services you have configured
```

**End-to-end tests** (`e2e/`, Playwright) drive the real app through the browser: sign up and sign in, password reset, email confirmation, a freelancer's profile, matches and application, a client's brief and publishing, hiring, the live workspace between two people (start, submit with a file, request changes, approve, chat and typing), the Client | Freelancer switch, and that a stranger cannot see a project. They run against a **separate** database and delete accounts in it, so point them at a throwaway one:

```bash
createdb tessera_test
E2E_DATABASE_URL=postgresql://localhost:5432/tessera_test npm run test:e2e
```

Locally they use your installed Google Chrome; CI installs Chromium. AI and email run in their offline modes so the tests are deterministic and free. GitHub Actions (`.github/workflows/ci.yml`) runs the type-check, unit tests (with Redis), build and the end-to-end suite on every push and pull request.

## Known limits

- **Not verified:** the AI features against the live API (no key was available), email delivery through Resend, and the browser upload progress bar (the upload endpoint and its rules were tested over HTTP, not through the file picker).
- **Email verification** is not implemented, and password-reset emails need a provider (see above).
- **Production storage and rate limiting** need the swaps described under Deploying; the defaults suit one server.
- There are no payments. Budgets and "spending" are the agreed project amounts.
- Chat uses polling, not websockets.
