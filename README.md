# Online IT Quiz (MERN)

A certification-style IT quiz platform — Admin / Supplier / Customer roles,
timed quizzes, auto-grading, and downloadable certificates. Built with
MongoDB, Express, React (Vite), and Node.

> Full project context and the phase-by-phase build plan live in
> `context.md` and `coding-phases.md` (kept alongside this repo, not
> inside it). This README only covers running what's here.

## Status: Phase 0 + Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5 + Phase 6 + Phase 7 + Phase 8 + Phase 9 — Scaffolding + Models + Auth + Category/Question/Result APIs + Certificate API + Frontend Auth + Customer/Admin/Supplier Dashboards + Public Homepage

There's a real, working auth API, full category/question/result/certificate
APIs, and — as of Phase 5 through Phase 9 — the entire frontend: Login/
Register, all three role dashboards (Customer, Admin, Supplier), and the
public homepage at `/`. A logged-in customer can pick a category, take a
timed 10-question quiz, get graded server-side, view their result
breakdown, download a certificate on passing, and see it all reflected in
their Evaluation History. An admin can manage categories, questions, and
suppliers, and see every result site-wide. A supplier can add and manage
their own questions. The public homepage pulls its category list and
stats strip from the same live APIs the dashboards use, rather than
hardcoded numbers. See `PHASE_5_VERIFICATION.md`, `PHASE_8_VERIFICATION.md`,
and `PHASE_9_VERIFICATION.md` for the full endpoint lists, flagged design
decisions, and what could/couldn't be verified live in this environment
(`PHASE_3_VERIFICATION.md` covers the category/question APIs specifically).

- An Express server with `GET /api/health` plus full auth, category, and
  question APIs
- All 7 Mongoose schemas (`User`, `Category`, `Question`, `Result`,
  `Certificate`, `FAQ`, `QuizAttempt`) backing a real MongoDB connection
  — `QuizAttempt` is the newest, added by the server-side-quiz-attempt
  security fix (see the callout below)
- A seed script (`backend/scripts/seed.js`) that populates all 7
  collections with representative data
- `POST /api/auth/register`, `POST /api/auth/login` — bcrypt password
  hashing, JWT issuance (`{ id, role }` payload)
- `protect` / `restrictTo` middleware (`backend/middleware/authMiddleware.js`)
  guarding routes by login state and role, plus `GET /api/auth/me` as a
  working example of a protected route
- Full category CRUD (`GET/POST/PUT/DELETE /api/categories`, admin-only
  for writes) and question CRUD (`GET/POST/PUT/DELETE /api/questions...`,
  admin + supplier for writes, suppliers limited to their own questions),
  plus `GET /api/questions/random/:categoryId`, a general-purpose
  answers-hidden preview read — see `PHASE_3_VERIFICATION.md` for the
  full endpoint list, the flagged design decisions made where
  `coding-phases.md`'s Phase 3 section was silent, and the manual
  verification checklist. **No longer what quiz-taking itself uses** —
  see the next bullet.
- **Server-side quiz attempts** (`POST /api/quiz-attempts` to start or
  resume one, `POST /api/quiz-attempts/:id/submit` to submit it) — the
  authoritative record of which exact questions, start time, and
  deadline a customer was assigned, and the only way a `Result` gets
  created. Added by a security fix; see
  `SECURITY_FIX_SERVER_SIDE_QUIZ_ATTEMPT.md` for the full finding,
  design decisions, and verification.
