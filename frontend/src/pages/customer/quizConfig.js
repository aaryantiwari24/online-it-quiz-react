// Per-difficulty time limits, in seconds.
//
// UPDATED — security fix, "no server-side quiz attempt" (see
// SECURITY_FIX_SERVER_SIDE_QUIZ_ATTEMPT.md). This used to be the only
// copy of these numbers anywhere, which meant the actual time limit for
// a quiz attempt was whatever the browser's JS said it was — nothing
// server-side ever checked it. backend/controllers/quizAttemptController.js
// now has its own TIME_LIMIT_SECONDS, which is what's actually baked
// into an attempt's expiresAt at creation and the only copy
// submitAttempt ever enforces against; that server-side copy is now the
// authoritative one, same footing as PASS_THRESHOLD and
// QUESTIONS_PER_QUIZ already had.
//
// This copy is now purely a *display* value: QuizList.jsx's "15 min"
// label on the difficulty picker, shown before a quiz has even started
// and no attempt exists yet to ask the server about. QuizAttempt.jsx no
// longer reads this at all — once an attempt exists, it seeds its
// countdown from that attempt's own server-issued `expiresAt` instead
// (see its own comment on why). If either copy's numbers change, check
// whether the other should too — same cross-file-duplication trade-off
// this codebase already accepts for QUESTIONS_PER_QUIZ between
// questionController.js and (formerly) resultController.js.
export const TIME_LIMIT_SECONDS = {
  Easy: 15 * 60,
  Medium: 12 * 60,
  Hard: 10 * 60,
}

export const DIFFICULTY_ORDER = ['Easy', 'Medium', 'Hard']
