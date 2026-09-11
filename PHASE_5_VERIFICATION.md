# Phase 5 — Verification Notes

Covers `certificateController.js`, `certificateRoutes.js`, the `server.js`
wiring, and the frontend half: `AuthContext.jsx`, `ProtectedRoute.jsx`,
`Login.jsx`, `Register.jsx`, `Auth.css`, the new `services/api.js`
interceptor, and the updated `App.jsx`, `index.css`, `index.html`.

## What was checked in this sandbox (stricter than Phase 3/4 — zero network)

- **Syntax, backend:** `node --check` on every new/changed `.js` file
  (`certificateController.js`, `certificateRoutes.js`, `server.js`,
  `services/api.js`) — clean.
- **Syntax, frontend:** every new/changed `.jsx` file
  (`App.jsx`, `AuthContext.jsx`, `ProtectedRoute.jsx`, `Login.jsx`,
  `Register.jsx`) run through
  `tsc --noEmit --jsx react-jsx --allowJs --noResolve --skipLibCheck` —
  TypeScript's own parser with module resolution turned off, which
  catches real syntax errors (an unclosed tag, a stray brace) without
  needing `react`, `react-router-dom`, or any other package actually
  installed. All clean.
- **CSS:** a brace-balance check on `index.css` (6/6) and `Auth.css`
  (13/13), plus a manual read-through against the token list.
- **HTML:** confirmed the new font `<link>` tags in `index.html` don't
  disturb the existing favicon link or the
  `<script type="module" src="/src/main.jsx">` entry point.
- **Manual pattern review:** every new backend function checked line by
  line against the equivalent already-working Phase 3/4 code — same error
  shape (`new Error(...)`, `err.status`, `next(err)`), same
  `assertDbReady()` placement (after non-DB validation, before the first
  query), same owner-or-admin permission shape as
  `resultController.js`'s `assertCanViewResult`, same duplicate-key race
  handling as `authController.js`'s `register()`.

**Not verifiable here at all:** this sandbox has no network access —
not `npm install`, not even a bare `require('mongoose')` from a throwaway
script, which is what Phase 3/4's own notes describe using for their
mocked-controller tests. So beyond plain syntax checking, nothing in this
phase was actually *executed* — no live MongoDB, no running Vite dev
server, no browser. Everything is implemented per the same patterns as
the working Phase 2–4 code and reviewed by hand, but only confirmed
correct once you try it for real. The Postman list below and the
README's "Trying the auth flow in a browser" walkthrough are for that.

## Postman / Thunder Client verification list — certificates

Prerequisite: log in as `customer@itquiz.test` / `customer123` (seeded)
and submit a quiz (`POST /api/results`) to get a **passing** result —
this endpoint refuses non-passing ones by design. Register a second
customer account too, for the wrong-owner case.

| # | Method & URL | Auth | Expect |
|---|---|---|---|
| 1 | `POST /api/certificates/result/<passingResultId>` | owning customer's token | `200`, `certificate.certificateNumber` starts with `ITQ-<currentYear>-` |
| 2 | Repeat #1, same `resultId` | same token | `200`, **same** `certificate._id` and `certificateNumber` as #1 — a fetch, not a second create |
| 3 | `POST /api/certificates/result/<aFailingResultId>` | owning customer's token | `400` "can only be generated for a passing result" |
| 4 | `POST /api/certificates/result/<passingResultId>` | a **different** customer's token | `403` |
| 5 | `POST /api/certificates/result/<passingResultId>` | admin token | `200` — admin can access anyone's |
| 6 | `POST /api/certificates/result/<passingResultId>` | no token | `401` |
| 7 | `POST /api/certificates/result/not-a-real-id` | any logged-in token | `400` "Invalid result id" |
| 8 | `POST /api/certificates/result/507f1f77bcf86cd799439011` (well-formed, nonexistent) | any logged-in token | `404` "Result not found" |

If 1–8 all match, Phase 5's backend half is good to hand off to Phase 6.

## Design decisions made where coding-phases.md's Phase 5 section was silent

1. **Certificate number format** — `ITQ-<year>-<resultId in caps>`, e.g.
   `ITQ-2026-507F1F77BCF86CD799439011`. `Certificate.js` only types
   `certificateNumber` as a plain unique `String`; nothing in `context.md`
   or `coding-phases.md` specifies an actual format. Built from the
   Result's own id specifically so uniqueness comes from construction,
   not chance or a counter collection that doesn't exist anywhere else in
   this schema.
