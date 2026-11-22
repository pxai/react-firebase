import { reportAttempt, CHANNEL, ATTEMPT } from '../telemetry.js';

describe('reportAttempt', () => {
  let posted;

  beforeEach(() => {
    posted = [];
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    // jsdom's window.parent === window, i.e. "not embedded"; give the game a
    // distinct parent to post to.
    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: { postMessage: (message, origin) => posted.push([message, origin]) },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(window, 'parent', { configurable: true, value: window });
  });

  it('posts the outcome to the hosting page, targeted at our own origin', () => {
    expect(reportAttempt(true, 0)).toBe(true);

    const [message, origin] = posted[0];
    expect(message).toMatchObject({ channel: CHANNEL, type: ATTEMPT, completed: true });
    expect(origin).toBe(window.location.origin);
  });

  it('reports a failure as completed: false', () => {
    reportAttempt(false, 0);

    expect(posted[0][0].completed).toBe(false);
  });

  it('coerces a truthy outcome to a real boolean', () => {
    reportAttempt('bell', 0);

    expect(posted[0][0].completed).toBe(true);
  });

  it('measures the attempt from the stamp it was given', () => {
    jest.spyOn(performance, 'now').mockReturnValue(5000);

    reportAttempt(true, 1500);

    expect(posted[0][0].durationMs).toBe(3500);
  });

  it('never reports a negative duration', () => {
    jest.spyOn(performance, 'now').mockReturnValue(100);

    reportAttempt(true, 900);

    expect(posted[0][0].durationMs).toBe(0);
  });

  it('sends no stage id: the page knows which stage it loaded', () => {
    reportAttempt(true, 0);

    expect(posted[0][0]).not.toHaveProperty('stageId');
  });

  it('does nothing when the game is not embedded', () => {
    Object.defineProperty(window, 'parent', { configurable: true, value: window });

    expect(reportAttempt(true, 0)).toBe(false);
    expect(posted).toHaveLength(0);
  });

  it('survives a parent that refuses the message', () => {
    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: { postMessage: () => { throw new Error('SecurityError'); } },
    });

    expect(reportAttempt(true, 0)).toBe(false);
  });
});
