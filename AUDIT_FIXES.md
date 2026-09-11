# Post-Phase-3 Audit — Fix Log

Response to the independent audit of everything through Phase 3 (findings
F1–F12, MEDIUM/LOW/INFORMATIONAL). Same spirit as `PHASE_3_VERIFICATION.md`:
say what changed, say what didn't and why, and back live-behavior claims
with an actual re-runnable check rather than static reading alone.

`context.md` and `coding-phases.md` aren't part of this zip (per the
README, they're kept alongside it, not inside it), so the one decision
this pass couldn't make on its own (F2, below) is recorded here instead.
If you keep a locked-decisions list in `coding-phases.md`, mirror whatever
you decide for F2 there too, the same way Phase 1 and Phase 2's decisions
were folded back into this project's own docs.

## Fixed

**F1 — README status section was stale.**
Updated the `## Status` header, its bullet list, the "everything else"
sentence, and the "what's intentionally missing" list to reflect that
Phase 3's category/question APIs are done. Added a one-line pointer from
Status to `PHASE_3_VERIFICATION.md` so this doesn't drift again next
phase.

**F3 — Inconsistent `trim` on the Question schema.**
`option_a`–`option_d` in `backend/models/Question.js` now have
`trim: true`, matching `question`. This was already compensated for in
`questionController.js` (both `createQuestion` and `updateQuestion` call
`String(x).trim()` before writing), so behavior through the existing API
is unchanged — this only backstops any future direct-DB write path
(`seed.js`, a script, a different controller) that skips the controller's
manual trim.

**F7 — No security-headers middleware.**
Added `helmet` (^8.3.0) and wired it in `server.js`, plus an explicit
`app.disable('x-powered-by')`. Verified live (see below) that this adds
the intended headers and removes `X-Powered-By`, without changing any
existing response's status code or body, and without breaking the
frontend's cross-origin access to the API — helmet's default
`Cross-Origin-Resource-Policy: same-origin` only blocks *no-cors*
cross-origin loads (e.g. a bare `<img src>`); it doesn't affect the
CORS-mode requests the frontend's Axios instance makes, which are still
governed entirely by the existing `ALLOWED_ORIGINS` allow-list in
`server.js`.

**F8 — No startup validation of required environment variables.**
`server.js` now exits with code `1` and a clear console message if
`JWT_SECRET` is unset, checked immediately after `dotenv.config()` and
before anything else runs. Deliberately scoped to just `JWT_SECRET`:
that's the one variable with no fallback anywhere it's used
(`authController.generateToken`, `authMiddleware.protect`) and no safe
degraded mode. `MONGO_URI` was **not** added to this check — Phase 0's
non-fatal-DB-connection behavior (`config/db.js`, and the README's own
"the server itself still boots... without one") is an existing, working,
locked design choice, not something this pass should override.

## Documented, deliberately left unchanged

**F5 — DB-down responses collapse every protected-route error to a
generic 503.** No code change, matching the audit's own recommendation —
fixing this for real means restructuring `protect` to not require a DB
call for token-shape validation, which trades away the immediate-
revocation property (a deleted account or role change staying valid
until token expiry) and is a real design conversation, not a quick patch.
Added a comment in `authMiddleware.js` at the `assertDbReady()` call
documenting this explicitly, so a future phase-session reads it as
audited/intentional rather than rediscovering it as a bug.

**F4 — Password policy enforced only in application code, not the
schema.** Left as-is, and specifically *not* implemented as
`minlength: 8` on `User.js`'s `password` field, because that would be
wrong, not just unnecessary: by the time Mongoose validates that field,
it always holds the bcrypt **hash** (`register()` and `seed.js` both hash
before calling `User.create`/`bcrypt.hash`), and a bcrypt hash is always
60 characters — so a schema `minlength` there would validate the hash's
length, not the original password's, and would pass every time
regardless of what the user typed. It would look like enforcement and do
nothing. The real protection is `MIN_PASSWORD_LENGTH` in
`authController.js`, applied to the plaintext before hashing — correctly
identified by the audit as fine today because only `register()` and
`seed.js` create users. If a second user-creation path is ever added, the
correct fix is to reuse that same constant/check, not to add a schema
rule that can't see the plaintext.

