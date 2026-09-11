# Phase 3 — Verification Notes

Covers `categoryController.js`, `questionController.js`, `categoryRoutes.js`,
`questionRoutes.js`, and the `server.js` wiring added in this phase.

## What was checked in this sandbox (no live MongoDB available here)

- **Syntax**: `node --check` on all 5 new/changed files — clean.
- **Pre-DB validation logic**: every controller function was called directly
  with mock `req`/`res`/`next` objects, bypassing Express/Mongo entirely.
  All required-field, ObjectId-format, and enum checks (`correct_answer`,
  `difficulty`) returned the correct `400` + message.
- **Live server boot + routing**: started the server with no real
  `MONGO_URI` (matching Phase 0's "non-fatal DB connection" design) and hit
  it with curl:
  - `GET /api/health` → `200`
  - `GET /api/categories` (public, no token) → `503` — reaches the
    controller and correctly reports the DB as unavailable, rather than
    404ing (confirms the route is wired) or crashing.
  - `POST /api/categories` with no token → `401`; with a garbage token →
    `401`; with a **validly-signed** JWT (correct secret, fake id) →
    `503` — proves the whole `protect` pipeline (header parsing → JWT
    verify → DB lookup attempt) runs correctly, and only the missing
    database stops it.
  - `GET /api/questions/category/:id` and `GET /api/questions/random/:id`
    with no token → `401` (auth gate confirmed on both).
  - Unknown route → `404`.

**Not verifiable without a real MongoDB**: actual document creation/
update/delete, the `$sample` aggregation output, duplicate-category
rejection, and `restrictTo`/ownership enforcement end-to-end (all of
these need `req.user` populated from a real DB lookup, which only
happens once Mongo is actually connected). The list below is for you to
run against your own seeded DB — same idea as Phase 2's Postman list.

## Postman / Thunder Client verification list

Prerequisite — log in as each seeded role to get tokens (from
`backend/scripts/seed.js`):

```
POST /api/auth/login
Body: { "email": "admin@itquiz.test",    "password": "admin123" }
Body: { "email": "supplier@itquiz.test", "password": "supplier123" }
Body: { "email": "customer@itquiz.test", "password": "customer123" }
```
Save each `token` from the response. Then `GET /api/categories` (no auth
needed) to grab a real `category_id` (e.g. PHP's) for the requests below.

### Categories

| # | Method & URL | Auth | Body | Expect |
|---|---|---|---|---|
| 1 | `GET /api/categories` | none | — | `200`, array incl. PHP, JavaScript |
| 2 | `POST /api/categories` | admin token | `{"category_name":"Networking","description":"Core networking concepts"}` | `201` |
| 3 | `POST /api/categories` (repeat #2) | admin token | same body | `400` "already exists" |
| 4 | `POST /api/categories` | supplier or customer token | any valid body | `403` |
| 5 | `PUT /api/categories/:id` (id from #2) | admin token | `{"description":"Updated description"}` | `200`, name unchanged, description updated |
| 6 | `DELETE /api/categories/:id` (PHP's id, which has questions) | admin token | — | `409` "still reference it" |
| 7 | `DELETE /api/categories/:id` (from #2, no questions on it) | admin token | — | `200` |

### Questions

| # | Method & URL | Auth | Body | Expect |
|---|---|---|---|---|
| 8 | `GET /api/questions/category/:phpCategoryId` | admin or supplier token | — | `200`, full questions incl. `correct_answer` |
| 9 | `GET /api/questions/category/:phpCategoryId?difficulty=Hard` | admin token | — | `200`, only the 1 Hard PHP question |
| 10 | `GET /api/questions/category/:phpCategoryId` | customer token | — | `403` |
| 11 | `POST /api/questions` | supplier token | `{"category":"<phpCategoryId>","question":"What does DOM stand for?","option_a":"Document Object Model","option_b":"Data Object Model","option_c":"Document Order Model","option_d":"Dynamic Object Model","correct_answer":"A","difficulty":"Easy"}` | `201`, `createdBy` = supplier's id |
| 12 | `PUT /api/questions/:id` (from #11) | **different** supplier or admin's colleague — actually: same supplier token | `{"difficulty":"Medium"}` | `200` |
| 13 | `PUT /api/questions/:id` (from #11, a question the *customer* didn't create) | customer token | any body | `403` (role) |
| 14 | `PUT /api/questions/:id` (a question seeded under `supplier@itquiz.test`, edited by a **second, different** supplier account) | other supplier's token | any body | `403` "only modify questions you created" — register a second supplier via `POST /api/auth/register` to test this one |
| 15 | `DELETE /api/questions/:id` (from #11) | admin token | — | `200` (admin can delete anyone's) |
| 16 | `GET /api/questions/random/:phpCategoryId?difficulty=Easy` | any logged-in token | — | `200`, 10 questions, **no `correct_answer` field on any of them** |
| 17 | `GET /api/questions/random/:phpCategoryId?difficulty=Medium` | any logged-in token | — | `200`, only 1 question (seed data has just 1 Medium PHP question) — confirms the "fewer than 10 available" path degrades gracefully instead of erroring |
| 18 | `GET /api/questions/random/:phpCategoryId` (no `?difficulty`) | any logged-in token | — | `400` |
| 19 | `GET /api/questions/random/:anyCategoryId?difficulty=Easy` | no token | — | `401` |

If 1–19 all match, Phase 3 is good to hand off to Phase 4.

## Design decisions made where coding-phases.md's Phase 3 section was silent

Flagging these explicitly, same spirit as the locked-decisions list —
happy to change any of them if they're not what you had in mind:

1. **Suppliers can only update/delete their own questions**; admins can
   modify any question. The phase spec only said
   `restrictTo('admin', 'supplier')` for these three actions without
   addressing ownership, but Phase 8's "My Questions... table of
   questions this supplier created, edit/delete" implied it. `getQuestionsByCategory` (read-only) is **not** creator-scoped — any admin/supplier sees the full list.
2. **Deleting a category is blocked (`409`)** if any question still
   references it, rather than cascading the delete or orphaning those
   questions. Doesn't check `Result` yet since that model has no data
   until Phase 4.
3. **`getRandomQuestions` only requires being logged in**, not
   specifically `role: 'customer'` — nothing in its response is
   sensitive, so there was no reason to block admin/supplier from
   previewing a quiz the same way.
4. Random-question selection uses MongoDB's **`$sample` aggregation
   stage** (rather than fetch-all-and-shuffle-in-JS) — both the correct
   tool for the job and a genuine use of the aggregation pipeline the
   AWD syllabus's Unit 1 wants demonstrated.
