// Stage analytics: who opened a stage, and how attempts at it went.
//
// Privacy: a signed-in player's uid is attached so distinct players can be
// counted; **nothing identifying is stored for anyone else**. No email, no
// display name, not even for signed-in users — the uid is enough to count by
// and the rest would only be data to leak. Anonymous events are still recorded
// (otherwise most traffic would be invisible), just with no identity on them.
// The `signedIn` flag lets you split the two without identifying anybody.
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { CHANNEL, ATTEMPT } from '../game/src/telemetry.js';

export const STAGE_OPENS = 'stage_opens';
export const STAGE_ATTEMPTS = 'stage_attempts';

const identity = () => {
  const uid = auth.currentUser?.uid;
  return uid ? { userId: uid, signedIn: true } : { signedIn: false };
};

// Analytics must never break the thing it is measuring, so every failure here
// is swallowed and reported as false rather than thrown.
const write = async (name, data) => {
  try {
    await addDoc(collection(db, name), { ...data, ...identity() });
    return true;
  } catch (error) {
    console.warn(`Could not record ${name}:`, error);
    return false;
  }
};

export const recordStageOpen = (stageId) => {
  if (!stageId) return Promise.resolve(false);

  return write(STAGE_OPENS, { stageId, openedAt: serverTimestamp() });
};

export const recordStageAttempt = ({ stageId, completed, durationMs }) => {
  if (!stageId) return Promise.resolve(false);

  return write(STAGE_ATTEMPTS, {
    stageId,
    completed: !!completed,
    durationMs: Number.isFinite(durationMs) ? durationMs : null,
    endedAt: serverTimestamp(),
  });
};

// Validates a postMessage from the game's iframe.
//
// Returns the attempt outcome, or null if this is not one of ours. The stage id
// is deliberately NOT taken from the message: the page already knows which
// stage it loaded, and anything in here came from a frame that could in
// principle be sending whatever it likes.
export const parseAttemptMessage = (event, origin) => {
  if (!event || event.origin !== origin) return null;

  const data = event.data;
  if (!data || typeof data !== 'object') return null;
  if (data.channel !== CHANNEL || data.type !== ATTEMPT) return null;
  if (typeof data.completed !== 'boolean') return null;

  return {
    completed: data.completed,
    durationMs: Number.isFinite(data.durationMs) ? data.durationMs : null,
  };
};
