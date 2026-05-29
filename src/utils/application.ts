import type { ApplicationResource, ApplicationSource } from '../types';

export function getApplicationSource(app: ApplicationResource): ApplicationSource | undefined {
  return app.spec.source ?? app.spec.sources?.[0];
}

export function isMultiSource(app: ApplicationResource): boolean {
  return !app.spec.source && Array.isArray(app.spec.sources) && app.spec.sources.length > 0;
}

export function conditionToAlertVariant(conditionType: string): 'danger' | 'warning' | 'info' {
  switch (conditionType) {
    case 'ComparisonError':
    case 'SyncError':
    case 'InvalidSpecError':
      return 'danger';
    case 'ExcludedResourceWarning':
      return 'info';
    default:
      return 'warning';
  }
}

export function resourceKey(r: { group?: string; kind: string; name: string; namespace?: string }): string {
  return `${r.group ?? ''}/${r.kind}/${r.namespace ?? ''}/${r.name}`;
}

export function decodeBase64(val?: string): string {
  if (!val) return '';
  try { return atob(val); } catch { return val; }
}

export function getAllSources(app: ApplicationResource): Array<ApplicationSource & { index: number }> {
  if (app.spec?.sources?.length) {
    return app.spec.sources.map((s, i) => ({ ...s, index: i }));
  }
  const single = app.spec?.source;
  return single ? [{ ...single, index: 0 }] : [];
}
