const mongoose = require('mongoose');

const QuizAttempt = require('../models/QuizAttempt');
const Question = require('../models/Question');
const Category = require('../models/Category');
const Result = require('../models/Result');

const { assertDbReady } = require('../config/db');
const { gradeQuiz } = require('./resultController');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const VALID_ANSWER_KEYS = ['A', 'B', 'C', 'D'];

/*
 * PHP quiz.php:
 *
 * $questions = ... LIMIT 10;
 *
 * The React version must therefore use exactly 10 questions.
 */
const QUESTIONS_PER_QUIZ = 10;

/*
 * PHP quiz.php:
 *
 * $time_limit = 10 * 60;
 *
 * IMPORTANT:
 * All three difficulty levels use the same 10-minute limit.
 */
const TIME_LIMIT_SECONDS = {
  Easy: 10 * 60,
  Medium: 10 * 60,
  Hard: 10 * 60,
};

/*
 * Small grace period for the auto-submit request to reach
 * the server after the browser countdown reaches zero.
 *
 * This does not change the displayed quiz duration.
 */
const SUBMISSION_GRACE_SECONDS = 60;

/**
 * Find the customer's active attempt for this exact
 * category + difficulty.
 */
const findActiveAttempt = async (
  customerId,
  categoryId,
  difficulty
) => {
  const existing = await QuizAttempt.findOne({
    customer: customerId,
    category: categoryId,
    difficulty,
    status: 'InProgress',
  });

  if (!existing) {
    return null;
  }

  /*
   * The stored expiry time is the source of truth.
   */
  if (Date.now() >= existing.expiresAt.getTime()) {
    existing.status = 'Expired';
    await existing.save();

    return null;
  }

  return existing;
};

/**
 * Return only the attempt information that the customer
 * needs to know.
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
 * Load the exact questions assigned to an attempt.
 *
 * The original question order is preserved.
 *
 * Correct answers are excluded from the customer-facing
 * response.
 */
const loadAssignedQuestions = async (
  questionIds,
  { includeCorrectAnswer }
) => {
  const projection = includeCorrectAnswer
    ? {}
    : { correct_answer: 0 };

  const docs = await Question.find(
    {
      _id: {
        $in: questionIds,
      },
    },
    projection
  );

  const byId = new Map(
    docs.map((doc) => [
      doc._id.toString(),
      doc,
    ])
  );

  return questionIds
    .map((qId) => byId.get(qId.toString()))
    .filter(Boolean);
};

/**
 * POST /api/quiz-attempts
 *
 * Starts or resumes a quiz attempt.
 *
 * Body:
 * {
 *   categoryId,
 *   difficulty
 * }
 */
