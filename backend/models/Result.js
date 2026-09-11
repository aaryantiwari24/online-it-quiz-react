const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
  {
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
    // FLAGGED ADDITION — not present in context.md Section 5's draft schema,
    // but the old PHP `result` table had it, quizzes are attempted per
    // difficulty tier (customer/quiz.php?category_id=X&difficulty=Y), and the
    // certificate copy reads "...official {difficulty} certification
    // evaluation...". Without storing it here, Phase 5 certificate generation
    // and Phase 6 result history would have no way to know which tier was
    // passed. Flagging per coding-phases.md's own instruction rather than
    // silently deciding — see chat message.
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: [true, 'Difficulty is required'],
    },
    // FLAGGED ADDITION — closes finding #5 ("no server-side quiz
    // attempt"). Every Result is now created by submitAttempt
    // (quizAttemptController.js) as the direct result of grading a real
    // QuizAttempt, never accepted as a bare POST of
    // categoryId/difficulty/answers — so this is always set, never
    // optional, going forward. `unique` (plus `sparse`, so it doesn't
    // choke on any pre-fix row that predates this field entirely) is
    // deliberately a hard database-level constraint, not just an
    // application check: it's what guarantees a single QuizAttempt can
    // never end up graded twice, even if submitAttempt's own sequential
    // status check is ever raced by two near-simultaneous submissions of
    // the same attempt — see that function's own comment on why the
    // index carries the real guarantee, not the status field.
    quizAttempt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuizAttempt',
      required: [true, 'quizAttempt is required'],
      unique: true,
      sparse: true,
    },
    // FLAGGED ADDITION (Phase 4) — also not in context.md Section 5's draft
    // schema, same situation as the difficulty field above. Needed because
    // (a) the reference video's Results Screen (context.md Section 2) shows
    // a full per-question "Detailed Answer Review" — "Your Answer" vs
    // "Correct Answer" per question — which needs somewhere to live, and
    // (b) coding-phases.md's recorded Phase 4 validation cases (duplicate
    // questionId, invalid selectedOption, etc.) presuppose a submitted
    // answers array that gets stored, not just graded and discarded.
    // isCorrect is stored rather than recomputed on read so a Result stays
    // accurate to what was actually correct at attempt time, even if a
    // Question's correct_answer is edited later.
    answers: {
      type: [
        {
          question: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question',
            required: [true, 'Question reference is required'],
          },
          selectedOption: {
            type: String,
            enum: ['A', 'B', 'C', 'D', null],
            default: null,
          },
          isCorrect: {
            type: Boolean,
            required: [true, 'isCorrect is required'],
          },
        },
      ],
      required: [true, 'Answers are required'],
      // Array required: true only rejects null/undefined in Mongoose, not
      // an empty array (arrays are truthy) — same "schema-level backstop"
      // reasoning as the Post-Phase-3 audit's option-trimming fix in
      // Question.js. submitAttempt (quizAttemptController.js) enforces an
      // *exact* count matching the owning QuizAttempt's own fixed
      // `questions` list (so it can be less than 10, but never more)
      // before this is ever reached; this 1–10 range is just the outer
      // bound, kept as a backstop for any future direct-DB write path
      // that skips the controller.
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0 && value.length <= 10,
        message: 'A result must include between 1 and 10 answers',
      },
    },
    score: {
      type: Number,
      required: [true, 'Score is required'],
    },
    totalQuestions: {
      type: Number,
      required: [true, 'Total questions is required'],
    },
    percentage: {
      type: Number,
      required: [true, 'Percentage is required'],
    },
    status: {
      type: String,
      enum: ['Pass', 'Fail'],
      required: [true, 'Status is required'],
    },
    attemptDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true } // explicitly required by Phase 1 for Result
);

module.exports = mongoose.model('Result', resultSchema);
