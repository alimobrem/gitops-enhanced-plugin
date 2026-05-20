interface PatchOp {
  op: 'add' | 'replace' | 'remove';
  path: string;
  value: unknown;
}

export function safePatch(resource: unknown, path: string, value: unknown): PatchOp {
  const parts = path.split('/').filter(Boolean);
  let current: unknown = resource;
  for (const part of parts.slice(0, -1)) {
    if (current == null || typeof current !== 'object') return { op: 'add', path, value };
    if (Array.isArray(current)) {
      const idx = parseInt(part, 10);
      if (isNaN(idx) || idx >= current.length) return { op: 'add', path, value };
      current = current[idx];
    } else if (part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return { op: 'add', path, value };
    }
  }
  const lastPart = parts[parts.length - 1];
  if (current == null || typeof current !== 'object') return { op: 'add', path, value };
  if (Array.isArray(current)) {
    const idx = parseInt(lastPart, 10);
    return { op: !isNaN(idx) && idx < current.length ? 'replace' : 'add', path, value };
  }
  return { op: lastPart in (current as Record<string, unknown>) ? 'replace' : 'add', path, value };
}

export function safeRemove(resource: unknown, path: string): PatchOp | null {
  const parts = path.split('/').filter(Boolean);
  let current: unknown = resource;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return null;
    if (Array.isArray(current)) {
      const idx = parseInt(part, 10);
      if (isNaN(idx) || idx >= current.length) return null;
      current = current[idx];
    } else if (part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }
  return { op: 'remove', path, value: null };
}