const startOrResumeAttempt = async (
  req,
  res,
  next
) => {
  try {
    const {
      categoryId,
      difficulty,
    } = req.body;

    if (!categoryId) {
      const err = new Error(
        'categoryId is required'
      );

      err.status = 400;

      return next(err);
    }

    if (!isValidObjectId(categoryId)) {
      const err = new Error(
        'Invalid category id'
      );

      err.status = 400;

      return next(err);
    }

    if (
      !difficulty ||
      !VALID_DIFFICULTIES.includes(
        difficulty
      )
    ) {
      const err = new Error(
        `difficulty is required and must be one of: ${VALID_DIFFICULTIES.join(
          ', '
        )}`
      );

      err.status = 400;

      return next(err);
    }

    assertDbReady();

    /*
     * Make sure the selected category exists.
     *
     * PHP quiz_difficulty.php does the same
     * category validation before starting the quiz.
     */
    const category =
      await Category.findById(categoryId);

    if (!category) {
      const err = new Error(
        'Category not found'
      );

      err.status = 404;

      return next(err);
    }

    /*
     * If the customer refreshes the page while an
     * attempt is still active, continue that attempt.
     */
    const resumable =
      await findActiveAttempt(
        req.user.id,
        categoryId,
        difficulty
      );

    if (resumable) {
      const questions =
        await loadAssignedQuestions(
          resumable.questions,
          {
            includeCorrectAnswer: false,
          }
        );

      return res.status(200).json({
        attempt: sanitizeAttempt(
          resumable
        ),
        questions,
        count: questions.length,
      });
    }

    /*
     * PHP requires at least 10 questions.
     *
     * We therefore sample exactly 10.
     */
    const sampled =
      await Question.aggregate([
        {
          $match: {
            category:
              new mongoose.Types.ObjectId(
                categoryId
              ),
            difficulty,
          },
        },
        {
          $sample: {
            size: QUESTIONS_PER_QUIZ,
          },
        },
        {
          $project: {
            correct_answer: 0,
          },
        },
      ]);

    /*
     * PHP behavior:
     *
     * If fewer than 10 questions exist,
     * the quiz should not start.
     */
    if (
      sampled.length <
      QUESTIONS_PER_QUIZ
    ) {
      const err = new Error(
        `Insufficient questions. This quiz requires ${QUESTIONS_PER_QUIZ} questions, but only ${sampled.length} questions are available.`
      );

      err.status = 400;
      err.code =
        'INSUFFICIENT_QUESTIONS';

      return next(err);
    }

    const startedAt = new Date();

    /*
     * PHP:
     *
     * $time_limit = 10 * 60;
     *
     * Therefore every difficulty gets exactly
     * 10 minutes.
     */
    const durationSeconds =
      TIME_LIMIT_SECONDS[difficulty];

    const expiresAt = new Date(
      startedAt.getTime() +
        durationSeconds * 1000
    );

    let attempt;

    try {
      attempt =
        await QuizAttempt.create({
          customer: req.user.id,
          category: categoryId,
          difficulty,
          questions: sampled.map(
            (q) => q._id
          ),
          startedAt,
          expiresAt,
          status: 'InProgress',
        });
    } catch (createErr) {
      /*
       * Two requests may arrive at the same time.
       *
       * If another request already created the active
       * attempt, return that attempt instead.
       */
      if (createErr.code === 11000) {
        const winner =
          await findActiveAttempt(
            req.user.id,
            categoryId,
            difficulty
          );

        if (winner) {
          const questions =
            await loadAssignedQuestions(
              winner.questions,
              {
                includeCorrectAnswer: false,
              }
            );

          return res.status(200).json({
            attempt:
              sanitizeAttempt(winner),
            questions,
            count: questions.length,
          });
        }
      }

      throw createErr;
    }

    const questions =
      await loadAssignedQuestions(
        attempt.questions,
        {
          includeCorrectAnswer: false,
        }
      );

    return res.status(201).json({
      attempt: sanitizeAttempt(
        attempt
      ),
      questions,
      count: questions.length,
    });
  } catch (err) {
    if (
      err.name === 'ValidationError'
    ) {
      err.status = 400;
    }

    next(err);
  }
};

/**
 * Validate the submitted answers.
 */
const validateAnswersShape = (
  answers
) => {
  if (
    !Array.isArray(answers) ||
    answers.length === 0
  ) {
    const err = new Error(
      'answers must be a non-empty array'
    );

    err.status = 400;

    return err;
  }

  if (
    answers.length >
    QUESTIONS_PER_QUIZ
  ) {
    const err = new Error(
      `answers cannot contain more than ${QUESTIONS_PER_QUIZ} entries`
    );

    err.status = 400;

    return err;
  }

  const seenQuestionIds =
    new Set();

  for (const answer of answers) {
    if (
      !answer ||
      typeof answer !==
        'object' ||
      Array.isArray(answer)
    ) {
      const err = new Error(
        'Each answer must be an object with questionId and selectedOption'
      );

      err.status = 400;

      return err;
    }

    const {
      questionId,
      selectedOption,
    } = answer;

    if (
      !questionId ||
      !isValidObjectId(
        questionId
      )
    ) {
      const err = new Error(
        'Invalid questionId in answers'
      );

      err.status = 400;

      return err;
    }

    const key =
      String(questionId);

    if (
      seenQuestionIds.has(key)
    ) {
      const err = new Error(
        'Duplicate questionId in answers'
      );

      err.status = 400;

      return err;
    }

    seenQuestionIds.add(key);

    /*
     * null means unanswered.
     *
     * This is allowed because the PHP quiz also
     * considers a missing answer incorrect.
     */
    if (
      selectedOption !== null &&
      selectedOption !== undefined &&
      !VALID_ANSWER_KEYS.includes(
        selectedOption
      )
    ) {
      const err = new Error(
        `selectedOption must be one of ${VALID_ANSWER_KEYS.join(
          ', '
        )}, or null`
      );

      err.status = 400;

      return err;
    }
  }

  return null;
};

/**
 * Make sure the customer submitting the quiz
 * actually owns the attempt.
 */
const assertOwnsAttempt = (
  user,
  attemptDoc
) => {
  if (
    attemptDoc.customer.toString() !==
    user.id
  ) {
    const err = new Error(
      'You do not have permission to submit this quiz attempt'
    );

    err.status = 403;

    return err;
  }

  return null;
};

