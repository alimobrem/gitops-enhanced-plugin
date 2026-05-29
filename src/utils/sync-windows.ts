import type { AppProjectResource } from '../types/appproject';

type SyncWindow = NonNullable<AppProjectResource['spec']['syncWindows']>[number];

export function parseDuration(duration: string): number {
  let ms = 0;
  const re = /(\d+)(h|m|s)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(duration)) !== null) {
    const val = parseInt(match[1], 10);
    switch (match[2]) {
      case 'h': ms += val * 3600000; break;
      case 'm': ms += val * 60000; break;
      case 's': ms += val * 1000; break;
    }
  }
  return ms;
}

function matchCronField(field: string, value: number): boolean {
  if (field === '*') return true;
  return field.split(',').some((part) => {
    if (part.includes('-')) {
      const [lo, hi] = part.split('-').map(Number);
      return value >= lo && value <= hi;
    }
    return Number(part) === value;
  });
}

export function matchesCron(schedule: string, date: Date): boolean {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [minute, hour, dom, month, dow] = parts;
  return (
    matchCronField(minute, date.getUTCMinutes()) &&
    matchCronField(hour, date.getUTCHours()) &&
    matchCronField(dom, date.getUTCDate()) &&
    matchCronField(month, date.getUTCMonth() + 1) &&
    matchCronField(dow, date.getUTCDay())
  );
}

export function isWindowActive(window: SyncWindow, now?: Date): boolean {
  const current = now ?? new Date();
  const durationMs = parseDuration(window.duration ?? '1h');
  const currentMs = current.getTime();

  for (let offset = 0; offset <= durationMs; offset += 60000) {
    const candidate = new Date(currentMs - offset);
    candidate.setUTCSeconds(0, 0);
    if (matchesCron(window.schedule, candidate)) {
      return true;
    }
  }
  return false;
}

function matchesGlobList(patterns: string[] | undefined, value: string): boolean {
  if (!patterns || patterns.length === 0) return true;
  return patterns.some((p) => {
    if (p === '*') return true;
    if (p.endsWith('*')) return value.startsWith(p.slice(0, -1));
    return p === value;
  });
}

export function matchesApplication(
  window: SyncWindow,
  appName: string,
  appNamespace?: string,
): boolean {
  const appMatch = matchesGlobList(window.applications, appName);
  const nsMatch = appNamespace
    ? matchesGlobList(window.namespaces, appNamespace)
    : matchesGlobList(window.namespaces, '');
  return appMatch && nsMatch;
}

export function isSyncBlocked(
  project: { spec?: { syncWindows?: SyncWindow[] } },
  appName: string,
  appNamespace?: string,
  now?: Date,
): boolean {
  const windows = project.spec?.syncWindows;
  if (!windows || windows.length === 0) return false;

  const activeWindows = windows.filter(
    (w) => isWindowActive(w, now) && matchesApplication(w, appName, appNamespace),
  );

  const hasActiveDeny = activeWindows.some((w) => w.kind === 'deny');
  const hasActiveAllow = activeWindows.some((w) => w.kind === 'allow');

  return hasActiveDeny && !hasActiveAllow;
}
