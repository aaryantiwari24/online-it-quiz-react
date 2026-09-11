const mongoose = require('mongoose');
const Certificate = require('../models/Certificate');
const Result = require('../models/Result');
const { assertDbReady } = require('../config/db');
const { PASS_THRESHOLD } = require('./resultController');

// See the identical helper in resultController.js/questionController.js for
// why this is kept file-local instead of shared.
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Short and on-brand ("IT Quiz") rather than implying an external
// accreditation body — matches the "CERTIFICATE OF COMPLETION" /
// "VERIFIED PROFESSIONAL CREDENTIAL" styling from context.md Section 2
// without overclaiming what actually issued it.
const CERTIFICATE_PREFIX = 'ITQ';

/**
 * Certificate.js only types `certificateNumber` as a plain unique String —
 * context.md doesn't specify a format anywhere, so this is a flagged
 * design choice, not a stated requirement. Built from the Result's own id
 * rather than a random or sequential value, so uniqueness is guaranteed by
 * construction (Result ids are already unique) instead of relying on
 * chance or a separate counter collection that doesn't exist anywhere else
 * in this schema.
 */
const generateCertificateNumber = (resultId) =>
  `${CERTIFICATE_PREFIX}-${new Date().getFullYear()}-${resultId.toString().toUpperCase()}`;

/**
 * Same owner-or-admin shape as assertCanViewResult in resultController.js —
 * a certificate is only ever meaningful to whoever earned it, or an admin
 * auditing it.
 *
 * Still checked by ownership (`resultDoc.customer`), not by re-verifying
 * `user.role === 'customer'` here — even though submitAttempt
 * (quizAttemptController.js — Result creation moved here from
 * resultController.js's now-removed createResult as part of the
 * "no server-side quiz attempt" security fix; see
 * SECURITY_FIX_SERVER_SIDE_QUIZ_ATTEMPT.md) is restrictTo('customer'),
 * so every *new* Result's owner is a customer at the moment it's
 * created. Two things that restriction doesn't retroactively guarantee:
 * results created before that restriction existed (Result.customer stays
 * whatever role the account had at submission time — this function has
 * no way to know if the fix was applied before or after any given row),
 * and a customer account whose
 * role is changed to supplier/admin sometime after they legitimately
 * earned a result (deleteUser in userController.js has no such flow today,
 * but nothing here assumes it can't happen). Re-deriving "does this result
 * belong to a customer" from the *current* role of `resultDoc.customer`
 * would require an extra User lookup this function doesn't otherwise need,
 * for a case (a stale non-customer-owned result) this ownership check
 * already handles correctly: whoever owns it (or an admin) can still view
 * it, same as before.
 */
const assertCanAccessResult = (user, resultDoc) => {
  if (user.role !== 'admin' && resultDoc.customer.toString() !== user.id) {
    const err = new Error('You do not have permission to access this result');
    err.status = 403;
    return err;
  }
  return null;
};

/**
 * SECURITY FIX — "a weak result can lead to a valid certificate".
 *
 * Before this fix, generateCertificate below only checked
 * `result.status !== 'Pass'` — i.e. it trusted the stored label on the
 * Result document instead of the graded data that label is supposed to
 * summarize. `submitAttempt` (quizAttemptController.js) is today the only
 * code path that can create a Result, and it derives `status` correctly
 * via `gradeQuiz`, so in the current codebase that label is trustworthy.
 * But nothing at certificate-generation time actually verified that: any
 * future regression in submitAttempt/gradeQuiz, a direct DB write (a
 * migration, a seed script, an admin tool added later), or a Result whose
 * stored score/status just don't agree with its own stored answers for
 * any reason would sail straight through generateCertificate and mint a
 * fully legitimate-looking Certificate off a fabricated Pass. A
 * certificate is only as trustworthy as the result that produced it, so
 * this recomputes that result from first principles instead of taking its
 * word for it.
 *
 * Deliberately re-derives from the Result's own already-stored
 * `answers[].isCorrect` — NOT by re-fetching current Question documents
 * and re-grading against today's `correct_answer`. Result.js's own schema
 * comment explains why: `isCorrect` is stored precisely so a Result "stays
 * accurate to what was actually correct at attempt time, even if a
 * Question's correct_answer is edited later" (questionController.js's
 * updateQuestion lets an admin/supplier change correct_answer at any time,
 * with no history kept). Re-grading against live Questions here would
 * silently break that guarantee — a customer's legitimately-earned
 * certificate could start failing this check the day an unrelated
 * question edit landed, through no fault of the certificate or the
 * customer. Checking the Result's *internal consistency* (do its own
 * stored score/percentage/status actually follow from its own stored
 * answers?) catches a fabricated-or-corrupted Pass without ever
 * reopening that separate, intentional design decision.
 *
 * Returns null when the Result is internally consistent (safe to
 * proceed), or an error to pass to next() when it isn't. Uses the exact
 * same PASS_THRESHOLD rule as gradeQuiz (imported from
 * resultController.js) rather than a second hardcoded 60, so this can
 * never disagree with the grading logic it's cross-checking against.
 */
