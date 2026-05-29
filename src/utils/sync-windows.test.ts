import {
  parseDuration,
  matchesCron,
  isWindowActive,
  matchesApplication,
  isSyncBlocked,
} from './sync-windows';

describe('parseDuration', () => {
  it('parses minutes', () => {
    expect(parseDuration('30m')).toBe(1800000);
  });

  it('parses hours', () => {
    expect(parseDuration('1h')).toBe(3600000);
  });

  it('parses combined hours and minutes', () => {
    expect(parseDuration('2h30m')).toBe(9000000);
  });

  it('parses hours, minutes, and seconds', () => {
    expect(parseDuration('1h30m15s')).toBe(5415000);
  });

  it('parses seconds only', () => {
    expect(parseDuration('45s')).toBe(45000);
  });

  it('returns 0 for empty string', () => {
    expect(parseDuration('')).toBe(0);
  });
});

describe('matchesCron', () => {
  it('matches wildcard schedule', () => {
    expect(matchesCron('* * * * *', new Date('2024-06-15T10:30:00Z'))).toBe(true);
  });

  it('matches specific minute and hour', () => {
    expect(matchesCron('30 22 * * *', new Date('2024-06-15T22:30:00Z'))).toBe(true);
  });

  it('does not match wrong minute', () => {
    expect(matchesCron('30 22 * * *', new Date('2024-06-15T22:31:00Z'))).toBe(false);
  });

  it('matches day-of-week range (Mon-Fri)', () => {
    // 2024-06-12 is a Wednesday (dow=3)
    expect(matchesCron('0 9 * * 1-5', new Date('2024-06-12T09:00:00Z'))).toBe(true);
  });

  it('does not match weekend for weekday range', () => {
    // 2024-06-15 is a Saturday (dow=6)
    expect(matchesCron('0 9 * * 1-5', new Date('2024-06-15T09:00:00Z'))).toBe(false);
  });

  it('matches comma-separated values', () => {
    expect(matchesCron('0 9,17 * * *', new Date('2024-06-15T17:00:00Z'))).toBe(true);
    expect(matchesCron('0 9,17 * * *', new Date('2024-06-15T12:00:00Z'))).toBe(false);
  });

  it('matches specific month', () => {
    expect(matchesCron('0 0 1 6 *', new Date('2024-06-01T00:00:00Z'))).toBe(true);
    expect(matchesCron('0 0 1 6 *', new Date('2024-07-01T00:00:00Z'))).toBe(false);
  });

  it('rejects invalid cron with wrong field count', () => {
    expect(matchesCron('0 0 *', new Date())).toBe(false);
  });
});

describe('isWindowActive', () => {
  it('returns true when inside an active window', () => {
    // Window starts at 22:00, lasts 1 hour. Check at 22:30.
    const window = { kind: 'deny', schedule: '0 22 * * *', duration: '1h' };
    const now = new Date('2024-06-15T22:30:00Z');
    expect(isWindowActive(window, now)).toBe(true);
  });

  it('returns false when outside a window', () => {
    const window = { kind: 'deny', schedule: '0 22 * * *', duration: '1h' };
    const now = new Date('2024-06-15T20:00:00Z');
    expect(isWindowActive(window, now)).toBe(false);
  });

  it('returns true at exact window start', () => {
    const window = { kind: 'deny', schedule: '0 22 * * *', duration: '1h' };
    const now = new Date('2024-06-15T22:00:00Z');
    expect(isWindowActive(window, now)).toBe(true);
  });

  it('returns false just after window ends', () => {
    const window = { kind: 'deny', schedule: '0 22 * * *', duration: '1h' };
    // 23:01 is 61 minutes after 22:00 — outside 1h window
    const now = new Date('2024-06-15T23:01:00Z');
    expect(isWindowActive(window, now)).toBe(false);
  });

  it('returns true at last minute of window', () => {
    const window = { kind: 'deny', schedule: '0 22 * * *', duration: '1h' };
    const now = new Date('2024-06-15T23:00:00Z');
    expect(isWindowActive(window, now)).toBe(true);
  });

  it('defaults duration to 1h when unspecified', () => {
    const window = { kind: 'deny', schedule: '0 22 * * *' };
    const now = new Date('2024-06-15T22:30:00Z');
    expect(isWindowActive(window, now)).toBe(true);
  });
});

describe('matchesApplication', () => {
  it('matches when arrays are empty (applies to all)', () => {
    const window = { kind: 'deny', schedule: '0 22 * * *', duration: '1h' };
    expect(matchesApplication(window, 'my-app', 'default')).toBe(true);
  });

  it('matches exact application name', () => {
    const window = {
      kind: 'deny',
      schedule: '0 22 * * *',
      duration: '1h',
      applications: ['my-app'],
    };
    expect(matchesApplication(window, 'my-app')).toBe(true);
    expect(matchesApplication(window, 'other-app')).toBe(false);
  });

  it('matches glob pattern in applications', () => {
    const window = {
      kind: 'deny',
      schedule: '0 22 * * *',
      duration: '1h',
      applications: ['prod-*'],
    };
    expect(matchesApplication(window, 'prod-api')).toBe(true);
    expect(matchesApplication(window, 'staging-api')).toBe(false);
  });

  it('matches wildcard applications', () => {
    const window = {
      kind: 'deny',
      schedule: '0 22 * * *',
      duration: '1h',
      applications: ['*'],
    };
    expect(matchesApplication(window, 'anything')).toBe(true);
  });

  it('matches namespace filter', () => {
    const window = {
      kind: 'deny',
      schedule: '0 22 * * *',
      duration: '1h',
      namespaces: ['production'],
    };
    expect(matchesApplication(window, 'my-app', 'production')).toBe(true);
    expect(matchesApplication(window, 'my-app', 'staging')).toBe(false);
  });
});

describe('isSyncBlocked', () => {
  it('returns false when no sync windows', () => {
    expect(isSyncBlocked({ spec: {} }, 'my-app')).toBe(false);
  });

  it('returns true when active deny window matches', () => {
    const project = {
      spec: {
        syncWindows: [
          { kind: 'deny', schedule: '0 22 * * *', duration: '1h' },
        ],
      },
    };
    const now = new Date('2024-06-15T22:30:00Z');
    expect(isSyncBlocked(project, 'my-app', undefined, now)).toBe(true);
  });

  it('returns false when deny window is not active', () => {
    const project = {
      spec: {
        syncWindows: [
          { kind: 'deny', schedule: '0 22 * * *', duration: '1h' },
        ],
      },
    };
    const now = new Date('2024-06-15T10:00:00Z');
    expect(isSyncBlocked(project, 'my-app', undefined, now)).toBe(false);
  });

  it('returns false when allow window overrides deny', () => {
    const project = {
      spec: {
        syncWindows: [
          { kind: 'deny', schedule: '0 22 * * *', duration: '2h' },
          { kind: 'allow', schedule: '0 22 * * *', duration: '2h', applications: ['critical-app'] },
        ],
      },
    };
    const now = new Date('2024-06-15T22:30:00Z');
    expect(isSyncBlocked(project, 'critical-app', undefined, now)).toBe(false);
  });

  it('blocks non-override app even with allow for different app', () => {
    const project = {
      spec: {
        syncWindows: [
          { kind: 'deny', schedule: '0 22 * * *', duration: '2h' },
          { kind: 'allow', schedule: '0 22 * * *', duration: '2h', applications: ['critical-app'] },
        ],
      },
    };
    const now = new Date('2024-06-15T22:30:00Z');
    expect(isSyncBlocked(project, 'regular-app', undefined, now)).toBe(true);
  });
});
