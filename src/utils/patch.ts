interface PatchOp {
  op: 'add' | 'replace' | 'remove';
  path: string;
  value: unknown;
}

export function safePatch(resource: Record<string, unknown>, path: string, value: unknown): PatchOp {
  const parts = path.split('/').filter(Boolean);
  let current: unknown = resource;
  for (const part of parts.slice(0, -1)) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return { op: 'add', path, value };
    }
  }
  const lastPart = parts[parts.length - 1];
  if (current && typeof current === 'object' && lastPart in (current as Record<string, unknown>)) {
    return { op: 'replace', path, value };
  }
  return { op: 'add', path, value };
}

export function safeRemove(resource: Record<string, unknown>, path: string): PatchOp | null {
  const parts = path.split('/').filter(Boolean);
  let current: unknown = resource;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }
  return { op: 'remove', path, value: null };
}
