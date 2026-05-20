import type { ApplicationResource, ApplicationSource } from '../types';

export function getApplicationSource(app: ApplicationResource): ApplicationSource | undefined {
  return app.spec.source ?? app.spec.sources?.[0];
}

export function isMultiSource(app: ApplicationResource): boolean {
  return !app.spec.source && Array.isArray(app.spec.sources) && app.spec.sources.length > 0;
}