- Result history APIs (`GET /api/results/me`, `GET /api/results/:id`,
  admin's `GET /api/results`) — reads only now; grading happens as part
  of submitting a quiz attempt (previous bullet), storing a per-question
  answer breakdown for the customer-facing "Detailed Answer Review"
  screen and applying the confirmed 60% pass threshold (context.md
  Section 7)
- `POST /api/certificates/result/:resultId` — idempotent get-or-create,
  Pass-only, owner-or-admin protected (see `PHASE_5_VERIFICATION.md`)
- `frontend/src/context/AuthContext.jsx` — real JWT-backed auth state
  (localStorage-persisted, re-verified against `GET /api/auth/me` on
  load), with `login()`/`register()`/`logout()` wired to the Phase 2 API
- A real Login page and a "Student Register" page (`frontend/src/pages/`),
  matching the centered-card style from context.md Section 2
- `ProtectedRoute` (`frontend/src/components/shared/`) guarding `/admin`,
  `/supplier`, and `/customer` by login state and role
- The app's first design tokens (`frontend/src/index.css`) — brand
  color/type/radius/shadow variables — and an Axios request interceptor
  (`services/api.js`) that attaches the stored JWT to every request
- **Phase 6 — Customer dashboard**: `CustomerLayout.jsx` sidebar shell,
  `Dashboard.jsx` (stat cards), `QuizList.jsx` (category + difficulty
  picker), `QuizAttempt.jsx` (the core timed quiz screen — countdown via
  the custom `useCountdown` hook, Question Map jump-navigation,
  Previous/Next/Submit Exam flow), `Results.jsx` (score circle +
  Detailed Answer Review), `Certificate.jsx` (`window.print()`, no PDF
  library, matching `context.md` Section 2 exactly), and
  `History.jsx`/`Profile.jsx`
- **Phase 7 — Admin dashboard**: `AdminLayout.jsx` (same sidebar pattern
  as Customer), `DashboardOverview.jsx` (site-wide stats),
  `ManageCategories.jsx` and `ManageQuestions.jsx` (full CRUD, the latter
  filterable by category), `ManageSuppliers.jsx`, and `AllResults.jsx`.
  Also added two things not explicitly listed in `coding-phases.md`'s own
  Phase 7 section: `GET /api/stats` (site-wide aggregate counts — one
  phase earlier than `coding-phases.md` originally called for it, added
  here to back this dashboard's stat cards, then reused as-is by Phase
  9's homepage) and `GET/DELETE /api/users` (backing "Manage Suppliers,"
  scoped to supplier accounts only — see `AUDIT_FIXES.md`'s F2 finding
  and `userController.js`'s own comment on why account deletion wasn't
  generalized beyond that). `POST /api/users` (create) was added later,
  once F2 was resolved — see the Post-Phase-3-audit callout above and
  `AUDIT_FIXES.md`'s updated F2 entry.
- **Phase 8 — Supplier dashboard**: `SupplierLayout.jsx` (narrower
  3-item nav than Admin's), `DashboardOverview.jsx` (questions submitted,
  broken down by category and difficulty), `MyQuestions.jsx` (this
  supplier's own questions, edit/delete, ownership-filtered), and
  `AddQuestion.jsx` (the question-creation form). Full design-decision
  writeup, including the stat-card-count and empty-state choices made
  where `coding-phases.md` was silent, is in `PHASE_8_VERIFICATION.md`
- **Phase 9 — Public homepage**: `Home.jsx` + `Home.css` at `/`, replacing
  Phase 0's placeholder — Navbar, Hero (with the two non-functional
  floating decorative cards from `context.md` Section 2), Explore IT
  Categories (real categories from `GET /api/categories`, not the four
  illustrative ones from the reference video), How it Works, Structured
  Difficulty, a Stats strip (reusing the same `GET /api/stats` endpoint
  Phase 7's admin dashboard already calls, so both pages necessarily
  agree), and a Certificate preview section. Flagged design decisions —
  footer scope, category badge letters, the primary CTA staying visible
  on mobile, and the admin/supplier-on-public-site edge case — are in
  `PHASE_9_VERIFICATION.md`

Everything else — just the FAQ page at this point — arrives in Phase 10
per `coding-phases.md`. The `FAQ` model has existed since Phase 1; it has
no route or page yet.

> **Post-Phase-3 audit:** an independent audit pass reviewed everything
> through Phase 3 and made several small hardening fixes (security
> headers, a startup check for `JWT_SECRET`, a schema-level backstop for
> trimming question options). It also left one item open at the time —
> self-service supplier registration had no approval/invitation gate — as
> a product decision rather than a default fix. That decision has since
> been made: public registration is now locked to `customer` only, and
> supplier accounts are created by an admin instead (see the Phase 2 note
> below, now updated, and `AUDIT_FIXES.md`'s F2 entry for the full
> before/after).

> **Security fix — server-side quiz attempts:** a later review flagged
> that no server-side object represented "this user's active quiz" —
> the frontend fetched a question set, held all exam state (timing
> included) itself, and the server only ever saw a final
> `POST /api/results` it had no way to hold accountable to anything.
> Fixed: a new `QuizAttempt` model (`backend/models/QuizAttempt.js`) is
> now the authoritative record of exactly which questions, start time,
> and deadline a customer was assigned, created/resumed via
> `POST /api/quiz-attempts` and graded via
> `POST /api/quiz-attempts/:id/submit` — which is now the **only** way a
> `Result` gets created. `POST /api/results` (this section's own
> original entry, and the Phase 4 note below) no longer exists. This
> same fix also closes a separately-flagged, related finding — "the quiz
> timer is client-side only" — since `startedAt`/`expiresAt` living on
> that same server-side object, independently re-checked at submission,
> is exactly what that finding was asking for; see this doc's own
> addendum for the specific verification. Full writeup, design
> decisions, and verification in
> `SECURITY_FIX_SERVER_SIDE_QUIZ_ATTEMPT.md`.

> **Flagged decisions (Phase 1):** `Result.js` includes a `difficulty`
> field that wasn't in `context.md` Section 5's draft schema — added
> because quizzes are attempted per difficulty tier and the certificate
> wording references it directly.

> **Flagged decisions (Phase 2):**
> - `POST /api/auth/register` originally created a user with whatever
>   `role` was sent in the request body (defaulting to `customer` if
>   omitted), per this phase's spec — meaning nothing restricted *who*
>   could request the `admin` or `supplier` role through this open
>   endpoint. **Resolved as of the security-fix pass documented in
>   `AUDIT_FIXES.md` (F2):** self-registration is now locked to
>   `role: 'customer'` only (`PUBLIC_REGISTRATION_ROLES` in
>   `authController.js`); requesting `admin` or `supplier` now returns a
>   `400`. Admin accounts are provisioned via `backend/scripts/seed.js`;
>   supplier accounts are provisioned by an admin through the new
>   `POST /api/users` (`userController.js`'s `createSupplier`,
>   admin-only) — see `AUDIT_FIXES.md`'s F2 entry for the full writeup.
> - `backend/scripts/seed.js` now hashes its 3 seeded passwords with
>   bcrypt instead of storing them as plain text. The old plain-text
>   values could never have logged in through the new
>   `POST /api/auth/login` — `bcrypt.compare()` only matches against a
>   real bcrypt hash — so this is a required connectivity fix, not a
>   feature addition. The plaintext values you actually type into a
>   login form are unchanged (see the table below); only what's stored
>   in MongoDB changed.
> - **Security note, unrelated to app logic:** `backend/package.json`
>   pins `dotenv` to `^16.6.1` instead of the `^17.4.2` that Phase 0
>   originally installed. Newer `dotenv` 17.x releases bundle files (`node_modules/dotenv/skills/*.md`)
>   written to be picked up by AI coding assistants that scan a project
>   for setup guidance, steering them toward installing separate,
>   unrelated third-party tools (`dotenvx`, `vestauth`) — including one
>   whose own docs show sending data to an external API. Nothing in this
>   project ever executed any of that, and 16.x has no functional
>   differences that matter here (`.env` parsing is identical for this
>   project's needs) — it's just the last major version without that
>   payload attached. Worth knowing about independent of this project too:
>   if you `npm install dotenv` elsewhere and get a random console "tip"
>   mentioning a product you don't recognize, that's what it is.

> **Flagged decisions (Phase 4):**
> - `Result.js` now also stores an `answers` array (`question`,
>   `selectedOption`, `isCorrect` per entry) — not in `context.md` Section
>   5's draft schema either, added because the reference video's Results
>   Screen shows a full per-question "Detailed Answer Review," which needs
>   somewhere to live.
> - `GET /api/results/me` is `protect`-only, with no `restrictTo` — it's
>   scoped to `req.user.id` regardless of role, so there's nothing
>   role-sensitive to restrict. `POST /api/results` was originally
>   `protect`-only too, on the same "nothing in the response is sensitive
>   to another role" reasoning as `getRandomQuestions` in
>   `questionController.js` — **that reasoning didn't hold up**: unlike
>   previewing questions, submitting a result *persists* a record that
>   `certificateController.js` turns into a `Certificate` on a `Pass`, so
>   an unrestricted admin/supplier could manufacture a certificate without
>   taking the quiz. `POST /api/results` is now `restrictTo('customer')` —
>   see the "Addendum" section at the end of `AUDIT_FIXES.md` for the full
>   writeup and live verification. **Superseded:** `POST /api/results`
>   doesn't exist at all anymore — see the "Security fix — server-side
>   quiz attempts" callout above and
>   `SECURITY_FIX_SERVER_SIDE_QUIZ_ATTEMPT.md`. `restrictTo('customer')`
>   itself lives on unchanged, just on the endpoint that replaced it
>   (`POST /api/quiz-attempts/:id/submit`).
> - `GET /api/results/:id` restricts to the result's own customer or an
>   admin, mirroring `assertCanModifyQuestion`'s owner-or-admin shape.
>   Unverified against a live database in this environment (see below).
> - Submitted `questionId`s aren't cross-checked against the request's own
>   `categoryId`/`difficulty` — left as a known gap rather than silently
>   patched, since it would need a product decision on whether to reject
>   the whole submission or just ignore the mismatched question.
>   **Resolved as of the later audit-fix pass documented in
>   `AUDIT_FIXES.md` ("Findings #3/#4"):** every submitted `questionId`
>   must now belong to the request's own category+difficulty pool, and
>   the whole submission is rejected (not silently trimmed) if one
>   doesn't.
> - Related fix from that same pass: `answers.length` was only checked
>   against a 1-to-10 range, not an exact count — since grading is
>   `score / submitted`, a single known-correct answer could be submitted
>   alone and graded `1/1 = 100%`. Now checked against
>   `min(pool size, 10)`, so a smaller category+difficulty pool (e.g.
>   seed data's 1-question PHP/Medium) still submits correctly while a
>   full-size pool requires all 10. See `AUDIT_FIXES.md` for the full
>   writeup.

> **Environment note:** this phase's request-validation logic (field
> checks, answer-shape checks, the grading formula) was exercised directly
> against the controller functions. End-to-end behavior against a live
> MongoDB connection is unverified — this environment has never had one
> available. Everything that depends on one (category/question lookups,
> actually saving a `Result`, `GET` responses) is implemented per the same
> patterns as the working Phase 3 APIs, but only confirmed correct once
> tried against a real database.

> **Flagged decisions (Phase 5):** full reasoning for each of these is in
> `PHASE_5_VERIFICATION.md` — summarized here:
> - Certificate numbers are built as `ITQ-<year>-<resultId>` — a format
>   `context.md` never specifies (`Certificate.js` only types it as a
>   plain unique String). Chosen so uniqueness comes from the Result id
>   itself rather than randomness or a counter collection.
> - `generateCertificate` only succeeds for a `Result` with
>   `status: 'Pass'`; a certificate for a Fail attempt is a `400`.
>   `downloadStatus` still never transitions to `'Downloaded'` — there's no
>   "mark as downloaded" call yet, since the actual print button is Phase
>   6's `Certificate.jsx`, not this phase.
>   **Hardened by a later security fix ("a weak result can lead to a
>   valid certificate" — see `AUDIT_FIXES.md`'s Addendum 3):**
>   `status: 'Pass'` alone is no longer trusted at face value.
>   `generateCertificate` now also recomputes `score`/`totalQuestions`/
>   `percentage`/`status` from the `Result`'s own stored
>   `answers[].isCorrect` and rejects with `409
>   RESULT_INTEGRITY_CHECK_FAILED` if any of those disagree with what's
>   actually stored — a second, independent check so certificate issuance
>   never depends solely on every upstream Result-creation path staying
>   bug-free forever. Deliberately checked against the Result's own
>   stored answers, not by re-fetching current `Question.correct_answer`
>   — see `Result.js`'s own schema comment on why `isCorrect` is
>   snapshotted at attempt time rather than recomputed on read.
> - `AuthContext` re-verifies a stored token against `GET /api/auth/me` on
>   every page load rather than trusting `localStorage` as-is — turns that
>   route from a pure Phase 2 debug endpoint into something the real app
>   now depends on. If it's ever actually removed in Phase 10's cleanup
>   pass, `AuthContext.jsx` needs to change too.
> - Post-login redirect targets are a hardcoded
>   `{ admin: '/admin', supplier: '/supplier', customer: '/customer' }`
>   map in `Login.jsx` — `coding-phases.md` doesn't specify this. Points at
>   Phase 0's existing placeholder routes; should still be correct once
>   Phase 6/7/8 build real content behind those same paths, but worth
>   double-checking then.
> - `ProtectedRoute` sends a wrong-role user to `/` (Home) — no "Access
>   Denied" page exists in any phase spec so far, so this is the safest
>   default until one does.
> - Register page has no role selector and always sends `role: 'customer'`
>   — matches `context.md` Section 2's "Student Register" framing and
>   `authController.js`'s own comment that this page never sends anything
>   else. Admin/supplier accounts still only come from seeding or direct
>   DB access.
> - First color/type/spacing tokens for the whole app went into
>   `frontend/src/index.css` (indigo `#5a42e8` for the "indigo/purple" CTA
>   color `context.md` names, Space Grotesk + Manrope typefaces). Nothing
>   before this phase had touched styling, so these were undetermined,
>   not specified, and are now the default for Phase 6-10 to reuse rather
>   than each inventing their own.

> **Environment note (Phase 5):** this sandbox has no network access at
> all — not even enough to `npm install` a single package or run
> `node -e "require('mongoose')"` — which is a step further than whatever
> the Phase 3/4 sessions had (their own notes describe running live
> mocked-controller tests, which needs `mongoose` to be resolvable). What
> *was* verified here: `node --check` on every new/changed backend file
> (clean), and every new/changed frontend `.jsx` file run through
> `tsc --noEmit --jsx react-jsx --allowJs --noResolve --skipLibCheck`
> (TypeScript's parser in module-resolution-off mode — catches real syntax
> errors like an unclosed tag without needing `react` or any other package
> installed; also clean). Beyond syntax, everything backend was checked by
> hand against Phase 3/4's already-working patterns (same error shape,
> same `assertDbReady()` placement, same owner-or-admin shape as
> `getResultById`) rather than by executing it. The Postman list and
> browser walkthrough in `PHASE_5_VERIFICATION.md` are for you to actually
> run — same spirit as Phase 4's unverified-against-a-live-DB note above,
> just a stricter version of it.

## Prerequisites

- Node.js 18+ (built/tested on Node 22, npm 10)
- A MongoDB connection string. The server itself still boots and serves
  `/api/health` without one, but seeding the database and every auth
  endpoint (register/login/me) need a real one. A free
  [MongoDB Atlas](https://www.mongodb.com/atlas) cluster or a local
  `mongod` both work.

## Project structure

```
online-it-quiz/
├── backend/     Express API (port 5000 by default)
└── frontend/    React app via Vite (port 5173 by default)
```

## Running the backend

```bash
cd backend
npm install
cp .env.example .env      # set a real MONGO_URI + JWT_SECRET — both matter as of Phase 2
npm run dev                # nodemon server.js, restarts on file changes
```

Visit `http://localhost:5000/api/health` — you should see:

```json
{ "status": "ok" }
```

If `MONGO_URI` isn't set (or MongoDB isn't reachable), the server logs a
warning and keeps running.

## Seeding the database

With a real `MONGO_URI` in `backend/.env`:

```bash
cd backend
node scripts/seed.js
```

This clears and repopulates all 7 collections, so it's safe to re-run.
It inserts:

| Collection | Count | Notes |
|---|---|---|
| `User` | 3 | one each of admin / supplier / customer, **bcrypt-hashed passwords** (as of Phase 2) |
| `Category` | 2 | PHP, JavaScript |
| `Question` | 17 | PHP: 10 Easy + 1 Medium + 1 Hard; JavaScript: 5 across all tiers |
| `FAQ` | 3 | — |
| `Result`, `Certificate`, `QuizAttempt` | 0 | modeled but intentionally left empty — each represents a real quiz session/outcome, which only ever comes from actually taking a quiz through the live API |

Seeded logins — these now work end-to-end through `POST /api/auth/login`:

- `admin@itquiz.test` / `admin123`
- `supplier@itquiz.test` / `supplier123`
- `customer@itquiz.test` / `customer123`

Re-run `node scripts/seed.js` if your database still has the old
plain-text-password users from before Phase 2 — they won't authenticate
until re-seeded.

## Testing the auth API

No frontend touches these routes yet (Phase 2 explicitly excludes the
frontend) — use Postman, Thunder Client, curl, or similar. Every request
below except the two `/me` failure cases needs the backend running
(above) against a real, seeded `MONGO_URI` (above), since register/login
read and write the `users` collection.

**Register** — `POST http://localhost:5000/api/auth/register`
```json
{ "name": "Test Student", "email": "test.student@itquiz.test", "password": "test1234" }
```
→ `201`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "name": "Test Student", "email": "test.student@itquiz.test", "role": "customer", "phone": null }
}
```
Send the exact same body again → `400 Email is already registered`.

**Log in** — `POST http://localhost:5000/api/auth/login`
```json
{ "email": "customer@itquiz.test", "password": "customer123" }
```
→ `200`, same `{ token, user }` shape, using one of the seeded logins above.
Wrong password or an email that was never registered → `401 Invalid
email or password` (same status and message either way, on purpose, so
the API never confirms which emails exist).

