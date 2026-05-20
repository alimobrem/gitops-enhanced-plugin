import type { ApplicationResource } from '../types';

export const GITOPS_NODE_TYPE = 'gitops-application';

export interface GitOpsTopologyNode {
  id: string;
  type: string;
  label: string;
  data: {
    resource: ApplicationResource;
    syncStatus: string;
    healthStatus: string;
  };
}

export function transformApplicationsToTopologyNodes(
  apps: ApplicationResource[],
): GitOpsTopologyNode[] {
  return apps.map((app) => ({
    id: `gitops-${app.metadata.uid}`,
    type: GITOPS_NODE_TYPE,
    label: app.metadata.name,
    data: {
      resource: app,
      syncStatus: app.status?.sync?.status ?? 'Unknown',
      healthStatus: app.status?.health?.status ?? 'Unknown',
    },
  }));
}
