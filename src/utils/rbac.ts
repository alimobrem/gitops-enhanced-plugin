interface AppProjectRole {
  name: string;
  description?: string;
  policies?: string[];
  groups?: string[];
}

interface ParsedPolicy {
  subject: string;
  resource: string;
  action: string;
  object: string;
  effect: 'allow' | 'deny';
}

export function parsePolicy(policyStr: string): ParsedPolicy | null {
  const parts = policyStr.split(',').map((s) => s.trim());
  if (parts.length !== 6 || parts[0] !== 'p') return null;

  const effect = parts[5];
  if (effect !== 'allow' && effect !== 'deny') return null;

  return {
    subject: parts[1],
    resource: parts[2],
    action: parts[3],
    object: parts[4],
    effect,
  };
}

export function matchesGlob(pattern: string, value: string): boolean {
  if (pattern === '*') return true;
  if (!pattern.includes('*')) return pattern === value;
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(value);
}

export function evaluateAccess(
  roles: AppProjectRole[],
  subject: string,
  action: string,
  resource: string,
  object?: string,
): { allowed: boolean; matchingPolicy?: string; matchingRole?: string } {
  let bestMatch: { allowed: boolean; matchingPolicy: string; matchingRole: string } | undefined;

  for (const role of roles) {
    const subjectMatches =
      matchesGlob(subject, `proj:*:${role.name}`) ||
      (role.groups ?? []).some((g) => matchesGlob(g, subject) || matchesGlob(subject, g));

    for (const policyStr of role.policies ?? []) {
      const policy = parsePolicy(policyStr);
      if (!policy) continue;

      const policySubjectMatches =
        matchesGlob(policy.subject, subject) ||
        subjectMatches;

      if (
        policySubjectMatches &&
        matchesGlob(policy.resource, resource) &&
        matchesGlob(policy.action, action) &&
        (object === undefined || matchesGlob(policy.object, object))
      ) {
        const candidate = {
          allowed: policy.effect === 'allow',
          matchingPolicy: policyStr,
          matchingRole: role.name,
        };

        if (!candidate.allowed) return candidate;
        if (!bestMatch) bestMatch = candidate;
      }
    }
  }

  if (bestMatch) return bestMatch;
  return { allowed: false };
}