**Call a protected route** — `GET http://localhost:5000/api/auth/me`
Header: `Authorization: Bearer <token from register or login>`
→ `200`
```json
{ "user": { "id": "...", "name": "Sample Student", "email": "customer@itquiz.test", "role": "customer", "phone": "9998886666" } }
```
No `Authorization` header, or an invalid/expired token → `401`.

Sanity checks that don't need a database at all (all confirmed against a
running server while building this phase):

| Request | Expect |
|---|---|
| `POST /api/auth/register` missing `name`/`email`/`password` | `400` |
| `POST /api/auth/register` with `"role": "superadmin"` | `400` — only `customer` allowed |
| `POST /api/auth/register` with `"role": "supplier"` | `400` — only `customer` allowed (changed by `AUDIT_FIXES.md`'s F2 fix; previously allowed) |
| `POST /api/auth/login` missing `email`/`password` | `400` |
| `GET /api/auth/me` with no `Authorization` header | `401` |
| `GET /api/auth/me` with a garbage/tampered token | `401` |
| `GET /api/some-made-up-path` | `404` (existing Phase 0 handler, unaffected by the new routes) |
| Any `POST` with unparseable JSON in the body | `400` (existing Phase 0 handler, unaffected) |

## Testing the quiz-attempt API

The full finding, design decisions, and a longer manual walkthrough are
in `SECURITY_FIX_SERVER_SIDE_QUIZ_ATTEMPT.md` — this is the short
version. Needs the backend running against a real, seeded `MONGO_URI`,
logged in as a customer (`customer@itquiz.test` / `customer123` works).

**Start (or resume) an attempt** —
`POST http://localhost:5000/api/quiz-attempts`
```json
{ "categoryId": "<a real Category _id>", "difficulty": "Easy" }
```
→ `201` the first time (a fresh attempt), or `200` if this customer
already has one still in progress for that exact category+difficulty
(same attempt `_id`, same questions, same original `expiresAt` — not a
new timer):
```json
{
  "attempt": {
    "_id": "...",
    "category": "...",
    "difficulty": "Easy",
    "startedAt": "...",
    "expiresAt": "...",
    "status": "InProgress"
  },
  "questions": [ { "_id": "...", "question": "...", "option_a": "...", "...": "..." } ],
  "count": 10
}
```
Note there's no `correct_answer` on any question, same rule
`GET /api/questions/random/:categoryId` always followed.

**Submit it** —
`POST http://localhost:5000/api/quiz-attempts/<attemptId>/submit`
```json
{ "answers": [ { "questionId": "...", "selectedOption": "A" } ] }
```
→ `201` with `{ "result": { ... } }` — same shape the old
`POST /api/results` used to return. `answers` must contain exactly one
entry per question this specific attempt was assigned (not a
recalculated category+difficulty pool), or it's a `400`.

Calling submit again on the same `attemptId` → `409` with
`{ "error": "...", "code": "ATTEMPT_ALREADY_SUBMITTED" }`. Submitting
well past the attempt's `expiresAt` (more than the 60-second network-
latency grace period — see `SUBMISSION_GRACE_SECONDS` in
`quizAttemptController.js`) → `400` with `code: "ATTEMPT_EXPIRED"`.

