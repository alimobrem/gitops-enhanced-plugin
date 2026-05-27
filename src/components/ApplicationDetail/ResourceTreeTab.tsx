import React from 'react';
import { useEffect, useMemo, useState, useCallback, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bullseye,
  Spinner,
  EmptyState,
  EmptyStateBody,
  PageSection,
  Drawer,
  DrawerContent,
  DrawerContentBody,
} from '@patternfly/react-core';
import {
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
  GRAPH_LAYOUT_END_EVENT,
  SELECTION_EVENT,
  ModelKind,
  GraphComponent,
  DefaultNode,
  DefaultEdge,
  DefaultGroup,
  NodeStatus,
  withPanZoom,
  withSelection,
  useVisualizationController,
  DagreLayout,
  TOP_TO_BOTTOM,
} from '@patternfly/react-topology';
import type {
  Model,
  ComponentFactory,
  Graph,
  Layout,
  LayoutFactory,
  SelectionEventListener,
} from '@patternfly/react-topology';
import './ResourceTreeTab.css';
import { ResourceDrawer } from './ResourceDrawer';
import type { ApplicationResource, SyncStatusCode } from '../../types';

interface ManagedResource {
  group?: string;
  version: string;
  kind: string;
  namespace?: string;
  name: string;
  status: SyncStatusCode;
  health?: { status: string };
}

const KIND_ABBR: Record<string, string> = {
  Service: 'svc',
  Deployment: 'deploy',
  ReplicaSet: 'rs',
  Pod: 'pod',
  ConfigMap: 'cm',
  Secret: 'sec',
  Ingress: 'ing',
  StatefulSet: 'sts',
  DaemonSet: 'ds',
  Job: 'job',
  CronJob: 'cj',
  PersistentVolumeClaim: 'pvc',
  ServiceAccount: 'sa',
  NetworkPolicy: 'netpol',
  HorizontalPodAutoscaler: 'hpa',
  Application: 'app',
};

function kindBadge(kind: string): string {
  return KIND_ABBR[kind] ?? kind.toLowerCase().slice(0, 4);
}

function healthToNodeStatus(health?: string): NodeStatus {
  switch (health) {
    case 'Healthy':
      return NodeStatus.success;
    case 'Degraded':
      return NodeStatus.danger;
    case 'Progressing':
      return NodeStatus.info;
    default:
      return NodeStatus.default;
  }
}

function resourceNodeId(r: ManagedResource): string {
  return `${r.kind}/${r.namespace ?? ''}/${r.name}`;
}

const LAYOUT_ID = 'DagreLayout';

const CustomNode = withSelection()(DefaultNode);

const componentFactory: ComponentFactory = (kind, _type) => {
  switch (kind) {
    case ModelKind.graph:
      return withPanZoom()(GraphComponent);
    case ModelKind.node:
      return CustomNode;
    case ModelKind.edge:
      return DefaultEdge;
    default:
      return DefaultGroup;
  }
};

const layoutFactory: LayoutFactory = (type: string, graph: Graph): Layout =>
  new DagreLayout(graph, { rankdir: TOP_TO_BOTTOM, nodesep: 40, ranksep: 60 });

interface ResourceTreeContentProps {
  app: ApplicationResource;
}

const ResourceTreeContent: FC<ResourceTreeContentProps> = ({ app }) => {
  const controller = useVisualizationController();
  const { t } = useTranslation('plugin__gitops-enhanced');

  const resources: ManagedResource[] = useMemo(
    () => (app.status?.resources ?? []) as ManagedResource[],
    [app.status?.resources],
  );

  const [drawerResource, setDrawerResource] = useState<ManagedResource | null>(null);

  // Build and apply the topology model
  useEffect(() => {
    const nodes = [
      {
        id: 'app',
        type: 'node',
        label: app.metadata?.name ?? t('Application'),
        width: 120,
        height: 40,
        data: {
          kind: 'Application',
          sync: app.status?.sync?.status,
          health: app.status?.health?.status,
          badge: kindBadge('Application'),
          nodeStatus: healthToNodeStatus(app.status?.health?.status),
        },
      },
      ...resources.map((r) => ({
        id: resourceNodeId(r),
        type: 'node',
        label: r.name,
        width: 120,
        height: 40,
        data: {
          kind: r.kind,
          sync: r.status,
          health: r.health?.status,
          badge: kindBadge(r.kind),
          nodeStatus: healthToNodeStatus(r.health?.status),
        },
      })),
    ];

    const edges = resources.map((r, i) => ({
      id: `edge-${i}`,
      type: 'edge',
      source: 'app',
      target: resourceNodeId(r),
    }));

    const model: Model = {
      graph: {
        id: 'resource-tree-graph',
        type: 'graph',
        layout: LAYOUT_ID,
      },
      nodes,
      edges,
    };

    controller.fromModel(model, false);
  }, [controller, app, resources, t]);

  // Fit graph after layout completes
  useEffect(() => {
    const onLayoutEnd = () => {
      controller.getGraph()?.fit(40);
    };
    controller.addEventListener(GRAPH_LAYOUT_END_EVENT, onLayoutEnd);
    return () => {
      controller.removeEventListener(GRAPH_LAYOUT_END_EVENT, onLayoutEnd);
    };
  }, [controller]);

  // Handle node selection
  const handleSelection: SelectionEventListener = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) {
        setDrawerResource(null);
        return;
      }
      const nodeId = ids[0];
      if (nodeId === 'app') return;
      const res = resources.find(
        (r) => resourceNodeId(r) === nodeId,
      );
      if (res) {
        setDrawerResource(res);
      }
    },
    [resources],
  );

  useEffect(() => {
    controller.addEventListener(SELECTION_EVENT, handleSelection);
    return () => {
      controller.removeEventListener(SELECTION_EVENT, handleSelection);
    };
  }, [controller, handleSelection]);

  if (resources.length === 0) {
    return (
      <EmptyState>
        <EmptyStateBody>{t('No managed resources found.')}</EmptyStateBody>
      </EmptyState>
    );
  }

  const drawerPanel = drawerResource ? (
    <ResourceDrawer resource={drawerResource} onClose={() => setDrawerResource(null)} />
  ) : undefined;

  return (
    <Drawer isExpanded={!!drawerResource} onExpand={() => undefined}>
      <DrawerContent panelContent={drawerPanel}>
        <DrawerContentBody>
          <div className="gitops-resource-tree">
            <VisualizationSurface />
          </div>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export const ResourceTreeTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const app = obj as ApplicationResource | undefined;

  if (!app?.metadata) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  const controller = new Visualization();
  controller.registerComponentFactory(componentFactory);
  controller.registerLayoutFactory(layoutFactory);

  return (
    <PageSection>
      <VisualizationProvider controller={controller}>
        <ResourceTreeContent app={app} />
      </VisualizationProvider>
    </PageSection>
  );
};

export default ResourceTreeTab;
