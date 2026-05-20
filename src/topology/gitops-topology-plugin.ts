import {
  Model,
  NodeModel,
  NodeShape,
  ModelKind,
} from '@patternfly/react-topology';
import type { ApplicationResource } from '../types';

export const GITOPS_APP_TYPE = 'gitops-application';
export const GITOPS_GROUP_TYPE = 'gitops-application-group';

export function getTopologyDataModel(
  namespace: string,
  applications: ApplicationResource[],
): Model {
  const nsApps = applications.filter(
    (a) => a.spec.destination.namespace === namespace,
  );

  const nodes: NodeModel[] = nsApps.map((app) => ({
    id: `gitops-${app.metadata.uid}`,
    type: GITOPS_APP_TYPE,
    label: app.metadata.name,
    width: 104,
    height: 104,
    shape: NodeShape.rect,
    data: {
      resource: app,
      syncStatus: app.status?.sync?.status ?? 'Unknown',
      healthStatus: app.status?.health?.status ?? 'Unknown',
      kind: 'Application',
      resources: {
        obj: app,
      },
    },
  }));

  return {
    nodes,
    edges: [],
    graph: {
      id: 'gitops-topology',
      type: ModelKind.graph,
      layout: 'Cola',
    },
  };
}