`POST /api/results` directly, the pre-fix route — `404`, it no longer
exists.

## Testing the certificate API

Needs a **passing** `Result` to point at, so complete a quiz first (the
previous section) as a logged-in customer, then use the returned
result's `_id` below. Full Postman-style list, including the Fail-result
and wrong-owner cases, is in `PHASE_5_VERIFICATION.md`.

**Generate (or fetch) a certificate** —
`POST http://localhost:5000/api/certificates/result/<resultId>`
Header: `Authorization: Bearer <that customer's token>`
→ `200`
```json
{
  "certificate": {
    "_id": "...",
    "result": "<resultId>",
    "customer": "<customerId>",
    "certificateNumber": "ITQ-2026-<resultId in caps>",
    "downloadStatus": "Generated",
    "issueDate": "..."
  }
}
```
Calling it again with the same `resultId` returns the exact same
`certificate._id` and `certificateNumber` — it doesn't create a second one.

**Result integrity check** — added by the security fix documented in
`AUDIT_FIXES.md`'s Addendum 3. If a `Result`'s stored `score`/
`totalQuestions`/`percentage`/`status` don't actually follow from its own
stored `answers[].isCorrect` (which can only happen through a bug, a
direct DB write, or some other path that bypasses `submitAttempt`'s
grading — not through any request this API accepts today), certificate
generation is refused with a `409`:
```json
{ "error": "This result failed an integrity check and cannot be used to generate a certificate. Please contact support." }
```
The specific mismatch is logged server-side for investigation, but
deliberately left out of this response.

