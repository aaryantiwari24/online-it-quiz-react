const mongoose = require('mongoose');
const QuizAttempt = require('../models/QuizAttempt');
const Question = require('../models/Question');
const Category = require('../models/Category');
const Result = require('../models/Result');
const { assertDbReady } = require('../config/db');
const { gradeQuiz } = require('./resultController');

// See the identical helper in categoryController.js/questionController.js/
// resultController.js for why this is kept file-local instead of shared.
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const VALID_ANSWER_KEYS = ['A', 'B', 'C', 'D'];

// Mirrors questionController.js's own QUESTIONS_PER_QUIZ (kept file-local
// rather than shared/exported, matching this codebase's existing per-file
// constant convention — see that file's own comment). A created attempt
// can never have more questions than this, regardless of how large a
// category+difficulty pool is.
const QUESTIONS_PER_QUIZ = 10;

// The server-side source of truth for how long each difficulty's timer
// runs. Mirrors frontend/src/pages/customer/quizConfig.js's own
// TIME_LIMIT_SECONDS — that copy is now display-only (the "15 min" label
// QuizList.jsx shows before a quiz even starts); this one is what
// actually gets baked into an attempt's expiresAt at creation, and is
// the only copy submitAttempt ever checks a submission against. If
// either copy's numbers ever change, check whether the other should too
// — same cross-file-duplication trade-off already accepted for
// QUESTIONS_PER_QUIZ.
const TIME_LIMIT_SECONDS = {
  Easy: 15 * 60,
  Medium: 12 * 60,
  Hard: 10 * 60,
};

// How long, past an attempt's own expiresAt, submitAttempt still accepts
// a submission for it. This is NOT extra thinking time — QuizAttempt.jsx
// disables every input the instant a submit starts, whether triggered by
// the countdown hitting zero or a manual click (see its own
// submittingRef comment), so by the time any submission is actually in
// flight the answers are already locked in either way. This purely
// absorbs ordinary network latency between "the client's timer hit zero
// and fired the auto-submit request" and "the server actually receives
// it" — without it, the normal way a timed-out quiz gets submitted at
// all (auto-submit-on-expiry) would fail almost every time, since that
// request can only ever arrive at or after the exact deadline it's
// racing against. 60s is generous for even a slow connection without
// being large enough to meaningfully extend an exam that's 10-15 minutes
// long.
const SUBMISSION_GRACE_SECONDS = 60;

/**
 * The one place that decides "does this customer already have a live
 * attempt at this exact category+difficulty quiz". Used by both
 * startOrResumeAttempt's normal path and its duplicate-key race-recovery
 * path below, so both go through identical expiry logic instead of two
 * copies that could drift apart.
 *
 * `status: 'InProgress'` in the query is a cheap first filter, not the
 * final answer — expiresAt against the current clock is always the real
 * check (see QuizAttempt.js's own comment on why `status` is a cache,
 * not the source of truth for expiry). A row that's still marked
 * InProgress but is actually past its deadline is corrected to Expired
 * right here and treated as if it didn't match, rather than handed back
 * to the caller as something still resumable. Deliberately no grace
 * period here (unlike submitAttempt's expiry check) — grace exists to
 * stop network latency from failing an already-decided submission, not
 * to make a stale page reload count as "still ongoing".
 */
const findActiveAttempt = async (customerId, categoryId, difficulty) => {
  const existing = await QuizAttempt.findOne({
    customer: customerId,
    category: categoryId,
    difficulty,
    status: 'InProgress',
  });

  if (!existing) return null;

  if (Date.now() >= existing.expiresAt.getTime()) {
    existing.status = 'Expired';
    await existing.save();
    return null;
  }

  return existing;
};

/**
 * Shapes a QuizAttempt doc into what's safe/useful to send to a client —
 * mirrors authController.js's toSafeUser in spirit. Deliberately omits
 * `questions` (sent separately below, as full sanitized Question docs)
 * and `customer` (the caller already knows who they are).
 */
