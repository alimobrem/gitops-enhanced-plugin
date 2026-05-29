import { parsePolicy, matchesGlob, evaluateAccess } from './rbac';

describe('parsePolicy', () => {
  it('parses a valid allow policy', () => {
    const result = parsePolicy('p, proj:myproject:admin, applications, sync, myproject/*, allow');
    expect(result).toEqual({
      subject: 'proj:myproject:admin',
      resource: 'applications',
      action: 'sync',
      object: 'myproject/*',
      effect: 'allow',
    });
  });

  it('parses a valid deny policy', () => {
    const result = parsePolicy('p, proj:myproject:readonly, applications, sync, myproject/*, deny');
    expect(result).toEqual({
      subject: 'proj:myproject:readonly',
      resource: 'applications',
      action: 'sync',
      object: 'myproject/*',
      effect: 'deny',
    });
  });

  it('returns null for non-policy lines', () => {
    expect(parsePolicy('g, my-group, proj:myproject:admin')).toBeNull();
  });

  it('returns null for wrong field count', () => {
    expect(parsePolicy('p, subject, resource, action')).toBeNull();
  });

  it('returns null for invalid effect', () => {
    expect(parsePolicy('p, sub, res, act, obj, maybe')).toBeNull();
  });

  it('handles extra whitespace', () => {
    const result = parsePolicy('p,  proj:p:r ,  applications ,  get ,  p/* ,  allow');
    expect(result).toEqual({
      subject: 'proj:p:r',
      resource: 'applications',
      action: 'get',
      object: 'p/*',
      effect: 'allow',
    });
  });
});

describe('matchesGlob', () => {
  it('matches exact strings', () => {
    expect(matchesGlob('applications', 'applications')).toBe(true);
    expect(matchesGlob('applications', 'repositories')).toBe(false);
  });

  it('matches wildcard *', () => {
    expect(matchesGlob('*', 'anything')).toBe(true);
  });

  it('matches prefix wildcard', () => {
    expect(matchesGlob('myproject/*', 'myproject/my-app')).toBe(true);
    expect(matchesGlob('myproject/*', 'other/my-app')).toBe(false);
  });

  it('matches wildcard in middle', () => {
    expect(matchesGlob('proj:*:admin', 'proj:myproject:admin')).toBe(true);
    expect(matchesGlob('proj:*:admin', 'proj:myproject:readonly')).toBe(false);
  });
});

describe('evaluateAccess', () => {
  const roles = [
    {
      name: 'admin',
      policies: [
        'p, proj:myproject:admin, applications, *, myproject/*, allow',
      ],
      groups: ['platform-team'],
    },
    {
      name: 'readonly',
      policies: [
        'p, proj:myproject:readonly, applications, get, myproject/*, allow',
        'p, proj:myproject:readonly, applications, sync, myproject/*, deny',
      ],
      groups: ['dev-team'],
    },
  ];

  it('allows access when policy matches', () => {
    const result = evaluateAccess(
      roles,
      'proj:myproject:admin',
      'sync',
      'applications',
      'myproject/my-app',
    );
    expect(result.allowed).toBe(true);
    expect(result.matchingRole).toBe('admin');
  });

  it('denies access when deny policy matches', () => {
    const result = evaluateAccess(
      roles,
      'proj:myproject:readonly',
      'sync',
      'applications',
      'myproject/my-app',
    );
    expect(result.allowed).toBe(false);
    expect(result.matchingRole).toBe('readonly');
  });

  it('defaults to deny when no policy matches', () => {
    const result = evaluateAccess(
      roles,
      'proj:myproject:unknown',
      'delete',
      'applications',
      'myproject/my-app',
    );
    expect(result.allowed).toBe(false);
    expect(result.matchingPolicy).toBeUndefined();
  });

  it('deny overrides allow across roles', () => {
    const mixedRoles = [
      {
        name: 'allow-role',
        policies: ['p, proj:p:user, applications, sync, p/*, allow'],
        groups: [],
      },
      {
        name: 'deny-role',
        policies: ['p, proj:p:user, applications, sync, p/*, deny'],
        groups: [],
      },
    ];
    const result = evaluateAccess(
      mixedRoles,
      'proj:p:user',
      'sync',
      'applications',
      'p/my-app',
    );
    expect(result.allowed).toBe(false);
  });

  it('matches via group membership', () => {
    const result = evaluateAccess(
      roles,
      'platform-team',
      'sync',
      'applications',
      'myproject/my-app',
    );
    expect(result.allowed).toBe(true);
    expect(result.matchingRole).toBe('admin');
  });

  it('matches wildcard subject in policy', () => {
    const wildcardRoles = [
      {
        name: 'public',
        policies: ['p, *, applications, get, default/*, allow'],
        groups: [],
      },
    ];
    const result = evaluateAccess(
      wildcardRoles,
      'anyone',
      'get',
      'applications',
      'default/my-app',
    );
    expect(result.allowed).toBe(true);
  });

  it('handles roles with no policies', () => {
    const emptyRoles = [{ name: 'empty', groups: [] }];
    const result = evaluateAccess(
      emptyRoles,
      'proj:p:empty',
      'get',
      'applications',
    );
    expect(result.allowed).toBe(false);
  });
});
