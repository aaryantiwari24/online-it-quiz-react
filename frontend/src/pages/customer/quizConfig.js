//Per-difficulty time limits, in seconds.
//
// The PHP project gives every quiz difficulty the same
// 10-minute time limit.
//
// PHP equivalent:
// $time_limit = 10 * 60;
//
// Therefore Easy, Medium and Hard must all be 10 minutes.

export const TIME_LIMIT_SECONDS = {
  Easy: 10 * 60,
  Medium: 10 * 60,
  Hard: 10 * 60,
}

export const DIFFICULTY_ORDER = ['Easy', 'Medium', 'Hard']