const sanitizeAttempt = (attempt) => ({
  _id: attempt._id,
  category: attempt.category,
  difficulty: attempt.difficulty,
  startedAt: attempt.startedAt,
  expiresAt: attempt.expiresAt,
  status: attempt.status,
});

/**
 * Fetches the Question docs an attempt's `questions` array points at, in
 * that same original order. A plain `Question.find({ _id: { $in: ids } })`
 * doesn't promise its results come back in `ids`' order, so this re-sorts
 * them afterward — otherwise a resumed attempt could show its questions
 * in a different order (and a different Question Map numbering) than the
 * first time it was shown, even though nothing about the assignment
 * itself changed.
 *
 * Silently drops any id that no longer resolves to a real Question (one
 * assigned question was deleted after this attempt started) instead of
 * throwing — same "shouldn't normally happen, but don't crash on it"
 * posture as Results.jsx's own handling of a dangling `answer.question`
 * ref. See submitAttempt's own comment on why the exact-count check is
 * deliberately based on this filtered length, not the attempt's raw
 * `questions` array length.
 *
 * `includeCorrectAnswer` is false for the customer-facing response
 * (startOrResumeAttempt — a customer's browser must never receive
 * correct_answer before submitting, same rule getRandomQuestions has
 * always enforced) and true for grading (submitAttempt).
 */
const loadAssignedQuestions = async (questionIds, { includeCorrectAnswer }) => {
  const projection = includeCorrectAnswer ? {} : { correct_answer: 0 };
  const docs = await Question.find({ _id: { $in: questionIds } }, projection);

  const byId = new Map(docs.map((doc) => [doc._id.toString(), doc]));
  return questionIds.map((qId) => byId.get(qId.toString())).filter(Boolean);
};

