const mongoose = require('mongoose');

/**
 * The authoritative, server-side record of one customer's attempt at one
 * category+difficulty quiz — the object this codebase never had before
 * this fix. Before this model existed, the only server-side trace of a
 * quiz was the `Result` a client could POST once it decided it was done;
 * everything about *how* it got there (which questions were shown, when
 * it started, when it had to end, whether it had already been submitted
 * once) lived only in the browser's React state, which is just data the
 * client sent us and asked us to believe.
 *
 * A QuizAttempt is created (or resumed — see startOrResumeAttempt in
 * quizAttemptController.js) the moment a customer starts a quiz, fixes
 * the exact question set and deadline right there, and is the one thing
 * submitAttempt trusts when a submission comes in — never the request
 * body's own claims about category/difficulty/questions/timing.
 * `Result.quizAttempt` (see Result.js) links each graded Result back to
 * the attempt that produced it, so there's always a real record of what
 * this customer was actually assigned, not just what they said they were
 * assigned.
 */
const quizAttemptSchema = new mongoose.Schema(
  {
    // Named `customer` rather than `user` to match Result.js's own field
    // (see that schema, and certificateController.js's assertCanAccessResult
    // comment) — it holds whoever this attempt belongs to, which is
    // usually but not necessarily role: 'customer' (see
    // startOrResumeAttempt's own comment on why attempt *creation* stays
    // open to any logged-in role the same way getRandomQuestions'
    // preview always was, even though only a customer can ever submit
    // one — see submitAttempt).
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer is required'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: [true, 'Difficulty is required'],
    },
    // The exact, ordered set of questions assigned to this attempt, fixed
    // once at creation (startOrResumeAttempt) and never re-derived. This
    // is the field that actually closes the "these exact 10 questions"
    // half of the finding: submitAttempt grades strictly against this
    // list, never against a freshly re-queried category+difficulty pool
    // — so a question added, edited, or removed after this attempt
    // started can't change what this attempt is graded against, and a
    // client can no longer submit answers for questions it was never
    // shown.
    questions: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
        },
      ],
      required: [true, 'questions are required'],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'A quiz attempt must include at least one question',
      },
    },
    // Both set once, server-side, from the server's own clock at creation
    // — never from anything the client sends. expiresAt is what closes
    // the "this expiry time" half of the finding: submitAttempt compares
    // it against the server's clock again at submission time (plus a
    // small network-latency grace period — see SUBMISSION_GRACE_SECONDS
    // in quizAttemptController.js), so how long a submission is accepted
    // for is no longer something a modified client can just decide not
    // to enforce.
    startedAt: {
      type: Date,
      required: [true, 'startedAt is required'],
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: [true, 'expiresAt is required'],
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    // InProgress -> Submitted (submitAttempt succeeded) or Expired (the
    // deadline passed with no valid submission). This is a *cached*
    // label, not the source of truth for expiry — submitAttempt and
    // startOrResumeAttempt both always re-check `expiresAt` against the
    // current time rather than trusting a possibly-stale status, and
    // correct it (flip InProgress -> Expired) when they find it's out of
    // date. See both functions' own comments.
    status: {
      type: String,
      enum: ['InProgress', 'Submitted', 'Expired'],
      default: 'InProgress',
      required: true,
    },
    // Filled in by submitAttempt once grading succeeds. Left unset rather
    // than treated as an error if a later write to set it happens to fail
    // after the Result itself was already created — see submitAttempt's
    // own comment on why the unique index on Result.quizAttempt (Result.js)
    // is the real guarantee against a double-submit, not this field.
    result: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Result',
      default: null,
    },
  },
  { timestamps: true }
);

// Backs startOrResumeAttempt's "does this customer already have an active
// attempt at this exact quiz" lookup — not a unique index (a customer
// legitimately accumulates many Submitted/Expired rows for the same
// category+difficulty as they retake it over time), just a plain
// compound index so that lookup doesn't mean a full collection scan.
// The *uniqueness* guarantee (at most one InProgress attempt per
// customer+category+difficulty at a time) is the separate partial unique
// index below.
quizAttemptSchema.index({ customer: 1, category: 1, difficulty: 1, status: 1 });

// Enforces "at most one InProgress attempt per customer+category+difficulty"
// at the database level, not just in application logic — closes the same
// kind of race two near-simultaneous "start quiz" requests (a double-
// click, or two tabs) could otherwise hit that authController.js's
// register() and certificateController.js's generateCertificate already
// guard against for their own unique fields (see this schema's own
// duplicate-key handling in quizAttemptController.js's
// startOrResumeAttempt, which follows the exact same catch-and-recover
// pattern as generateCertificate's). partialFilterExpression means this
// only applies to InProgress rows — Submitted/Expired history for the
// same customer+category+difficulty is expected and unrestricted.
quizAttemptSchema.index(
  { customer: 1, category: 1, difficulty: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'InProgress' },
    name: 'one_in_progress_attempt_per_quiz',
  }
);

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
