# Phase 8 — Verification Notes

Covers all six deliverables: `SupplierLayout.jsx`, `StatusPill.jsx`,
`Supplier.css`, `DashboardOverview.jsx`, `MyQuestions.jsx`,
`AddQuestion.jsx`, and the `App.jsx` routing change. This supersedes the
earlier checkpoint note, which covered only the first three (layout +
shared styles) and explicitly deferred the rest.

## What was checked in this sandbox

No live MongoDB is available here (same limitation `PHASE_3_VERIFICATION.md`
and `PHASE_5_VERIFICATION.md` both note for their own phases), so the live
walkthrough in the build prompt's Section 8 — logging in as the seeded
supplier and reading real numbers off the screen — could not be run
end-to-end. What follows is everything that *could* be checked without
one, which is more than a syntax pass:

- **Structural fidelity against the admin originals**: `StatusPill.jsx`'s
  logic (everything past the header comment) is byte-identical to
  `components/admin/StatusPill.jsx`. `SupplierLayout.jsx` diffed against
  `AdminLayout.jsx` shows only the expected substitutions — import path,
  doc comment, component name, the narrowed 3-item `NAV_ITEMS`, and a
  clean `admin-*` → `supplier-*` rename on every class/id/aria-label pair.
- **`Supplier.css` rename correctness**: 75/75 classes renamed, 621/621
  lines preserved, 89/89 braces balanced, matching `Admin.css` exactly.
  `.btn`, `.card`, `.status-pill`, `.empty-state` left unprefixed, per
  spec.
- **Field-name contract cross-check**: grepped `backend/models/Question.js`
  for its actual schema field names (`category`, `createdBy`, `question`,
  `option_a/b/c/d`, `correct_answer` with enum `['A','B','C','D']`,
  `difficulty` with enum `['Easy','Medium','Hard']`) and diffed that
  against every `form.*`/`q.*` field access across the three new pages —
  exact match, no typos, no stray field names. Also grepped both
  `DashboardOverview.jsx` and `MyQuestions.jsx` for the ownership-filter
  expression itself: both use `q.createdBy?._id === user.id` verbatim,
  matching the build prompt's literal wording.
- **CSS class-existence cross-check**: extracted every distinct
  `className` string used across the three new pages (21 distinct
  classes/modifiers, including all four `.btn--*` variants, `.card`,
  `.empty-state`, and every `.supplier-*` class) and confirmed each has
  at least one matching rule actually defined in `Supplier.css`. This is
  the kind of mismatch neither a linter nor a JS bundler catches — an
  unstyled button from a typo'd class name would otherwise only surface
  by eyeballing it in a browser, which this sandbox doesn't have.
- **Lint**: `npx oxlint` across the whole project — 32 files scanned (up
  from 29 at the checkpoint, confirming the three new page files are
  being linted too), 0 errors. Same single pre-existing warning as
  before (`AuthContext.jsx`'s `react/only-export-components`), untouched
  by this phase.
- **Build**: `npm run build` (vite) — clean, 116 modules (up from 110),
  no errors. Unlike the checkpoint's build pass, this one is a real test
  of the new files: `App.jsx` now actually imports all five new
  JS/JSX files and (transitively, via `SupplierLayout.jsx`) `Supplier.css`
  itself, so Vite genuinely parsed and bundled all of it this time — the
  CSS output grew from 22.38 kB to 28.80 kB, consistent with
  `Supplier.css`'s rules actually being compiled in rather than sitting
  unreferenced.
- **Backend boot-check**, re-run after all changes: identical results to
  the checkpoint — `GET /api/health` → `200`, `GET /api/categories` (no
  DB) → `503`, `GET /api/questions/category/:id` (no token) → `401`.
  Confirms zero regressions from a phase that touches no backend files.
- **`App.jsx` diff review**: the new `/supplier` route tree matches
  Section 6's given snippet verbatim. The comment above `Home()` — which
  previously described *both* Home and Supplier as unbuilt — is corrected
  to describe only Home as pending (Phase 9), since it would otherwise be
  actively wrong the moment this phase lands. The `Supplier()` placeholder
  function is fully removed, along with its only usage.

## Build prompt's Section 8 checklist, mapped to what's actually verifiable here

1. **Both dev servers start cleanly** — verified via the build-equivalent
   checks above (`npm run build` + `oxlint` for frontend; a direct
   `node server.js` boot + curl for backend) rather than leaving
   `npm run dev` running, since this is a non-interactive sandbox. Same
   substitution `PHASE_3_VERIFICATION.md` uses for its own backend check.
2. **Login as seeded supplier; dashboard/My Questions/filters/add/edit/
   delete/logout all correct** — **not verifiable here** (no live DB).
   Precomputed the expected numbers from `seed.js` directly instead, so
   there's a concrete expectation to check against the first time this
   runs somewhere with a real MongoDB connection (see below).
3. **Customer/admin blocked from `/supplier/*`** — code-reviewed, not
   re-run: `ProtectedRoute.jsx` is untouched, and its redirect-to-`/` on
   role mismatch applies to `/supplier/*` exactly as it already does to
   `/admin/*` and `/customer/*` — nothing about how this phase wires the
   route changes that shared component's behavior.
4. **Responsive breakpoint (~860px) collapses to hamburger/drawer** —
   code-reviewed: `Supplier.css`'s mobile media queries are the same
   breakpoint values as `Admin.css`'s, byte-for-byte (mechanical rename,
   not a rewrite), so whatever Admin's sidebar already does at that
   width, Supplier's reproduces identically. Not visually re-verified —
   no browser in this sandbox.