2. **Certificates are Pass-only.** A request against a Fail result is a
   `400`, not a `404` or a silently-empty body — the result exists, it's
   just not certifiable.
3. **Both the create and fetch branches return `200`**, not `201` on
   first creation — the endpoint is deliberately idempotent (get-or-create,
   per the phase spec's own wording), and nothing asks for a status-code
   distinction between the two outcomes.
4. **Ownership check mirrors `resultController.js`'s `assertCanViewResult`
   exactly** (owner-or-admin) instead of introducing a new rule — a
   certificate is a view over a `Result`, so it inherits that `Result`'s
   access rule rather than getting its own.
5. **`downloadStatus` never transitions to `'Downloaded'` in this phase.**
   No route calls for it — that belongs with the actual print button in
   Phase 6's `Certificate.jsx`. Flagging so that session doesn't have to
   guess whether this was missed or deliberate.
6. **`AuthContext` re-verifies a stored token against `GET /api/auth/me`
   on every mount**, rather than trusting `localStorage` as-is. This
   upgrades that route from a Phase 2 debug-only endpoint to something the
   real app now depends on — worth remembering if Phase 10's cleanup pass
   ever considers removing it.
7. **An Axios request interceptor was added to `services/api.js`**,
   attaching `Authorization: Bearer <token>` (read from `localStorage`) to
   every outgoing request. Not explicitly asked for, but without it every
   future authenticated call — Phase 6's result history, Phase 7/8's
   question management — would need to attach that header by hand, every
   time. Centralizing it once in the file already responsible for the
   shared Axios instance seemed like the obvious place, not scope creep.
   - Deliberately **not** added: a response interceptor that auto-logs-out
     on a `401`. Considered, but cleanly syncing that back into
     `AuthContext`'s React state (rather than just clearing `localStorage`
     out from under a `loading: false, isAuthenticated: true` state that
     wouldn't otherwise know anything changed) is more plumbing than this
     phase's "two smaller, independent pieces" framing covers. Reasonable
     candidate for a later phase.
8. **Post-login redirect targets** are a hardcoded role→path map
   (`admin → /admin`, `supplier → /supplier`, `customer → /customer`) in
   `Login.jsx`, pointing at Phase 0's existing placeholder routes. Not
   specified anywhere. Should still be correct once Phase 6/7/8 build real
   content behind those same top-level paths, but worth a second look then
   if any of them move to a nested structure (e.g. `/customer/dashboard`).
9. **`ProtectedRoute` sends a wrong-role authenticated user to `/`
   (Home)** rather than a dedicated "Access Denied" page — no such page
   exists in any phase spec so far, so this is the safest default until
   one does.
10. **`ProtectedRoute` supports both a `children`-wrapping usage** (what
    `App.jsx` uses today for its three flat placeholder routes) **and a
    layout-route `<Outlet />` usage** (for when Phase 6/7/8 add real
    nested routes under `/customer/*`, `/admin/*`, `/supplier/*`). Added
    because that need is near-certain in the very next three phases, not
    speculative gold-plating.
11. **Register page has no role selector; always sends `role: 'customer'`
    explicitly** in the request body — matches `context.md`'s "Student
    Register" framing exactly, and `authController.js`'s own comment that
    the frontend register page was always expected to do this. Admin and
    supplier accounts still only come from seeding or direct DB access.
12. **First app-wide design tokens went into `frontend/src/index.css`** —
    brand indigo `#5a42e8` for `context.md`'s "indigo/purple" CTA
    requirement, Space Grotesk (headings) + Manrope (body/UI) as the type
    pairing, a two-tier corner-radius scale (20px cards / 10px controls),
    and a brand-tinted rather than neutral-grey card shadow. Nothing
    before this phase had made any color/type decision — first real UI
    phase, so these are now the shared defaults for Phase 6–10 to reuse
    instead of each inventing its own.
13. **Login page's "switch to Register" copy is inferred, not specified.**
    `context.md` Section 2 only gives exact copy for the Register→Login
    direction ("Already have an account? Login here"). The reverse
    ("Don't have an account? Register here") on the Login page follows the
    same phrasing pattern but isn't from the reference video.

## Frontend manual walkthrough

Not repeated here — see the README's new "Trying the auth flow in a
browser" section for the full step-by-step (register, refresh-persists-
session, logout, role-gated redirect, duplicate-email error).
