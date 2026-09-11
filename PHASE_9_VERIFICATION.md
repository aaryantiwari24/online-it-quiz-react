# Phase 9 — Verification Notes

Covers `frontend/src/pages/Home.jsx`, `frontend/src/pages/Home.css`,
`backend/controllers/statsController.js`, `backend/routes/statsRoutes.js`,
and the `App.jsx`/`server.js` wiring for both. (`statsController.js` and
`statsRoutes.js` actually shipped a phase early, in Phase 7, to back the
admin dashboard's own stat cards — see that file's own header comment.
Nothing new on the backend this phase; Phase 9 is the second consumer of
an endpoint that already existed.)

## What was checked in this sandbox (no live MongoDB, no real browser)

Same two limitations every prior verification doc in this repo notes for
itself — this phase adds one more kind of check to the pile rather than
working around them:

- **Lint**: `npx oxlint` across the whole project — 33 files scanned (up
  from 32 at Phase 8, the one new file being `Home.jsx` itself), 0
  errors. Same single pre-existing warning as every phase since it first
  appeared (`AuthContext.jsx`'s `react/only-export-components`), untouched
  by this phase.
- **Build**: `npm run build` (vite) — clean, 118 modules (up from 116 at
  Phase 8), no errors. CSS output grew from 28.80 kB to 36.90 kB,
  consistent with `Home.css`'s 701 lines actually being compiled in
  rather than sitting unreferenced.
- **Syntax**: `tsc --noEmit --jsx react-jsx --allowJs --noResolve
  --skipLibCheck` on `Home.jsx` (same TypeScript-parser-only method
  `PHASE_5_VERIFICATION.md` introduced) — clean. `node --check` on every
  backend `.js` file, including `statsController.js` — clean.
- **Field-name cross-check**: extracted every `cat.*` field access in
  `CategoriesSection` (`cat._id`, `cat.category_name`, `cat.description`)
  and diffed against `backend/models/Category.js`'s actual schema —
  exact match. Did the same for `StatsSection`'s `stats.*` accesses
  (`liveQuestions`, `quizzesTaken`, `difficultyTiers`,
  `certificatesEarned`) against `statsController.js`'s response object —
  exact match, all four fields, no typos.
- **CSS class-existence cross-check**: extracted every `className` used
  in `Home.jsx` — 66 static strings plus two dynamic expressions
  (`` `home-nav-links ${menuOpen ? 'home-nav-links--open' : ''}` `` and
  `` `home-tier-badge home-tier-badge--${tier.tone}` ``, the latter
  resolved by hand across `tier.tone`'s three possible values from
  `DIFFICULTY_TIERS`) — 69 distinct classes in total. Every one has a
  matching rule in `Home.css`; zero mismatches. Checked the reverse
  direction too: the one class defined in `Home.css` but never used
  (`.btn--danger-ghost`) is called out by that file's own header comment
  as deliberately omitted, not a typo.
- **SSR render check** (new this phase — the first frontend page verified
  this way in this repo): wrote a standalone harness, outside the
  project tree, that boots Vite programmatically
  (`vite.createServer` + `ssrLoadModule`), aliases `../context/AuthContext`
  and `../services/api` to local mocks, loads the real unmodified
  `Home.jsx`, and calls `renderToStaticMarkup` on it wrapped in a
  `MemoryRouter` under four auth states: logged out, and logged in as
  each of customer/admin/supplier. All four rendered with zero exceptions.
  Also asserted, against the actual rendered HTML rather than by reading
  the source: the hero heading is present in every case; the shared
  "Register to Start" / "Go to Dashboard" CTA label switches correctly
  on `isAuthenticated`; and for each logged-in role, the dashboard link's
  `href` resolves to that role's real path (`/admin`, `/supplier`,
  `/customer`) — confirming `ROLE_HOME`'s mapping is reachable for all
  three roles, not just the customer path a less careful check might
  stop at.
  - **Honest limitation of this check**: `renderToStaticMarkup` is
    synchronous and returns before any `useEffect` fires, so what it
    actually captures is each page's *initial* render — before
    `GET /api/categories` and `GET /api/stats` resolve. Confirmed this
    directly rather than assuming it: all four scenarios show
    `categories loading-state shown: true` and
    `stats loading-state shown: true` in the harness output. That's a
    real, useful check (it proves the component tree, the `loading`/
    `error` branches, and every hook mount cleanly under React 19 with
    zero throws — something none of the static checks above touch at
    all) but it is not a check of the *resolved* categories grid or
    stats strip markup. That resolved-state markup is exactly what the
    field-name and CSS-class cross-checks above already verify by
    reading `CategoriesSection`/`StatsSection`'s actual map() logic
    directly, so the two checks together cover both halves without
    either one overclaiming what it proved on its own.
  - The harness itself was written to a scratch location outside
    `frontend/`, run, and then deleted — it is not part of this
    deliverable and leaves no trace in the zip.
