import {
  recordStageOpen,
  recordStageAttempt,
  parseAttemptMessage,
  STAGE_OPENS,
  STAGE_ATTEMPTS,
} from '../analytics';
import { collection, addDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import { CHANNEL, ATTEMPT } from '../../game/src/telemetry.js';

jest.mock('../firebase', () => ({ db: {}, auth: { currentUser: null } }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, name) => name),
  addDoc: jest.fn(async () => ({ id: 'written' })),
  serverTimestamp: jest.fn(() => 'SERVER_TIME'),
}));

const written = () => addDoc.mock.calls[0][1];

beforeEach(() => {
  jest.clearAllMocks();
  auth.currentUser = null;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('recordStageOpen', () => {
  it('writes one row to the opens collection', async () => {
    await recordStageOpen('stage-1');

    expect(collection).toHaveBeenCalledWith(expect.anything(), STAGE_OPENS);
    expect(written()).toMatchObject({ stageId: 'stage-1', openedAt: 'SERVER_TIME' });
  });

  it('stores no identity for an anonymous player', async () => {
    await recordStageOpen('stage-1');

    expect(written().signedIn).toBe(false);
    expect(written()).not.toHaveProperty('userId');
  });

  it('stores the uid, and only the uid, for a signed-in player', async () => {
    auth.currentUser = {
      uid: 'uid-123',
      email: 'someone@example.com',
      displayName: 'Someone',
    };

    await recordStageOpen('stage-1');

    expect(written()).toMatchObject({ userId: 'uid-123', signedIn: true });
    // Nothing else about the person is recorded.
    expect(written()).not.toHaveProperty('userEmail');
    expect(written()).not.toHaveProperty('userName');
    expect(JSON.stringify(written())).not.toContain('example.com');
    expect(JSON.stringify(written())).not.toContain('Someone');
  });

  it('does nothing without a stage id', async () => {
    expect(await recordStageOpen(undefined)).toBe(false);
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('never throws when the write fails', async () => {
    addDoc.mockRejectedValueOnce(new Error('permission-denied'));

    await expect(recordStageOpen('stage-1')).resolves.toBe(false);
  });
});

describe('recordStageAttempt', () => {
  it('records a completed attempt with its duration', async () => {
    await recordStageAttempt({ stageId: 'stage-1', completed: true, durationMs: 4200 });

    expect(collection).toHaveBeenCalledWith(expect.anything(), STAGE_ATTEMPTS);
    expect(written()).toMatchObject({
      stageId: 'stage-1',
      completed: true,
      durationMs: 4200,
      endedAt: 'SERVER_TIME',
    });
  });

  it('records a failed attempt', async () => {
    await recordStageAttempt({ stageId: 'stage-1', completed: false, durationMs: 900 });

    expect(written().completed).toBe(false);
  });

  it('normalises a missing or junk duration to null', async () => {
    for (const durationMs of [undefined, null, NaN, Infinity, 'soon']) {
      jest.clearAllMocks();
      await recordStageAttempt({ stageId: 'stage-1', completed: true, durationMs });
      expect(written().durationMs).toBeNull();
    }
  });

  it('stores no identity for an anonymous player', async () => {
    await recordStageAttempt({ stageId: 'stage-1', completed: true, durationMs: 1 });

    expect(written().signedIn).toBe(false);
    expect(written()).not.toHaveProperty('userId');
  });
});

describe('parseAttemptMessage', () => {
  const origin = 'https://txokas.com';
  const good = {
    origin,
    data: { channel: CHANNEL, type: ATTEMPT, completed: true, durationMs: 1500 },
  };

  it('accepts a well-formed message from the game', () => {
    expect(parseAttemptMessage(good, origin)).toEqual({ completed: true, durationMs: 1500 });
  });

  it('rejects a message from another origin', () => {
    expect(parseAttemptMessage({ ...good, origin: 'https://evil.example' }, origin)).toBeNull();
  });

  it('rejects anything that is not one of our messages', () => {
    const cases = [
      null,
      { origin, data: null },
      { origin, data: 'hello' },
      { origin, data: { channel: 'something-else', type: ATTEMPT, completed: true } },
      { origin, data: { channel: CHANNEL, type: 'other', completed: true } },
      // React DevTools and Vite's HMR both post messages on this channel.
      { origin, data: { source: 'react-devtools-bridge' } },
    ];

    for (const event of cases) expect(parseAttemptMessage(event, origin)).toBeNull();
  });

  it('rejects a message whose outcome is not a boolean', () => {
    for (const completed of ['yes', 1, null, undefined]) {
      expect(parseAttemptMessage({ origin, data: { ...good.data, completed } }, origin)).toBeNull();
    }
  });

  it('ignores any stage id the message tries to supply', () => {
    const attempt = parseAttemptMessage(
      { origin, data: { ...good.data, stageId: 'someone-elses-stage' } },
      origin
    );

    expect(attempt).not.toHaveProperty('stageId');
  });
});