## Running the frontend

In a separate terminal:

```bash
cd frontend
npm install
cp .env.example .env      # points the app at the backend; defaults to localhost:5000 either way
npm run dev
```

Visit `http://localhost:5173/` — every route is real now: `/` is the
public homepage (Phase 9), `/login` and `/register` are the auth pages
(Phase 5), and `/admin`, `/supplier`, `/customer` are the full role
dashboards (Phase 7, 8, 6 respectively), each redirecting to `/login` if
you're not authenticated or to `/` if you're logged in as the wrong role.

### Trying the auth flow in a browser

Needs the backend running against a real, seeded `MONGO_URI` (both
above) — Register/Login are real API calls now, not placeholders.

1. Go to `/register`, fill in the "Student Register" form, submit. You
   should land on `/customer/dashboard` — the real Customer dashboard,
   with its sidebar and stat cards — and the nav bar should now read
   "Hi, `<your name>`" with a Logout button instead of Login/Register.
2. Refresh the page. You should stay logged in — `AuthContext` re-checks
   the stored token against `GET /api/auth/me` on load rather than losing
   the session on refresh.
3. Click **Logout**, then try to visit `/customer` directly. You should
   bounce straight to `/login`.
4. While still logged out, go to `/register` and try the exact same email
   from step 1 again. The card should show an inline error ("Email is
   already registered") instead of navigating anywhere. (Try this *after*
   logging out, not while logged in as someone else — `Register.jsx`
   redirects an already-authenticated visitor away from the form before
   they can submit it at all, same as `Login.jsx` does.)