- **Backend boot + curl**, re-run after confirming Phase 9 makes no
  backend changes: `GET /api/health` → `200`; `GET /api/categories` and
  `GET /api/stats` (both public, no DB) → `503` with the same
  `assertDbReady()` error body word-for-word
  (`"Service temporarily unavailable — database connection is down"`) —
  confirms both endpoints `Home.jsx` calls are wired and fail the same
  documented way, not silently 404ing; `GET /api/users` (admin-only, no
  token) → `401`; `GET /api/questions/category/x` (no token) → `401`,
  matching Phase 3's original result; unknown route → `404`. Identical
  shape to Phase 8's own re-run — zero regressions from a phase that
  touches no backend files.
- **`App.jsx`/`server.js` diff review**: `Home` now renders at `/`,
  replacing Phase 0's placeholder — the comment above it in `App.jsx`
  correctly attributes `/customer/*` to Phase 6, `/admin/*` to Phase 7,
  and `/supplier/*` to Phase 8, and no longer describes any of those as
  pending. `server.js`'s own comment on `/api/stats` correctly notes it
  was added in Phase 7 for the admin dashboard and is reused here rather
  than re-implemented.

**Not verifiable here at all**: the actual floating-card visual layout
(the hero's absolutely-positioned toast card overlapping the quiz card
on desktop — see `Home.css`'s `.home-hero-toast-card`, `position:
absolute; bottom: -18px`) needs a real browser to confirm it doesn't
clip or overlap awkwardly at in-between viewport widths; the mobile
hamburger's actual open/close *interaction* (as opposed to the
close-on-click logic, which was code-reviewed — see below); and the real
category/stat numbers once this runs against an actual seeded database
rather than the harness's canned values.

## Mobile hamburger — code-reviewed, not click-tested

No browser in this sandbox, so this is logical tracing rather than a
real click-through, same substitution `PHASE_8_VERIFICATION.md` used for
its own responsive check:

- Every link inside the collapsible `<nav className="home-nav-links">`
  (Explore, How it Works, Supplier, Admin, Log in, and the Log Out
  button) calls `closeMenu()` on click, so navigating from the open
  mobile menu should close it rather than leaving it stuck open behind
  the page that loads next.
- `.home-navbar-actions` — which holds the primary CTA and the toggle
  button itself — sits outside `.home-nav-links` in both the JSX and the
  CSS, so the primary CTA stays visible at every width instead of being
  hidden behind the hamburger (this is also one of the flagged design
  decisions below, not just an implementation detail).
- The toggle's own pattern (a boolean state flipped by the button,
  closed by every nav action) matches the equivalent logic in
  `AdminLayout.jsx`/`CustomerLayout.jsx`/`SupplierLayout.jsx`, just under
  different local names (`menuOpen`/`closeMenu` here vs.
  `drawerOpen`/`closeDrawer` there) — functionally consistent, though the
  naming isn't unified across all four files. Not a bug, just worth
  knowing if a future phase ever extracts a shared toggle hook.

## Design decisions flagged for you (footer scope, badge letters, mobile CTA, and the admin/supplier edge case)

1. **Footer is copyright-only.** `context.md`'s reference-video walkthrough
   never shows a footer at all (the recording didn't scroll that far, or
   the reference build didn't have one) — `Home.jsx`'s `Footer()` is a
   single centered `© {year} IT Quiz` line, not a multi-column
   sitemap/social-links footer. Deliberately minimal rather than
   inventing scope nothing in the spec asks for.
2. **Category badges are two-letter initials, not icons.** `context.md`'s
   Section 2 describes the reference video's four illustrative categories
   (Programming, Web Architecture, Database Systems, Cyber Security) as
   each having a hand-picked icon. The real database's categories are
   admin-created via `ManageCategories.jsx` with no icon field anywhere
   in the `Category` schema, so there's nothing to pick an icon from for
   a category that doesn't exist yet. `cat.category_name.slice(0,
   2).toUpperCase()` (→ "PH" for PHP, "JA" for JavaScript) was used
   instead — a generic, always-available substitute that needs no schema
   change and degrades gracefully for any future category name.
3. **Primary CTA stays outside the mobile nav collapse.** Confirmed above
   under the hamburger section — restating it here because it's a
   deliberate placement choice, not an oversight: on a marketing page,
   hiding "Register to Start" behind a hamburger tap on mobile would bury
   the one action the whole page exists to drive.
4. **Admin/supplier browsing the public homepage are funneled toward
   `/register`, same as a logged-out visitor**, when they click a
   category's "Start Quiz →" link. Only an authenticated `customer` gets
   routed to the real quiz picker (`/customer/quizzes`); everyone else —
   logged out, or logged in as `admin`/`supplier` — lands on the
   Register page, which would be a confusing dead end for an
   already-logged-in staff account (an admin doesn't need to "register,"
   and clicking through would either fail or create a redundant account
   depending on how `Register.jsx`'s own already-authenticated-redirect
   behaves — worth checking `Register.jsx` directly if this edge case
   ever needs a real fix). `Home.jsx`'s own comment on this treats it as
   a deliberate simplification for an edge case that barely matters in
   practice (admins/suppliers have no real reason to be browsing the
   public marketing page and clicking "Start Quiz" instead of just going
   to their own dashboard), flagged here rather than special-cased in
   code. If this ever needs tightening, the fix is narrow: branch
   `startQuizTarget` on `user?.role` the same way `primaryCtaTarget`
   already does via `ROLE_HOME`, rather than the current
   customer-or-bust check.
5. **Stats strip and admin dashboard intentionally show the same
   numbers.** Both call the exact same `GET /api/stats` endpoint with no
   parameters — not a coincidence to reconcile, but the point:
   `statsController.js`'s own header comment calls this out directly,
   and a discrepancy between the two pages would indicate a caching bug
   somewhere, not two different "views" of the data that are allowed to
   disagree.
6. **"Certificates Earned" counts passed `Result`s, not actual
   `Certificate` documents.** Carried over from Phase 7's own decision
   (see `statsController.js`), not something Phase 9 revisits — a
   `Certificate` row is only created lazily the first time a customer
   opens their certificate page, so counting the collection directly
   would under-report students who passed but never clicked through.
   Worth knowing if this number ever looks lower than expected against a
   real `Certificate.countDocuments()` — that's the passed-Results count
   being more honest about "earned," not a bug.
7. **`Home.css` duplicates its own `.btn`/`.card`/`.empty-state` block**
   rather than importing `Auth.css` or any dashboard's stylesheet — same
   self-containment approach every other page-level CSS file in this
   project already takes (`Auth.css`, `Admin.css`, `Customer.css`,
   `Supplier.css` each do the same). `.btn--danger-ghost` is the one
   variant left out, since nothing on a marketing page needs a
   destructive-action button style.

## Expected numbers, precomputed from `seed.js`, for the first live check

A fresh seed (`node scripts/seed.js`, no quizzes attempted yet) should
make the homepage's stats strip read:

| Stat | Expected value | Source |
|---|---|---|
| Live Questions | 17 | `Question.countDocuments()` — 12 PHP + 5 JavaScript, per `seed.js` |
| Quizzes Taken | 0 | `Result.countDocuments()` — no attempts on a fresh seed |
| Difficulty Tiers | 3 | fixed constant, not a DB count (Easy/Medium/Hard) |
| Certificates Earned | 0 | `Result.countDocuments({ status: 'Pass' })` — no attempts yet |

The "Explore IT Categories" section should show exactly 2 cards — PHP and
JavaScript, badges "PH" and "JA" — matching `seed.js`'s two seeded
categories, not the four illustrative ones named in `context.md`
(Programming/Web Architecture/Database Systems/Cyber Security never
existed in any real database, seeded or otherwise). Both numbers will
climb once quizzes are actually attempted through the running app —
these are the zero-state baseline to sanity-check against on the very
first load, the same way `PHASE_8_VERIFICATION.md`'s precomputed supplier
numbers were meant to be checked against the first live run there.

## Known limitations of this verification pass

- No live MongoDB, so the real (non-seed-baseline) category/stat numbers
  and the "Certificates Earned vs. actual Certificate collection" gap
  called out in design decision #6 can only be confirmed once this runs
  against a real, actively-used database.
- No real browser, so the floating hero cards' visual layout and the
  hamburger menu's actual tap-to-open/tap-to-close interaction are
  code-reviewed above, not screenshot- or click-verified.
- The SSR render check is a genuine executed test (not a static read-
  through) but is explicitly scoped to *initial-render* correctness
  across auth states, not resolved-data rendering — see the caveat
  under "SSR render check" above for exactly what it does and doesn't
  cover, and why the field-name/CSS-class cross-checks are what actually
  covers the resolved-state half.