**F6 — No rate limiting on auth endpoints.** Already an accepted,
disclosed design choice (README's "what's intentionally missing"). No
change.

**F9 — README's dotenv supply-chain note.** Nothing to fix — this was a
confirmation, not a problem. Re-confirmed the pin is still effective
after this pass: `backend/package.json` still pins `dotenv` at `^16.6.1`
after installing `helmet` (`npm install` only touched `helmet` and its
own transitive deps in `package-lock.json`).

**F10 — Zero automated test coverage.** Confirmed still accurate; left
alone. The audit itself frames this as expected at this stage, not a
defect, and standing up Jest/Supertest for the backend API is a
meaningfully separate task from an audit-fix pass — happy to do that next
if you want it.

**F11 — No Git repository.** Confirmed still accurate; left alone since
it's a workflow choice, not a code change, and not something this pass
should decide unilaterally. Straightforward to set up whenever you want
it — say the word and I'll `git init` the project with an initial commit
at this state.

**F12 — No CI/CD, Docker, or deployment configuration.** N/A, unchanged —
no build-phase has called for one yet.

**F2 — Unrestricted self-service supplier registration.** Fixed.
Resolved by asking directly in chat rather than defaulting, per this
entry's original note. The answer given wasn't any of the 3 options
listed below verbatim — it's closest to a stricter version of "keep
public registration simple," but closing the actual privilege-escalation
gap rather than leaving it as option 1 would have:

- `PUBLIC_REGISTRATION_ROLES` in `authController.js` is now `['customer']`
  only (previously `['supplier', 'customer']`). `POST /api/auth/register`
  with `role: "supplier"` now gets a 400 — self-escalation to a
  privileged role through the open registration route is closed.
- Supplier accounts are now created by an admin instead, through a new
  `POST /api/users` (`userController.js`'s `createSupplier`,
  `restrictTo('admin')`) — the "no admin-user-management endpoints exist
  yet at all" gap this entry originally flagged as the real cost behind
  every option, options 1–3 included.
- `/admin/suppliers` (`ManageSuppliers.jsx`) grew a create form wired to
  that endpoint, since without one there'd be no UI path left to create a
  supplier at all — this page previously only needed list + remove because
  self-registration handled creation.

Options 2 (approval-gated self-registration) and 3 (invite-gated
self-registration) from the original 3 below are now superseded, not
selected — registration doesn't accept `role: "supplier"` at all anymore,
so there's nothing left for either an approval flag or an invite check to
gate. Recorded here in case a future phase wants self-service supplier
signup back for a different reason (e.g. scale); if so, re-open this as a
new decision rather than assuming either option still applies unmodified
on top of the current closed-registration baseline.

The 3 options as originally written, for that record:

1. **Keep it as-is.** Anyone can `POST /api/auth/register` with
   `role: "supplier"` and immediately create/edit quiz questions. Zero
   code change — just an explicit, recorded decision instead of an
   unexamined default.
2. **Gate new suppliers behind admin approval.** Self-registration stays
   open, but a new supplier account can't create/edit questions until an
   admin approves it. Needs: an `isApproved` (or similar) field on
   `User`, a check on the question-write routes, and a new admin-only
   endpoint to list/approve pending suppliers.
3. **Gate registration behind an invitation.** Nobody can register as
   `role: "supplier"` without a valid invite (code or token issued by an
   admin). Needs: an invite model or a simple issued-code mechanism, an
   admin-only endpoint to create invites, and a check in `register()`.
   More moving parts than (2) for the same underlying goal.

## Open — needs a decision from you

None currently — F2 above was the only entry in this section, and it's
now resolved.

## Verification performed

- `node --check` on every file touched (`server.js`, `models/Question.js`,
  `middleware/authMiddleware.js`) — clean.
- Booted the server with `JWT_SECRET` unset → exits immediately with code
  `1` and the intended message, before attempting a DB connection.
- Booted the server with `JWT_SECRET` set and no `MONGO_URI` (matching
  Phase 0's documented non-fatal-DB scenario) → boots normally, same
  "Continuing without a database connection" log as before.
- `GET /api/health` → `200`; response headers confirmed `X-Powered-By` is
  gone and helmet's headers (`Content-Security-Policy`,
  `Cross-Origin-Resource-Policy`, `X-Content-Type-Options`,
  `X-Frame-Options`, `Strict-Transport-Security`, etc.) are present.
- `GET /api/categories` with `Origin: http://localhost:5173` (the Vite
  dev server) → still `Access-Control-Allow-Origin: http://localhost:5173`
  in the response alongside the new helmet headers — confirms helmet
  doesn't interfere with the existing CORS allow-list.
- `GET /api/categories` with the DB down → still `503` with the exact
  same message as before (F5 unchanged, confirmed live, not just by
  reading the code).
- `POST /api/auth/register` with an empty body → still `400 Name, email,
  and password are required` — confirms the new boot check and helmet
  don't touch pre-DB validation ordering.
- Confirmed `dotenv` is still pinned to `^16.6.1` in `package.json` after
  `npm install helmet`.

## Addendum — later finding, outside the original F1–F12 audit

**Unrestricted quiz-result submission.** Fixed. Flagged in a later review
pass, alongside F2 above (both concerned the same underlying gap: which
roles can reach a route without a `restrictTo` check) but not one of the
original audit's F1–F12 findings, so it's recorded here rather than given
an F-number that would misattribute it to that audit.

`POST /api/results` (`resultRoutes.js`) accepted any authenticated role,
not just `restrictTo('customer')` — `createResult`'s own prior comment in
`resultController.js` said this was intentional, reasoning by analogy to
`getRandomQuestions` in `questionController.js` ("any logged-in role can
preview a question set, so any logged-in role submitting a result is the
same kind of permissiveness"). That analogy doesn't hold: unlike
previewing questions, submitting a result *persists* a graded, ownership-
bearing record, and `certificateController.js`'s `assertCanAccessResult`
had already separately documented the consequence — a `Result` with
`status: 'Pass'` is exactly what that controller turns into a
`Certificate`. An admin or supplier hitting this route unrestricted could
manufacture a passing result and mint themselves a certificate without
ever taking the quiz.

`resultRoutes.js`'s `POST /` now runs `restrictTo('customer')` after
`protect`, matching the `restrictTo('admin')` already used a few lines
above it on `GET /`. `createResult`'s comment in `resultController.js`
and `assertCanAccessResult`'s comment in `certificateController.js` were
both updated — the latter no longer claims to mirror `createResult`'s
former permissiveness, since that permissiveness is what this fix removed;
its own continued owner-or-admin check is now justified on its own terms
(pre-fix rows, and a account's role changing after a result was earned)
rather than by pointing at a rule that no longer exists.

## Addendum 2 — findings #3/#4, outside the original F1–F12 audit

Both concern the same function, `createResult` in `resultController.js`,
and both are fixed by the same change, so they're written up together.

**#3 — Result submissions were accepted with fewer than the required
number of quiz answers.** Fixed. `validateAnswersShape` only checked
`answers.length` against a 1-to-10 range (non-empty, no more than
`QUESTIONS_PER_QUIZ`) — not an exact count. Grading is
`score / submittedAnswers.length`, so a submission containing a single
known-correct answer graded as `1/1 = 100%`: a full pass without
attempting the other questions.

`createResult` now fetches the live set of Questions matching the
request's `categoryId`+`difficulty` (`poolQuestions` — the same `$match`
`getRandomQuestions` in `questionController.js` already uses) and
requires `answers.length` to equal `Math.min(poolQuestions.length,
QUESTIONS_PER_QUIZ)` exactly. Deliberately not a hardcoded `10`:
`getRandomQuestions` already gracefully serves fewer than 10 questions
when a category+difficulty pool is smaller than that (seed data's
PHP/Medium and PHP/Hard pools each have just 1 question — confirmed live
in `PHASE_3_VERIFICATION.md` #17), so a blanket "exactly 10" would have
made those genuinely-smaller quizzes impossible to submit at all, not
just closed the exploit. The 1-to-10 range in `validateAnswersShape`
(and the matching schema-level validator in `Result.js`) stays as a
cheap pre-DB/backstop upper bound — the exact count isn't knowable until
the pool is fetched, so the real enforcement lives in `createResult`.

**#4 — Submitted questions weren't tied to the requested
category/difficulty.** Fixed. `createResult` previously only confirmed
submitted `questionId`s existed *somewhere* in the `Question` collection
(`Question.find({ _id: { $in: questionIds } })`), never that they
matched the request's own `categoryId`/`difficulty`. A client could claim
`category: PHP, difficulty: Easy` while submitting IDs for a
JavaScript/Hard question, and nothing would catch the mismatch before it
was persisted on the `Result`. This was a known, deliberately unpatched
gap — flagged in `createResult`'s own prior comment and in this
project's README (Phase 4 flagged decisions), pending a product decision
on reject-whole-submission vs. ignore-the-mismatched-question.

Decision made here: **reject the whole submission.** `poolQuestions` (the
same query #3 above already needs) is scoped to the request's own
`categoryId`+`difficulty`, so checking every submitted `questionId`
against that set closes both the "doesn't exist" case and the "exists
but wrong category/tier" case in one check — any `questionId` outside
the pool now fails with a `400` before any `Result` is written.
Silently dropping just the mismatched question instead was rejected:
that would shorten the quiz without telling the client and change what
`totalQuestions` means for that `Result` in a way nothing downstream
(grading, certificates, the "Detailed Answer Review" screen) expects.

The exact-count check (#3) runs before the membership check (#4) — an
answer count that's already wrong is reported as a count problem, not as
a confusing "questions don't belong here" error for what might just be
an incomplete submission.

### Verification performed (this addendum)

- `node --check` on `resultController.js` and `Result.js` — clean.
- No live MongoDB is available in this environment — same disclosed
  limitation as this file's original "Verification performed" section
  and the README's Phase 4 "Environment note" — so `createResult`
  couldn't be exercised end-to-end here. Verified instead with a
  standalone script reimplementing the exact count/membership logic
  against plain-object stand-ins for Mongoose documents (an `_id`/
  `category` with a `.toString()`, matching what a real query returns),
  covering: a 10-question pool with a matching 10-answer submission
  (accepted); a 15-question pool with a 10-answer submission (accepted —
  confirms pools larger than `QUESTIONS_PER_QUIZ` still cap at 10); a
  1-question pool with a 1-answer submission (accepted — the
  `PHASE_3_VERIFICATION.md` #17 small-pool case still works); a
  10-question pool with only 1 answer submitted (rejected — the exploit
  this fix closes); and a 10-question pool with 10 answers where one
  `questionId` belongs to a different category (rejected).
- Re-read `gradeQuiz` against the new call site: it only iterates the
  submitted `answers` array to build `gradedAnswers` (never
  `poolQuestions` directly), so passing the full pool — which can now be
  *larger* than what was submitted, when a pool exceeds
  `QUESTIONS_PER_QUIZ` — instead of the previously-submitted-only
  `questions` array doesn't change `score`, `totalQuestions`, or
  `percentage`.

## Addendum 3 — "a weak result can lead to a valid certificate", outside the original F1–F12 audit

**Certificate generation trusted a Result's stored `status` instead of
verifying it.** Fixed. Flagged in a later external review pass, not one of
the original F1–F12 findings, so recorded here rather than under an
F-number that would misattribute it.

`generateCertificate` (`certificateController.js`) has always correctly
rejected a non-passing `Result` (`result.status !== 'Pass'` → `400`,
unchanged by this fix — see `PHASE_5_VERIFICATION.md` case 3). What it
never did was confirm that a `status: 'Pass'` label was actually earned
by the Result's own graded data before turning it into a `Certificate`.
Every current path to creating a `Result` (`submitAttempt` in
`quizAttemptController.js`, via `gradeQuiz`) derives that label correctly
today, and the addenda above closed the specific ways it used to be
possible to manufacture a bad one — but `generateCertificate` itself had
no independent check of its own. It simply trusted whatever the `status`
field said. That's a single point of failure: any future regression in
`submitAttempt`/`gradeQuiz`, a direct DB write (a migration, a seed
script, an admin tool added later), or any other way a `Result`'s stored
score/status could stop agreeing with its own stored answers would sail
straight through and mint a fully legitimate-looking `Certificate` off a
fabricated `Pass` — exactly this project's own stated concern that "the
certificate is only as trustworthy as the result that produced it."

Fixed by adding `assertResultIntegrity` (`certificateController.js`),
called immediately after the existing `status !== 'Pass'` check and
before a `Certificate` is looked up or created. It recomputes
`score`/`totalQuestions`/`percentage`/`status` from the `Result`'s own
already-stored `answers[].isCorrect` array — using the exact same
`PASS_THRESHOLD` constant `gradeQuiz` uses (now exported from
`resultController.js` instead of being duplicated) — and compares every
recomputed field against what's actually stored on the document. Any
disagreement is logged server-side with the specific mismatch (for
whoever investigates) and rejected with a generic `409
RESULT_INTEGRITY_CHECK_FAILED` client-facing message that deliberately
doesn't say which field disagreed, so the check's own failure mode can't
be used as a map for how to construct a `Result` that slips past it.

**Deliberately does not re-fetch current `Question` documents and
re-grade against today's `correct_answer`.** `Result.js`'s own schema
comment already explains why `isCorrect` is stored rather than
recomputed on read: so a `Result` "stays accurate to what was actually
correct at attempt time, even if a Question's correct_answer is edited
later" — and `updateQuestion` (`questionController.js`) does let an
admin/supplier change `correct_answer` at any time, with no history
kept. Re-grading against live Questions here would have silently broken
that guarantee: a customer's legitimately-earned certificate could start
failing this check the day an unrelated question edit landed, through no
fault of the certificate or the customer. Checking the Result's
*internal consistency* — do its own stored fields actually follow from
its own stored answers? — catches a fabricated-or-corrupted `Pass`
without reopening that separate, intentional design decision.

### Verification performed (this addendum)

- `node --check` on `certificateController.js` and `resultController.js`
  — clean, along with every other `.js` file in `backend/` (confirms the
  new `require('./resultController')` in `certificateController.js`
  introduces no circular-import issue, since `resultController.js` has no
  reverse dependency on `certificateController.js`).
- No live MongoDB is available in this environment — same disclosed
  limitation as this file's original "Verification performed" section
  and Addendum 2's own note — so this was verified with a standalone
  script that requires the real, unmodified `resultController.js` and
  `certificateController.js` (proving `PASS_THRESHOLD` is actually
  exported/imported end-to-end, not just present in the source) and
  drives `generateCertificate`'s real `req`/`res`/`next` cycle with
  `Result.findById`/`Certificate.findOne`/`Certificate.create`/
  `assertDbReady` mocked out, covering:
  - a legitimate Pass (7/10 = 70%, stored fields all agree) → `200`,
    certificate returned — confirms the fix doesn't disturb the normal
    path;
  - a legitimate Fail (3/10 = 30%) → `400` "can only be generated for a
    passing result", same as before this fix — confirms the existing
    `status !== 'Pass'` gate is untouched and still runs first;
  - a fabricated Pass (`status: 'Pass'`, `score: 10`, `percentage: 100`,
    but stored `answers` only support 2/10 = 20%) → **`409
    RESULT_INTEGRITY_CHECK_FAILED`**, `res.json` never called — this is
    the exploit scenario the fix closes;
  - a legitimate Pass at exactly the 60% boundary (6/10) → `200` —
    confirms the recomputation's inclusive threshold matches `gradeQuiz`
    exactly, with no off-by-one that would wrongly reject a genuine
    borderline pass;
  - a Result at 5/9 ≈ 55.6% (rounds to 56%, below threshold) with
    `status` manipulated to `'Pass'` anyway → `409` — confirms a
    disagreeing `status` field alone is caught;
  - a Result with internally-consistent `score`/`totalQuestions`/
    `answers` (7/10 = 70%) but a `percentage` field tampered to `99` in
    isolation → `409` — confirms every recomputed field is checked
    independently, not just `status`.
