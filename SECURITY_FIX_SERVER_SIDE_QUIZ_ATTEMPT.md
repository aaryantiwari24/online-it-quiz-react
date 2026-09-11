# Security Fix — Finding #5: "There is no server-side quiz attempt"

Response to a security-review finding (severity: Critical/High) reported as:

> The current flow is essentially: Frontend requests questions → Frontend
> holds questions/state → Frontend sends answers → Server creates Result.
> There is no authoritative server-side object representing this user's
> active quiz, these exact 10 questions, this start time, this expiry
> time, or this submission state. The browser is controlling too much of
> the exam process; the server doesn't have a trustworthy record of what
> the student was actually assigned. Impact: it becomes much easier to
> manipulate question IDs, timing, attempts, and submissions.

Same spirit as `AUDIT_FIXES.md`: say what changed, say why, back
live-behavior claims with an actual re-runnable check rather than static
reading alone, and be explicit about what's still unverified in this
environment rather than implying more confidence than the evidence
supports.

## Confirming the finding, concretely

Before this fix, the actual flow was:

- `QuizAttempt.jsx` (the frontend page) called
  `GET /api/questions/random/:categoryId?difficulty=X` on mount and held
  the returned question set in React state (`questions`).
- The countdown timer's duration came from a **frontend-only** constant,
  `TIME_LIMIT_SECONDS` in `frontend/src/pages/customer/quizConfig.js` —
  nothing server-side ever recorded when a quiz started, when it should
  end, or checked either at submission time.
- Submission was a single `POST /api/results` with
  `{ categoryId, difficulty, answers }` — entirely client-asserted.
  `resultController.js`'s `createResult` re-queried the *category+
  difficulty pool* at submission time and checked the submitted
  `answers` against that pool (exact count, membership) — a real check,
  but one with no memory of what had actually been handed out earlier.
  Nothing tied a submission back to a specific, previously-issued
  question set, a start time, or a deadline, because no such record
  existed anywhere.

In short: every part of the finding's own description was accurate.
There was no `QuizAttempt`-shaped object anywhere in the schema or the
API before this fix — `git log`-style, this is a genuinely new model,
not a hardening of an existing one.

## What changed

**New model** — `backend/models/QuizAttempt.js`. Fields: `customer`,
`category`, `difficulty`, `questions` (the exact, ordered list of
Question ids assigned, fixed at creation), `startedAt`, `expiresAt`,
`submittedAt`, `status` (`InProgress` / `Submitted` / `Expired`), and
`result` (back-reference once graded). Two indexes: a plain compound one
for the common lookup, and a **partial unique index** on
`{ customer, category, difficulty }` scoped to `status: 'InProgress'` —
the database itself now refuses to let one customer hold two live
attempts at the same category+difficulty quiz at once.

**New controller** — `backend/controllers/quizAttemptController.js`,
with two functions:

- `startOrResumeAttempt` — idempotent get-or-create (same shape as
  `certificateController.js`'s `generateCertificate`). If the customer
  already has a live attempt at this exact category+difficulty, it's
  resumed (same `_id`, same questions, same original `expiresAt`);
  otherwise a new one is sampled (same `$sample` aggregation
  `getRandomQuestions` always used) and its timer starts from the
  server's own clock.
- `submitAttempt` — the only remaining way to create a `Result`. Loads
  the attempt by id, checks ownership, checks status, checks the real
  deadline against the server's clock (with a small grace period for
  network latency — see below), grades strictly against the attempt's
  own fixed question list, and only then creates the `Result` and marks
  the attempt `Submitted`.

**New routes** — `backend/routes/quizAttemptRoutes.js`:
`POST /api/quiz-attempts` (start/resume, any logged-in role) and
`POST /api/quiz-attempts/:id/submit` (submit, `restrictTo('customer')`).

**Removed** — `resultRoutes.js`'s `POST /` and `resultController.js`'s
`createResult`/`validateAnswersShape`. This is the part that actually
matters for closing the finding, not just supplementing it: leaving the
old direct-submission route alive alongside the new attempt-based one
would have meant the vulnerability was still fully exploitable by simply
not using the new endpoints. `gradeQuiz` (the pure grading function)
stays in `resultController.js` and is imported by `submitAttempt` — it
never needed to change; only what fed it did. `resultRoutes.js`/
`resultController.js` are now read-only from the API's perspective (a
`Result` is something a `QuizAttempt` submission produces, the same
relationship a `Certificate` already has to a passing `Result`).

