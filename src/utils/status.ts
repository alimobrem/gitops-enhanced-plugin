import type { SyncStatusCode, HealthStatusCode } from '../types';

export const syncStatusColor: Record<SyncStatusCode, string> = {
  Synced: 'var(--pf-t--global--color--status--success--default)',
  OutOfSync: 'var(--pf-t--global--color--status--warning--default)',
  Unknown: 'var(--pf-t--global--color--status--info--default)',
};

export const healthStatusColor: Record<HealthStatusCode, string> = {
  Healthy: 'var(--pf-t--global--color--status--success--default)',
  Degraded: 'var(--pf-t--global--color--status--danger--default)',
  Progressing: 'var(--pf-t--global--color--status--info--default)',
  Suspended: 'var(--pf-t--global--color--status--info--default)',
  Missing: 'var(--pf-t--global--color--status--warning--default)',
  Unknown: 'var(--pf-t--global--color--status--info--default)',
};
