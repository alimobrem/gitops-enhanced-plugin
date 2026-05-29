import type { ApplicationResource } from '../types/application';

export interface NotificationEntry {
  appName: string;
  appNamespace: string;
  trigger: string;
  template: string;
  lastNotified: string;
}

const NOTIFICATION_PREFIX = 'notified.argoproj.io/';

function parseTimestamp(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return (parsed as Record<string, string>).timestamp ?? raw;
    }
    return String(parsed);
  } catch {
    return raw;
  }
}

export function parseNotificationAnnotations(
  app: ApplicationResource,
): NotificationEntry[] {
  const annotations = app.metadata.annotations ?? {};
  const entries: NotificationEntry[] = [];

  for (const [key, value] of Object.entries(annotations)) {
    if (!key.startsWith(NOTIFICATION_PREFIX)) continue;

    const suffix = key.slice(NOTIFICATION_PREFIX.length);
    const dotIdx = suffix.indexOf('.');
    if (dotIdx === -1) continue;

    const trigger = suffix.slice(0, dotIdx);
    const template = suffix.slice(dotIdx + 1);

    entries.push({
      appName: app.metadata.name,
      appNamespace: app.metadata.namespace,
      trigger,
      template,
      lastNotified: parseTimestamp(value),
    });
  }

  return entries.sort(
    (a, b) =>
      new Date(b.lastNotified).getTime() - new Date(a.lastNotified).getTime(),
  );
}