const assertResultIntegrity = (resultDoc) => {
  const recomputedScore = resultDoc.answers.filter((a) => a.isCorrect).length;
  const recomputedTotal = resultDoc.answers.length;
  const recomputedPercentage =
    recomputedTotal > 0 ? Math.round((recomputedScore / recomputedTotal) * 100) : 0;
  const recomputedStatus = recomputedPercentage >= PASS_THRESHOLD ? 'Pass' : 'Fail';

  const isConsistent =
    recomputedScore === resultDoc.score &&
    recomputedTotal === resultDoc.totalQuestions &&
    recomputedPercentage === resultDoc.percentage &&
    recomputedStatus === resultDoc.status;

  if (!isConsistent) {
    // Logged with the specific mismatch for whoever investigates — a
    // customer/admin only ever needs to know generation was refused, not
    // which internal field disagreed (that detail could hint at how to
    // construct a Result that slips past this check, so it stays out of
    // the client-facing message below).
    console.error(
      `Result integrity check failed for result ${resultDoc._id}: ` +
        `stored {score: ${resultDoc.score}, totalQuestions: ${resultDoc.totalQuestions}, ` +
        `percentage: ${resultDoc.percentage}, status: ${resultDoc.status}} vs. ` +
        `recomputed {score: ${recomputedScore}, totalQuestions: ${recomputedTotal}, ` +
        `percentage: ${recomputedPercentage}, status: ${recomputedStatus}}`
    );
    const err = new Error(
      'This result failed an integrity check and cannot be used to generate a certificate. ' +
        'Please contact support.'
    );
    err.status = 409;
    err.code = 'RESULT_INTEGRITY_CHECK_FAILED';
    return err;
  }

  return null;
};

// @route  POST /api/certificates/result/:resultId
// @access Private (owner of the result, or admin — see assertCanAccessResult)
//
// Idempotent get-or-create, matching coding-phases.md's Phase 5 spec
// exactly: "creates a Certificate doc if one doesn't already exist for
// that result, returns it". The reference video's certificate.php is
// reached simply by viewing a passed result — there's no separate
// "generate" action the user triggers — so the first view creates the
// Certificate and every later view of the same result just returns the
// one already made.
const generateCertificate = async (req, res, next) => {
  try {
    const { resultId } = req.params;

    if (!isValidObjectId(resultId)) {
      const err = new Error('Invalid result id');
      err.status = 400;
      return next(err);
    }

    assertDbReady();

    const result = await Result.findById(resultId);
    if (!result) {
      const err = new Error('Result not found');
      err.status = 404;
      return next(err);
    }

    const permissionErr = assertCanAccessResult(req.user, result);
    if (permissionErr) return next(permissionErr);

    // Certificates only exist for passing attempts — matches context.md
    // Section 2's certificate copy ("for successfully passing...") and
    // Section 7's "download certificate (PDF) if passed". A Fail result
    // has nothing to certify.
    if (result.status !== 'Pass') {
      const err = new Error('A certificate can only be generated for a passing result');
      err.status = 400;
      return next(err);
    }

    // Re-verify the Pass claim against the Result's own stored answers
    // before trusting it any further — see assertResultIntegrity's own
    // comment for why this exists as a second, independent check rather
    // than relying solely on the status field just confirmed above.
    const integrityErr = assertResultIntegrity(result);
    if (integrityErr) return next(integrityErr);

    let certificate = await Certificate.findOne({ result: result._id });

    if (!certificate) {
      certificate = await Certificate.create({
        result: result._id,
        customer: result.customer,
        certificateNumber: generateCertificateNumber(result._id),
      });
    }

    res.status(200).json({ certificate });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    } else if (err.code === 11000) {
      // Duplicate-key race: two "first view" requests for the same result
      // landing close together both pass the findOne check above, then
      // the second create() trips the unique certificateNumber index
      // instead — same shape as authController.js's register() race
      // handling. Re-fetch and return the one that won the race rather
      // than surfacing a 500 for what is, from the caller's perspective,
      // a successful get-or-create.
      const existing = await Certificate.findOne({ result: req.params.resultId });
      if (existing) {
        return res.status(200).json({ certificate: existing });
      }
    }
    next(err);
  }
};

// @route  PATCH /api/certificates/:id/download
// @access Private (owner of the underlying result, or admin — see
// assertCanAccessResult)
//
// FLAGGED ADDITION (Phase 6) — not part of coding-phases.md's recorded
// Phase 5 spec. Certificate.js's downloadStatus field (default
// 'Generated', enum includes 'Downloaded') existed with no route in this
// codebase that could ever set it to 'Downloaded' — generateCertificate
// above only ever creates it at the default. Added now because Phase 6's
// certificate page has a real print/download action that needs
// somewhere to report to; without this route that action would have to
// either be silently disconnected from the field it exists to track, or
// invent a shape here on the fly. Kept minimal: no request body, no new
// validation rules — same permission check as generateCertificate,
// re-fetching the parent Result the same way, since permission is a
// property of who owns the Result, not the Certificate row itself.
// Idempotent by nature of a plain field set — calling this twice (e.g.
// the user prints, then prints again) just re-sets the same value.
const markCertificateDownloaded = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      const err = new Error('Invalid certificate id');
      err.status = 400;
      return next(err);
    }

    assertDbReady();

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      const err = new Error('Certificate not found');
      err.status = 404;
      return next(err);
    }

    const result = await Result.findById(certificate.result);
    if (!result) {
      // Dangling ref — the Result a Certificate points to was deleted.
      // Same "shouldn't normally happen, but don't 500 on it" posture as
      // getResultById's populate leaving a null question, just surfaced
      // as an explicit 404 here since permission genuinely cannot be
      // checked without the Result to check it against.
      const err = new Error('The result behind this certificate no longer exists');
      err.status = 404;
      return next(err);
    }

    const permissionErr = assertCanAccessResult(req.user, result);
    if (permissionErr) return next(permissionErr);

    if (certificate.downloadStatus !== 'Downloaded') {
      certificate.downloadStatus = 'Downloaded';
      await certificate.save();
    }

    res.status(200).json({ certificate });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    next(err);
  }
};

module.exports = { generateCertificate, markCertificateDownloaded };