// @route  POST /api/quiz-attempts
// @access Private (any logged-in role)
// @body   { categoryId, difficulty }
//
// THE fix for finding #5 ("no server-side quiz attempt"). This is what
// QuizAttempt.jsx now calls on mount instead of the old
// GET /api/questions/random/:categoryId — the response shape (an
// `attempt` object alongside the same sanitized `questions` array
// getRandomQuestions always returned) is close enough that the rest of
// that component barely had to change.
//
// Idempotent get-or-create, same shape and justification as
// certificateController.js's generateCertificate: if this customer
// already has a live attempt at this exact category+difficulty (see
// findActiveAttempt), that's what's returned — same _id, same questions,
// same original expiresAt — instead of a brand new one. This is not just
// an idempotency nicety: without it, simply reloading the quiz page (or
// a flaky connection retrying the request) would hand out a fresh
// full-length timer and a freshly-reshuffled question set every time,
// which is exactly the kind of client-refresh timing loophole this fix
// exists to close. Only when there's genuinely no usable existing
// attempt does this sample a new question set and start a new clock.
//
// Deliberately NOT restrictTo('customer'), matching getRandomQuestions'
// own original reasoning ("any logged-in role can preview a question
// set") — re-derived here rather than copy-pasted, since that same
// reasoning applied to POST /api/results turned out to be wrong (see
// AUDIT_FIXES.md's "Unrestricted quiz-result submission" addendum) and
// deserves re-checking, not blind reuse. What made that case dangerous
// was that submitting a result *persists a graded, ownership-bearing
// record* an admin/supplier could turn into a certificate without
// taking the quiz. Creating a QuizAttempt does persist a record too, but
// on its own it can never become a Result or a Certificate — only
// submitAttempt can do that, and submitAttempt stays restrictTo
// ('customer') below, same as createResult was fixed to. An admin or
// supplier calling this endpoint previews a quiz exactly as a customer
// would see it (useful for QA on their own questions) and gets nothing
// more than an inert QuizAttempt row that can never be graded.
const startOrResumeAttempt = async (req, res, next) => {
  try {
    const { categoryId, difficulty } = req.body;

    if (!categoryId) {
      const err = new Error('categoryId is required');
      err.status = 400;
      return next(err);
    }
    if (!isValidObjectId(categoryId)) {
      const err = new Error('Invalid category id');
      err.status = 400;
      return next(err);
    }

    if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty)) {
      const err = new Error(
        `difficulty is required and must be one of: ${VALID_DIFFICULTIES.join(', ')}`
      );
      err.status = 400;
      return next(err);
    }

    assertDbReady();

    const category = await Category.findById(categoryId);
    if (!category) {
      const err = new Error('Category not found');
      err.status = 404;
      return next(err);
    }

    const resumable = await findActiveAttempt(req.user.id, categoryId, difficulty);
    if (resumable) {
      const questions = await loadAssignedQuestions(resumable.questions, {
        includeCorrectAnswer: false,
      });
      return res.status(200).json({
        attempt: sanitizeAttempt(resumable),
        questions,
        count: questions.length,
      });
    }

    // No usable existing attempt — sample a fresh question set exactly
    // like getRandomQuestions always did (same aggregation, same
    // graceful "fewer than QUESTIONS_PER_QUIZ if the pool is smaller"
    // behavior — see that function's own comment in
    // questionController.js). correct_answer is excluded here for the
    // same reason it always was: this response goes straight to the
    // customer's browser.
    const sampled = await Question.aggregate([
      {
        $match: {
          category: new mongoose.Types.ObjectId(categoryId),
          difficulty,
        },
      },
      { $sample: { size: QUESTIONS_PER_QUIZ } },
      { $project: { correct_answer: 0 } },
    ]);

    if (sampled.length === 0) {
      const err = new Error(
        `No ${difficulty} questions found for category "${category.category_name}" yet`
      );
      err.status = 404;
      return next(err);
    }

    const startedAt = new Date();
    const durationSeconds = TIME_LIMIT_SECONDS[difficulty];
    const expiresAt = new Date(startedAt.getTime() + durationSeconds * 1000);

    let attempt;
    try {
      attempt = await QuizAttempt.create({
        customer: req.user.id,
        category: categoryId,
        difficulty,
        questions: sampled.map((q) => q._id),
        startedAt,
        expiresAt,
        status: 'InProgress',
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        // Duplicate-key race on the partial unique index (QuizAttempt.js)
        // — a second "start quiz" request for the same customer +
        // category + difficulty landed while this one was still
        // running (a double-click, two tabs, or a retried request).
        // Same recovery shape as certificateController.js's
        // generateCertificate: re-run the exact lookup findActiveAttempt
        // already does and hand back whichever attempt actually won the
        // race, instead of surfacing a 500 for what is, from the
        // caller's perspective, a successful get-or-create.
        const winner = await findActiveAttempt(req.user.id, categoryId, difficulty);
        if (winner) {
          const questions = await loadAssignedQuestions(winner.questions, {
            includeCorrectAnswer: false,
          });
          return res.status(200).json({
            attempt: sanitizeAttempt(winner),
            questions,
            count: questions.length,
          });
        }
      }
      throw createErr;
    }

    const questions = await loadAssignedQuestions(attempt.questions, {
      includeCorrectAnswer: false,
    });

    res.status(201).json({
      attempt: sanitizeAttempt(attempt),
      questions,
      count: questions.length,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    next(err);
  }
};

/**
 * Validates the shape of the `answers` array from a submit-attempt
 * request — moved here from resultController.js's now-removed
 * createResult, which this endpoint replaces. Runs entirely before
 * assertDbReady() — see that function's own comment in config/db.js for
 * why request-shape validation always comes first.
 */
const validateAnswersShape = (answers) => {
  if (!Array.isArray(answers) || answers.length === 0) {
    const err = new Error('answers must be a non-empty array');
    err.status = 400;
    return err;
  }

  // Cheap upper bound only, checked before any DB call — QUESTIONS_PER_QUIZ
  // is the app-wide ceiling regardless of which attempt this is, so an
  // obviously-oversized submission can be rejected without a query. Not
  // the full check: the exact count a *specific* attempt requires (see
  // submitAttempt) is only knowable after loading that attempt.
  if (answers.length > QUESTIONS_PER_QUIZ) {
    const err = new Error(`answers cannot contain more than ${QUESTIONS_PER_QUIZ} entries`);
    err.status = 400;
    return err;
  }

  const seenQuestionIds = new Set();

  for (const answer of answers) {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
      const err = new Error('Each answer must be an object with questionId and selectedOption');
      err.status = 400;
      return err;
    }

    const { questionId, selectedOption } = answer;

    if (!questionId || !isValidObjectId(questionId)) {
      const err = new Error('Invalid questionId in answers');
      err.status = 400;
      return err;
    }

    const key = String(questionId);
    if (seenQuestionIds.has(key)) {
      const err = new Error('Duplicate questionId in answers');
      err.status = 400;
      return err;
    }
    seenQuestionIds.add(key);

    // null/undefined means "left unanswered" and is valid — matches
    // Result.js's answers.selectedOption enum, which explicitly allows null.
    if (
      selectedOption !== null &&
      selectedOption !== undefined &&
      !VALID_ANSWER_KEYS.includes(selectedOption)
    ) {
      const err = new Error(
        `selectedOption must be one of ${VALID_ANSWER_KEYS.join(', ')}, or null`
      );
      err.status = 400;
      return err;
    }
  }

  return null;
};