5. **Empty-state paths render correctly** — code-reviewed and traced
   logically rather than click-tested: My Questions' "filtered to
   nothing" branch and Add Question's "zero categories" branch are both
   gated on the right conditions (see the "Design decisions" section
   below for one related edge case worth knowing about).

## Expected numbers, precomputed from `seed.js`, for the first live check

The seeded supplier (`supplier@itquiz.test` / `supplier123`) is attached
as `createdBy` on **every** seeded question, not only the PHP ones — so
the first live check should see:

| Stat | Expected value |
|---|---|
| Questions Submitted | 17 (12 PHP + 5 JavaScript) |
| Categories Contributed To | 2 (PHP, JavaScript) |
| Easy | 12 |
| Medium | 3 |
| Hard | 2 |

Per-category breakdown, for cross-checking the Category filter on My
Questions: PHP = 10 Easy / 1 Medium / 1 Hard (12 total); JavaScript =
2 Easy / 2 Medium / 1 Hard (5 total). Filtering My Questions to any
category/difficulty combination genuinely absent from that breakdown
(e.g. PHP + Hard shows exactly 1, so try something like JavaScript
narrowed further by a category that has none) is what should trigger the
empty-state path in Section 8 item 5.

## Design decisions made where the build prompt was silent or ambiguous

1. **Stat card count.** The build prompt frames this as "2 or 4, use your
   judgment," but a literal Easy/Medium/Hard breakdown doesn't split
   evenly across exactly one extra card (2→4 skips 3). Went with a third
   card — "By Difficulty" — holding all three counts together via
   `StatusPill` rather than forcing them into a 4th slot or merging two
   tiers arbitrarily. Every difficulty value stays visible without
   inventing a merge that has no precedent elsewhere in this codebase
   (difficulty is always treated as three independent values, never
   combined).
2. **Splice, not refetch, after Edit in My Questions.** Admin's
   `ManageQuestions.jsx` refetches after every edit specifically because
   its create/update responses aren't populated with `createdBy`, and its
   table needs to display that field. My Questions never displays
   `createdBy` at all (every row is already this supplier's own by
   construction), so that reason doesn't apply — the PUT response is
   spliced directly into local state (with `categoryName` re-derived from
   the already-loaded categories list), avoiding a full re-fetch of every
   category for a single-row change.
3. **Category preserved across Add Question's post-submit reset.** "Clear
   the form" is the literal instruction, but resetting the category back
   to whatever's alphabetically first would fight against the very
   workflow the build prompt calls out as the reason to reset-in-place at
   all — adding several questions to the same category in a row. Question
   text, all four options, correct answer, and difficulty all reset to
   their defaults; only the category carries over.
4. **Unified empty-state copy.** My Questions shows the same "No questions
   yet" + Add Question CTA whether the supplier truly has zero questions
   or just zero matching the current filter — the build prompt's own
   phrasing ("if this supplier has none in the selected filter") doesn't
   ask for differentiated copy between those two cases, so neither was
   invented.
5. **No create-mode toggle on My Questions.** Section 5 splits creation
   (Add Question, its own nav item/page) from editing (My Questions,
   inline toggle form) cleanly enough that My Questions only ever needs
   an edit form, never a "+ Add Question" button of its own.
6. **One known edge case, left matching admin's own precedent rather than
   hardened further:** if the categories fetch on My Questions succeeds
   but a per-category questions fetch then fails, the Category/Difficulty
   filter bar can still render (since `categories` state is already set)
   alongside the error banner, with no table or empty-state below it.
   Admin's own `ManageQuestions.jsx` has the same characteristic (its
   filter bar is gated on `categories.length > 0` without also checking
   `questionsError`) — this mirrors that rather than fixing something the
   reference implementation doesn't fix either.
7. **Recent Questions rows are plain (non-link) rows,** matching admin's
   `DashboardOverview.jsx` precedent rather than customer's `Dashboard.jsx`
   (whose rows link to a per-result detail page) — there's no equivalent
   per-question detail page for suppliers to link to.

## Known limitations of this verification pass

- No live MongoDB, so the actual data-bearing half of Section 8 (item 2,
  and the visual half of item 5) needs to run once against a real DB
  connection — the precomputed numbers above are there for exactly that
  first run.
- No real browser, so the responsive check (item 4) is code-reviewed
  against `Admin.css`'s already-shipped behavior rather than
  screenshot-verified.