/**
 * POST /api/quiz-attempts/:id/submit
 *
 * Grades the quiz and creates the Result.
 */
const submitAttempt = async (
  req,
  res,
  next
) => {
  try {
    const { id } =
      req.params;

    if (!isValidObjectId(id)) {
      const err = new Error(
        'Invalid quiz attempt id'
      );

      err.status = 400;

      return next(err);
    }

    const answersErr =
      validateAnswersShape(
        req.body.answers
      );

    if (answersErr) {
      return next(answersErr);
    }

    assertDbReady();

    const attempt =
      await QuizAttempt.findById(id);

    if (!attempt) {
      const err = new Error(
        'Quiz attempt not found'
      );

      err.status = 404;

      return next(err);
    }

    const ownershipErr =
      assertOwnsAttempt(
        req.user,
        attempt
      );

    if (ownershipErr) {
      return next(
        ownershipErr
      );
    }

    /*
     * A submitted attempt cannot be submitted again.
     */
    if (
      attempt.status ===
      'Submitted'
    ) {
      const err = new Error(
        'This quiz attempt has already been submitted'
      );

      err.status = 409;
      err.code =
        'ATTEMPT_ALREADY_SUBMITTED';

      return next(err);
    }

    /*
     * Check the server-side expiry.
     *
     * The one-minute grace period exists only for the
     * request to arrive after the browser's automatic
     * submission.
     */
    const deadlineWithGrace =
      attempt.expiresAt.getTime() +
      SUBMISSION_GRACE_SECONDS *
        1000;

    if (
      Date.now() >
      deadlineWithGrace
    ) {
      if (
        attempt.status !==
        'Expired'
      ) {
        attempt.status =
          'Expired';

        await attempt.save();
      }

      const err = new Error(
        'This quiz attempt has expired and can no longer be submitted'
      );

      err.status = 400;
      err.code =
        'ATTEMPT_EXPIRED';

      return next(err);
    }

    /*
     * Grade against the exact questions assigned
     * when the quiz started.
     */
    const questionDocs =
      await loadAssignedQuestions(
        attempt.questions,
        {
          includeCorrectAnswer: true,
        }
      );

    const {
      answers,
    } = req.body;

    if (
      answers.length !==
      questionDocs.length
    ) {
      const err = new Error(
        `This quiz attempt requires exactly ${questionDocs.length} answer${
          questionDocs.length ===
          1
            ? ''
            : 's'
        }, received ${answers.length}`
      );

      err.status = 400;

      return next(err);
    }

    const assignedQuestionIds =
      new Set(
        questionDocs.map(
          (q) =>
            q._id.toString()
        )
      );

    const hasForeignQuestion =
      answers.some(
        (answer) =>
          !assignedQuestionIds.has(
            String(
              answer.questionId
            )
          )
      );

    if (hasForeignQuestion) {
      const err = new Error(
        'One or more submitted answers do not match the questions assigned to this quiz attempt'
      );

      err.status = 400;

      return next(err);
    }

    /*
     * The grading function is the same grading mechanism
     * used by the React result controller.
     *
     * We will verify its pass threshold against the PHP
     * project in the next comparison.
     */
    const {
      gradedAnswers,
      score,
      totalQuestions,
      percentage,
      status,
    } = gradeQuiz(
      questionDocs,
      answers
    );

    const submittedAt =
      new Date();

    let newResult;

    try {
      newResult =
        await Result.create({
          customer:
            req.user.id,

          category:
            attempt.category,

          difficulty:
            attempt.difficulty,

          quizAttempt:
            attempt._id,

          answers:
            gradedAnswers,

          score,

          totalQuestions,

          percentage,

          status,

          attemptDate:
            submittedAt,
        });
    } catch (createErr) {
      /*
       * Prevent duplicate results for the same attempt.
       */
      if (
        createErr.code ===
        11000
      ) {
        const err = new Error(
          'This quiz attempt has already been submitted'
        );

        err.status = 409;
        err.code =
          'ATTEMPT_ALREADY_SUBMITTED';

        return next(err);
      }

      throw createErr;
    }

    attempt.status =
      'Submitted';

    attempt.submittedAt =
      submittedAt;

    attempt.result =
      newResult._id;

    await attempt.save();

    return res.status(201).json({
      result: newResult,
    });
  } catch (err) {
    if (
      err.name ===
      'ValidationError'
    ) {
      err.status = 400;
    }

    next(err);
  }
};

module.exports = {
  startOrResumeAttempt,
  submitAttempt,
};
