// Reports what happened in a stage to the page hosting the game.
//
// The game has no Firebase and should keep it that way: the site owns all
// Firestore access, and the game is a same-origin iframe. So outcomes go out
// over postMessage and the parent decides what to store.
//
// Note the parent does NOT trust a stage id from here — it already knows which
// stage it loaded. These messages only carry the outcome.
export const CHANNEL = 'txokas-game';
export const ATTEMPT = 'stage:attempt';

const post = (type, detail) => {
  try {
    if (typeof window === 'undefined') return false;
    // Not embedded: nothing is listening, and this is then a plain page visit.
    if (!window.parent || window.parent === window) return false;

    window.parent.postMessage({ channel: CHANNEL, type, ...detail }, window.location.origin);
    return true;
  } catch (error) {
    // Telemetry must never interfere with play.
    console.warn('Could not report game telemetry:', error);
    return false;
  }
};

// One attempt: the player launched the ball and it either rang the bell or did
// not. `startedAt` is a performance.now() stamp from when the attempt began.
export const reportAttempt = (completed, startedAt) =>
  post(ATTEMPT, {
    completed: !!completed,
    durationMs:
      typeof startedAt === 'number' && typeof performance !== 'undefined'
        ? Math.max(0, Math.round(performance.now() - startedAt))
        : null,
  });