**`Result.js`** gained a `quizAttempt` field: `required`, and `unique`
(with `sparse: true` so it doesn't choke on any hypothetical pre-fix row
that predates it entirely). This is the database-level backstop against
a double-submit — see "Design decisions" below.

**Frontend** — `QuizAttempt.jsx` now calls `POST /api/quiz-attempts` on
mount instead of `GET /api/questions/random/:categoryId`, seeds its
countdown from the returned `attempt.expiresAt` instead of the frontend's
own `TIME_LIMIT_SECONDS` constant, and submits to
`POST /api/quiz-attempts/:id/submit` instead of `POST /api/results`. It
also now distinguishes a terminal rejection (attempt expired or already
submitted — see the `code` field below) from a transient one, showing a
"back to available quizzes" screen for the former instead of leaving a
dead quiz interactive. `quizConfig.js`'s `TIME_LIMIT_SECONDS` is now
explicitly a *display-only* estimate (used only by `QuizList.jsx`'s
"15 min" label before a quiz starts) — the authoritative copy lives
server-side in `quizAttemptController.js` and is the only one anything
is ever checked against.

## How this maps back to the finding's own wording

- **"this user's active quiz"** — `startOrResumeAttempt` looks up (and
  the partial unique index enforces) at most one live attempt per
  customer+category+difficulty. `submitAttempt`'s ownership check
  (`assertOwnsAttempt`) means only that customer can ever submit it.
- **"these exact 10 questions"** — `QuizAttempt.questions` is fixed at
  creation. `submitAttempt` grades against exactly that list (loaded via
  `loadAssignedQuestions`), never against a freshly re-queried
  category+difficulty pool. A submitted `questionId` that isn't in that
  exact set is rejected outright — including one that legitimately
  exists in the same category+difficulty pool but simply wasn't part of
  *this* attempt, which the old pool-membership check would have let
  through.
- **"this start time" / "this expiry time"** — both set once from
  `Date.now()` at creation, server-side, never from the client.
  `submitAttempt` re-checks `expiresAt` against the server's own clock
  at submission time (see `SUBMISSION_GRACE_SECONDS` below); a client can
  no longer just... not enforce a deadline it was never actually bound
  by in the first place.
- **"this submission state"** — `status` (`InProgress` →
  `Submitted`/`Expired`), checked before grading. Backstopped at the
  database level by `Result.quizAttempt`'s unique index, so even a
  request race that slips past the status check can't produce two
  `Result`s for one attempt.

## Design decisions (flagged, not silently assumed)

**Attempt creation stays open to any logged-in role; only submission is
`restrictTo('customer')`.** Re-derived rather than copy-pasted from
`getRandomQuestions`' original "any logged-in role can preview" stance —
that same reasoning, applied to `POST /api/results`, turned out to be
wrong (see `AUDIT_FIXES.md`'s "Unrestricted quiz-result submission"
addendum), so it deserved re-checking here rather than blind reuse. What
made that case dangerous was that submitting a result *persists a
graded, certificate-eligible record*. Creating a `QuizAttempt` does
persist a record, but on its own it can never become a `Result` or a
`Certificate` — only `submitAttempt` can do that, and it stays
`restrictTo('customer')`. An admin/supplier previewing a quiz (useful for
QA on their own questions) ends up with an inert `QuizAttempt` row that
can never be graded — no privilege-escalation path.

**Resuming an in-progress attempt, rather than always creating a new
one.** Without this, simply reloading the quiz page would hand out a
fresh full-length timer and a freshly-reshuffled question set every
single time — which would have reopened almost the exact loophole this
fix exists to close, just moved from "the client controls the timer
entirely" to "the client can reset the timer by refreshing." Resuming
returns the same `_id`, same questions, same original `expiresAt`.

**`SUBMISSION_GRACE_SECONDS = 60`.** The countdown hitting zero
client-side and firing an auto-submit request is the *normal* way a
timed-out quiz gets submitted at all — that request can only ever arrive
at or after the real deadline it's racing against, so accepting *zero*
grace would make the ordinary timeout path fail almost every time. 60s
comfortably covers real-world network latency without functioning as
extra thinking time: every input is already disabled the instant a
submit begins (manual or auto), so nothing about the answers themselves
can change during the grace window — it only gives an already-decided,
already-in-flight request room to land.