/**
 * Owner-only — unlike assertCanViewResult/assertCanAccessResult
 * elsewhere, there's deliberately no owner-or-admin shape here. Viewing
 * something on someone else's behalf is one thing; submitting an exam
 * "as" another customer isn't a permission an admin should have at all.
 * restrictTo('customer') on the route (quizAttemptRoutes.js) already
 * keeps non-customers out entirely — this is the second check, that the
 * specific customer calling this is the one the attempt actually
 * belongs to.
 */
const assertOwnsAttempt = (user, attemptDoc) => {
  if (attemptDoc.customer.toString() !== user.id) {
    const err = new Error('You do not have permission to submit this quiz attempt');
    err.status = 403;
    return err;
  }
  return null;
};

// @route  POST /api/quiz-attempts/:id/submit
// @access Private, restrictTo('customer') (see quizAttemptRoutes.js) —
// same reasoning as createResult's former restrictTo('customer'), see
// AUDIT_FIXES.md's addendum: this is the action that persists a graded,
// certificate-eligible record, not a harmless preview.
// @body   { answers: [{ questionId, selectedOption }] }
//
// Replaces the old POST /api/results entirely — categoryId and
// difficulty are no longer accepted from the request body at all (they're
// read off the loaded `attempt`, which the client cannot influence), and
// the question set answers are checked against is the attempt's own
// fixed `questions` list, never a freshly re-queried category+difficulty
// pool. This is the change that actually closes finding #5's "question
// IDs, timing, attempts, and submissions" impact:
//   - question IDs: must exactly match what this specific attempt was
//     assigned (see the exact-count/membership checks below), not just
//     "any question from the right category/difficulty".
//   - timing: expiresAt was fixed server-side at attempt creation and is
//     re-checked against the server's own clock here, never trusted from
//     anything the client reports about how long it took.
//   - attempts/submissions: an attempt can only ever be graded once —
//     enforced first by the status check below, and backstopped at the
//     database level by Result.js's unique index on `quizAttempt` (see
//     that field's own comment) even if two submissions for the same
//     attempt somehow race past the status check at the same instant.
const submitAttempt = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      const err = new Error('Invalid quiz attempt id');
      err.status = 400;
      return next(err);
    }

    const answersErr = validateAnswersShape(req.body.answers);
    if (answersErr) return next(answersErr);

    assertDbReady();

    const attempt = await QuizAttempt.findById(id);
    if (!attempt) {
      const err = new Error('Quiz attempt not found');
      err.status = 404;
      return next(err);
    }

    const ownershipErr = assertOwnsAttempt(req.user, attempt);
    if (ownershipErr) return next(ownershipErr);

    // Checked in this order so the message reflects the actual reason:
    // an attempt that was validly submitted a while ago is very likely
    // *also* past its own expiresAt by now (time keeps passing after
    // submission), so "already submitted" has to be checked first, or a
    // legitimate resubmission attempt (e.g. a duplicate network retry)
    // would be told "expired" instead of the more accurate "you already
    // did this".
    if (attempt.status === 'Submitted') {
      const err = new Error('This quiz attempt has already been submitted');
      err.status = 409;
      err.code = 'ATTEMPT_ALREADY_SUBMITTED';
      return next(err);
    }

    // The real expiry check — timestamp against the server's own clock,
    // not the (possibly stale) `status` field. See QuizAttempt.js's own
    // comment on why status is a cache, not the source of truth.
    // SUBMISSION_GRACE_SECONDS exists so the normal auto-submit-on-
    // timeout path (the countdown hitting zero and immediately firing
    // this same request) still succeeds — see that constant's own
    // comment above.
    const deadlineWithGrace = attempt.expiresAt.getTime() + SUBMISSION_GRACE_SECONDS * 1000;
    if (Date.now() > deadlineWithGrace) {
      if (attempt.status !== 'Expired') {
        attempt.status = 'Expired';
        await attempt.save();
      }
      const err = new Error('This quiz attempt has expired and can no longer be submitted');
      err.status = 400;
      err.code = 'ATTEMPT_EXPIRED';
      return next(err);
    }

    // Grade against exactly what this attempt was assigned — never a
    // freshly re-queried category+difficulty pool. includeCorrectAnswer:
    // true because this copy is for grading, not for display.
    const questionDocs = await loadAssignedQuestions(attempt.questions, {
      includeCorrectAnswer: true,
    });

    // Required count is deliberately questionDocs.length (currently-
    // resolvable assigned questions), not attempt.questions.length (the
    // raw original array) — the two only differ if a specific assigned
    // Question was deleted after this attempt started, in which case
    // QuizAttempt.jsx's own display already reflects the shorter list
    // (see loadAssignedQuestions' own comment), and requiring the
    // now-impossible original count would reject an honest submission
    // through no fault of the customer's. This is unrelated to, and
    // doesn't reopen, the bug being fixed here: the pool this attempt
    // was originally sampled from growing or shrinking elsewhere never
    // changes `attempt.questions` at all, since submission is never
    // re-matched against that pool.
    const { answers } = req.body;
    if (answers.length !== questionDocs.length) {
      const err = new Error(
        `This quiz attempt requires exactly ${questionDocs.length} answer${
          questionDocs.length === 1 ? '' : 's'
        }, received ${answers.length}`
      );
      err.status = 400;
      return next(err);
    }

    const assignedQuestionIds = new Set(questionDocs.map((q) => q._id.toString()));
    const hasForeignQuestion = answers.some((a) => !assignedQuestionIds.has(String(a.questionId)));
    if (hasForeignQuestion) {
      const err = new Error(
        'One or more submitted answers do not match the questions assigned to this quiz attempt'
      );
      err.status = 400;
      return next(err);
    }

    const { gradedAnswers, score, totalQuestions, percentage, status } = gradeQuiz(
      questionDocs,
      answers
    );

    const submittedAt = new Date();

    let newResult;
    try {
      newResult = await Result.create({
        customer: req.user.id,
        category: attempt.category,
        difficulty: attempt.difficulty,
        quizAttempt: attempt._id,
        answers: gradedAnswers,
        score,
        totalQuestions,
        percentage,
        status,
        attemptDate: submittedAt,
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        // Result.quizAttempt's unique index (Result.js) just caught a
        // race: another request already created a Result for this exact
        // attempt between our status check above and this create() call
        // (e.g. a duplicated network retry of the same submit). Report
        // it the same way the up-front status check would have, rather
        // than a confusing generic 500 — see Result.js's own comment on
        // why this index, not the status field, carries the real
        // guarantee against a double-submit.
        const err = new Error('This quiz attempt has already been submitted');
        err.status = 409;
        err.code = 'ATTEMPT_ALREADY_SUBMITTED';
        return next(err);
      }
      throw createErr;
    }

    attempt.status = 'Submitted';
    attempt.submittedAt = submittedAt;
    attempt.result = newResult._id;
    await attempt.save();

    res.status(201).json({ result: newResult });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    next(err);
  }
};

module.exports = {
  startOrResumeAttempt,
  submitAttempt,
};