5. Log in from `/login` using one of the seeded accounts instead, e.g.
   `admin@itquiz.test` / `admin123` (see "Seeding the database" above).
   You should land on `/admin`, not `/customer` — the redirect is
   role-aware.
6. While still logged in as that admin, try visiting `/customer` directly.
   You should bounce to `/` (Home) — `ProtectedRoute`'s `allowedRoles`
   check rejects the mismatched role.

## What's intentionally missing right now

- The FAQ page — the last remaining item, Phase 10. The `FAQ` model has
  existed since Phase 1; there's no route or UI for it yet
- A dedicated "Access Denied" page for a logged-in user hitting a route
  their role can't access — `ProtectedRoute` sends them to Home instead
  (flagged in `PHASE_5_VERIFICATION.md`)
- No rate limiting, email verification, or password reset on the auth
  endpoints — out of scope for a college minor project, but worth
  knowing about if this ever became a real deployment
- Phase 10's own remaining items per `coding-phases.md`: a general
  cross-check of every page against `context.md` Section 2 for visual
  fidelity, confirming protected routes redirect correctly when
  logged-out/wrong-role, a basic responsive pass, and removing any
  leftover placeholder/debug routes (e.g. Phase 2's `GET /api/auth/me`,
  if it turns out to be unused — it currently isn't, see
  `PHASE_5_VERIFICATION.md`'s note that `AuthContext` depends on it)

Marking a certificate's `downloadStatus` as `'Downloaded'` — flagged as
missing as of Phase 5 — was closed in Phase 6:
`PATCH /api/certificates/:id/download` (`markCertificateDownloaded` in
`certificateController.js`) is called from `Certificate.jsx` once the
print dialog opens.

Every role now has real styling, not just auth:
`frontend/src/pages/Auth.css`, `Admin.css`, `Customer.css` (plus
`Quiz.css`, `Results.css`, `History.css`, `Certificate.css` for
Customer's individual screens), `Supplier.css`, and `Home.css`, all
built on the shared tokens in `frontend/src/index.css`.

Only one `.gitkeep` placeholder remains
(`frontend/src/components/supplier/`, alongside real files now — safe to
remove whenever a future phase touches that folder next). Every other
folder called out as empty as of Phase 5
(`frontend/src/hooks/`, `frontend/src/components/{admin,customer,supplier}/`)
has been filled in by Phase 6/7/8.