**A resumed attempt does *not* get the same grace period** —
`findActiveAttempt`'s expiry check is strict (`now < expiresAt`, no
grace), deliberately asymmetric with `submitAttempt`'s. Grace exists to
stop network latency from failing an already-sent submission, not to let
a stale page reload count as "still ongoing."

**No database transaction for "create the Result, then mark the attempt
Submitted."** MongoDB transactions need a replica set, which this
project's documented setup (a local standalone `mongod`, or a free Atlas
cluster) doesn't guarantee, and this codebase doesn't use them anywhere
else. Instead, the two writes are ordered so a failure between them
fails safe: the `Result` is created *first* (so a failure there leaves
the attempt untouched and cleanly retryable), and `Result.quizAttempt`'s
unique index is what actually prevents two `Result`s for one attempt,
independent of whether the follow-up "mark the attempt `Submitted`"
write ever completes — see that field's own comment in `Result.js` and
`submitAttempt`'s handling of a duplicate-key error from `Result.create`.

**Exact-answer-count is based on currently-resolvable assigned questions,
not the attempt's raw stored `questions.length`.** These only differ if
an assigned `Question` document is deleted after the attempt started (a
narrow, admin/supplier-triggered edge case, not something a customer can
cause) — `loadAssignedQuestions` filters those out for *both* the
customer-facing view and grading, so what's displayed and what's
required at submission always agree with each other, and an honest
submission doesn't get rejected over something outside the student's
control. This doesn't reopen the bug being fixed: it only changes
behavior when a *specific assigned* question vanishes, not when the
surrounding category+difficulty pool grows or shrinks elsewhere (which
this attempt's fixed list is already completely insulated from).

**`GET /api/questions/random/:categoryId` (`getRandomQuestions`) was
left in place, not removed**, even though nothing calls it anymore. It's
still fully safe on its own (never includes `correct_answer`, creates no
record of any kind) and could be a reasonable base for a future
"preview before starting" feature. Flagged explicitly, per Phase 10's own
"remove leftover placeholder routes... if it turns out to be unused"
item, so this reads as a deliberate keep, not an oversight.

**Answer *selections* still aren't persisted server-side as they're
made** — only the attempt's shape (which questions, timing, status) is
now authoritative server-side. A browser refresh mid-quiz no longer
resets the timer or reshuffles questions (both now correctly resume),
but it still loses whatever options were already picked, exactly like
before. Auto-saving in-progress answers would be a reasonable follow-up
but is a separate feature, not part of closing this finding.

## What this does not claim to fix

- **No admin-facing audit UI for attempts.** `Result.js`'s `quizAttempt`
  ref is populated (a few fields) by `getResultById`, so the data is
  reachable via the API, but no new admin page was built to browse
  `QuizAttempt` rows directly. Not needed to close the finding; a cheap,
  natural follow-up if it's ever wanted.
- **A near-simultaneous double-submit for the same attempt is
  DB-guarded, not fully avoided.** Two requests racing past the
  in-memory `status` check at the same instant would both attempt
  `Result.create`; the unique index on `Result.quizAttempt` guarantees
  only one wins, and the loser gets a clean 409 — but both do briefly do
  real grading work first. Harmless (both would grade identically
  against the same fixed question set), just not the most efficient
  possible handling of an already-rare race.
- **No automated test suite added.** Consistent with `AUDIT_FIXES.md`'s
  F10 (still an accepted, separate gap, not something this pass took on).

## Verification performed

This environment has no live MongoDB available — same disclosed
limitation as every prior phase's own verification notes (see the
README's "Environment note" callouts). What was actually checked:

- `node --check` on every backend file touched or added:
  `models/QuizAttempt.js`, `models/Result.js`,
  `controllers/quizAttemptController.js`, `controllers/resultController.js`,
  `controllers/questionController.js`, `controllers/certificateController.js`,
  `routes/quizAttemptRoutes.js`, `routes/resultRoutes.js`,
  `routes/questionRoutes.js`, `server.js`, `scripts/seed.js` — all clean.
- Both new `QuizAttempt` indexes, and `Result.quizAttempt`'s
  `required`/`unique`/`sparse` options, confirmed directly by loading the
  compiled Mongoose schemas and inspecting `schema.indexes()` /
  `schema.path(...)` — this doesn't need a live connection, just the
  schema definitions themselves, and confirmed both indexes are exactly
  as designed.
- `npm install` succeeded and the server was actually booted (no
  `MONGO_URI`, matching Phase 0's documented non-fatal-DB-connection
  behavior) and hit live:
  - `GET /api/health` → `200` as always.
  - `POST /api/quiz-attempts` and `POST /api/quiz-attempts/:id/submit`
    with no `Authorization` header → `401`, same shape as every other
    protected route.
  - The same two routes with a garbage bearer token → `401 invalid token`.
  - The same two routes with a **validly signed** token (proving the
    request reaches `protect` → `assertDbReady()` inside the real
    middleware chain, not a wiring bug) with no DB connected → `503`,
    identical in shape to every other protected route under the same
    condition (F5's already-accepted, documented trade-off — unchanged).
  - **`POST /api/results` (the old direct-submission route) →
    `404` — confirms the route is actually gone, not just superseded.**
  - Malformed JSON body, and an unrelated made-up path, still `400` /
    `404` exactly as before (no regression to the global error/404
    handlers).
  - Helmet's headers and the CORS allow-list still present and unaffected
    (`X-Content-Type-Options`, `Access-Control-Allow-Origin` for the Vite
    dev origin, `X-Powered-By` still absent).
- The pure decision logic that a live DB would otherwise be needed to
  exercise end-to-end was instead checked with a standalone script
  reimplementing it against plain-object stand-ins — the exact same
  technique `AUDIT_FIXES.md`'s own addendum used for the count/membership
  checks it verified. Covered: `gradeQuiz` regression (unchanged
  function, new caller); exact-count + membership matching (10-of-10
  accepted; 1-of-10 rejected — the old exploit; a foreign question id
  rejected, including one from the *same* category+difficulty pool but
  not this attempt; a 1-question small-pool attempt still requires
  exactly 1); the expiry+grace decision (on time accepted; a few seconds
  late still accepted; minutes late rejected; the exact grace boundary
  inclusive/exclusive on both sides); the resume-vs-expire decision
  (time remaining → resumable; exactly at or past deadline → not, with
  no grace period reused here); and the status-check ordering
  (`Submitted` reported even when also long past `expiresAt`, so a
  legitimate re-check of an already-submitted attempt gets the accurate
  message). All passed; the script itself was scratch work, not shipped.
- The three changed/added frontend files (`QuizAttempt.jsx`,
  `quizConfig.js`, `QuizList.jsx`) were run through
  `tsc --noEmit --jsx react-jsx --allowJs --noResolve --skipLibCheck`,
  the same syntax-check method `PHASE_5_VERIFICATION.md` used for
  frontend changes with no `react`/npm install needed — clean.

**Not verified in this environment** (would need a real MongoDB):
end-to-end start → resume-on-reload → auto-submit-on-timeout →
Result → Certificate, the partial unique index actually rejecting a
concurrent duplicate `start` at the database level, and
`Result.quizAttempt`'s unique index actually rejecting a concurrent
duplicate `submit`. All three are implemented exactly per the design
above and exercised at the logic level (previous bullet), but, per this
project's own long-standing environment note, "everything that depends
on [a live database]... is implemented per the same patterns as the
working [existing] APIs, but only confirmed correct once tried against a
real database."

## Manual walkthrough, once a real `MONGO_URI` is available

1. Log in as the seeded customer (`customer@itquiz.test` / `customer123`),
   go to Available Quizzes, start a PHP/Easy quiz.
2. `POST /api/quiz-attempts` should return `201` with an `attempt` object
   and 10 questions (no `correct_answer` on any of them). The Network tab
   should show this call, not `GET /questions/random/...`.
3. Answer a few questions, then refresh the page. It should show the
   **same** questions in the **same** order, with the countdown
   continuing from roughly where it left off (not reset to 15:00) — this
   time `POST /api/quiz-attempts` returns `200`, not `201`.
4. Submit the quiz. `POST /api/quiz-attempts/<id>/submit` should return
   `201` with a `result`, and the attempt (if inspected directly in the
   database) should now show `status: 'Submitted'`, `submittedAt` set,
   and `result` pointing at that new `Result`.
5. Try submitting the same attempt id again (e.g. replay the same request
   in Postman with the same token). Expect `409` with
   `code: 'ATTEMPT_ALREADY_SUBMITTED'`.
6. Start a new attempt, let the timer run out without touching Submit.
   The auto-submit should succeed normally (well within the 60s grace).
7. With a REST client, start an attempt, wait past its `expiresAt` plus
   more than 60 seconds (or edit the row's `expiresAt` directly in the
   database to force this), then try to submit it. Expect `400` with
   `code: 'ATTEMPT_EXPIRED'`.
8. With a REST client, try submitting fewer answers than were assigned,
   and separately try substituting a `questionId` from a *different*
   category/difficulty (or from the same category+difficulty but a
   *different* attempt). Both should `400`.
9. `POST /api/results` directly (the old route) should `404`.

## Addendum — Finding #6: "the quiz timer is client-side only"

A separate finding, reported as:

> The countdown is implemented in React. The backend does not
> independently enforce: quiz started at X / quiz expires at Y.
> Anything running in the browser can be modified or ignored. A user can
> stop the timer, alter JavaScript, or simply bypass the frontend and
> call the API directly. The nominal 10-minute examination limit is not
> a trustworthy server-enforced rule.

**No additional code change was needed for this one — it's already
closed, as a direct consequence of the fix above, not a coincidence.**
Findings #5 and #6 describe the same missing piece from two angles: #5
is "there's no server object for the whole attempt," #6 zooms in on just
the timing slice of that same object. Once `startedAt`/`expiresAt` exist
as real, server-owned fields on a real server-owned object, and grading
is required to go through that object, "the backend independently
enforces quiz started at X / expires at Y" is exactly what's left.
Concretely, in `quizAttemptController.js`:

- **"quiz started at X"** — `startOrResumeAttempt`:
  `const startedAt = new Date();` — the server's own clock, at the
  moment the attempt is created. `req.body` for this endpoint is only
  ever read for `categoryId` and `difficulty` (see `validateAnswersShape`
  and the destructure at the top of the function) — there is no field
  anywhere in its contract for a client to supply a start time, forged
  or otherwise.
- **"quiz expires at Y"** — same function,
  `const expiresAt = new Date(startedAt.getTime() + durationSeconds * 1000);`,
  where `durationSeconds` comes from this file's own `TIME_LIMIT_SECONDS`
  table (Hard: 10 minutes, matching the finding's own "nominal 10-minute"
  phrasing) — never from the client.
- **Independently enforced, not just recorded** — `submitAttempt`
  re-checks `Date.now() > attempt.expiresAt.getTime() + SUBMISSION_GRACE_SECONDS * 1000`
  against the value stored on the attempt at creation, on every
  submission, regardless of what any client claims, sends, or omits.
  This is what actually answers "can a user stop the timer, alter
  JavaScript, or bypass the frontend and call the API directly" — yes,
  they can do all three, and it doesn't matter: the frontend's countdown
  is now purely a display, seeded from the server's `expiresAt` but
  never consulted by grading.

**Freshly verified specifically for this finding** (beyond what the
verification section above already covered), by calling the actual
shipped `submitAttempt`/`startOrResumeAttempt` functions directly —
not a reimplementation — with Mongoose's model statics stubbed (no live
MongoDB in this environment) so the real controller logic runs
end-to-end:

- A direct call to `submitAttempt` (simulating "bypass the frontend and
  call the API directly," with no timer-related field anywhere in the
  request) for an attempt whose stored `expiresAt` was 10 minutes in the
  past — well outside the 60s grace — was rejected with `400` /
  `ATTEMPT_EXPIRED`, and neither `Question.find` (grading) nor
  `Result.create` was ever invoked. Stubbed to throw if called, to catch
  any accidental fallthrough; neither did.
- A direct call to `startOrResumeAttempt` with a request body forging
  `startedAt: '1900-01-01...'`, `expiresAt: '3000-01-01...'`,
  `durationSeconds: 999999999`, and `timeTaken: 0` alongside a normal
  `categoryId`/`difficulty` — the resulting `QuizAttempt.create(...)`
  call was inspected directly, and its `startedAt`/`expiresAt` were the
  real server clock and a normal ~10-minute window, with zero influence
  from any of the forged fields.
- A positive control — a submission comfortably inside the real deadline
  — still graded and returned `201` normally, confirming the rejection
  above is specifically deadline-driven, not a blanket failure.

**What this doesn't change:** the frontend's `useCountdown`-driven
display is still exactly that — a countdown UI, unchanged by this
addendum, that exists for the student's benefit. It was never the
enforcement mechanism even before this note; this addendum just makes
that explicit and demonstrates it directly, since finding #6 raised it
as a distinct, separately-numbered concern.
