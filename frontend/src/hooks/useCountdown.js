import { useCallback, useEffect, useRef, useState } from 'react'

// Below this many seconds remaining, QuizAttempt.jsx switches the timer
// display to a "warning" visual treatment (see its own comment). Kept
// here rather than in the component so the threshold and the countdown
// logic that produces the number it's compared against live in one file.
export const TIMER_WARNING_SECONDS = 60

/**
 * Countdown timer in seconds, ticking once per second down to 0.
 *
 * `onExpire` is stored in a ref and read from inside the interval's
 * callback rather than being a dependency of the effect that starts the
 * interval. Without that, every render that produced a new inline
 * `onExpire` function (e.g. QuizAttempt.jsx passing an arrow function
 * that closes over current `answers` state) would tear down and restart
 * the interval — at best wasteful, at worst a chance to lose a tick if a
 * teardown/restart pair straddles the 1-second boundary. Storing it in a
 * ref means the interval is created exactly once per `duration` and
 * always calls whatever the *latest* onExpire is, never a stale one from
 * the render that first mounted it — the exact stale-closure failure
 * mode a naive `setInterval(() => onExpire(), 1000)` would have.
 *
 * Auto-submit-vs-manual-submit race: QuizAttempt.jsx guards this by
 * checking a `submittedRef` before acting on either the manual submit
 * button or this hook's onExpire — see that component's own comment.
 * This hook only guarantees onExpire fires exactly once per mount (via
 * `firedRef` below); it doesn't know about "submission" as a concept.
 */
const useCountdown = (durationSeconds, onExpire) => {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds ?? 0)
  const onExpireRef = useRef(onExpire)
  const firedRef = useRef(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    // `durationSeconds` is null/undefined while the caller isn't ready to
    // start the timer yet (QuizAttempt.jsx passes null until its
    // questions have loaded) — don't start an interval against a
    // not-a-number duration, and don't touch secondsLeft/firedRef either,
    // so there's nothing for the interval below to race against.
    if (durationSeconds == null) {
      return undefined
    }

    setSecondsLeft(durationSeconds)
    firedRef.current = false

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          if (!firedRef.current) {
            firedRef.current = true
            // Deferred a tick so this fires after React has committed
            // secondsLeft = 0, rather than a setState-during-setState
            // update from inside the updater function above.
            setTimeout(() => onExpireRef.current?.(), 0)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(intervalRef.current)
    // Intentionally excludes onExpire — see the comment above. Only a new
    // `durationSeconds` (a genuinely new quiz attempt) should restart the
    // interval.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationSeconds])

  const isWarning = secondsLeft > 0 && secondsLeft <= TIMER_WARNING_SECONDS

  const formatted = useCallback(() => {
    const m = Math.floor(secondsLeft / 60)
    const s = secondsLeft % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }, [secondsLeft])

  return { secondsLeft, isWarning, formatted }
}

export default useCountdown
