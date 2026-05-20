import { GITOPS_APP_TYPE } from './gitops-topology-plugin';

export const gitopsTopologyDataFactory = {
  id: 'gitops-topology-data',
  priority: 100,
  resources: {
    applications: {
      model: {
        group: 'argoproj.io',
        version: 'v1alpha1',
        kind: 'Application',
      },
    },
  },
  getDataModel: () => {
    return (
      _namespace: string,
      resources: Record<string, { data: Array<Record<string, unknown>> }>,
    ) => {
      const apps = resources?.applications?.data ?? [];

      return {
        nodes: apps.map((app: Record<string, unknown>) => {
          const metadata = app.metadata as { uid: string; name: string };
          const status = app.status as {
            sync?: { status?: string };
            health?: { status?: string };
          } | undefined;

          return {
            id: `gitops-${metadata.uid}`,
            type: GITOPS_APP_TYPE,
            label: metadata.name,
            width: 104,
            height: 104,
            data: {
              resource: app,
              syncStatus: status?.sync?.status ?? 'Unknown',
              healthStatus: status?.health?.status ?? 'Unknown',
            },
          };
        }),
        edges: [],
      };
    };
  },
  isResourceDepicted: () => false,
};
