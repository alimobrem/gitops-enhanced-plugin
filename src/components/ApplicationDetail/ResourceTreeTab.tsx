import React from 'react';
import { useEffect, useMemo, useState, useCallback, useRef, type FC } from 'react';
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
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Button,
  Label,
} from '@patternfly/react-core';
import { SearchPlusIcon, SearchMinusIcon, ExpandArrowsAltIcon } from '@patternfly/react-icons';
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
import '@patternfly/react-topology/dist/esm/css/topology-components.css';
import '@patternfly/react-topology/dist/esm/css/topology-controlbar.css';
import '@patternfly/react-topology/dist/esm/css/topology-view.css';
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
    case 'Healthy': return NodeStatus.success;
    case 'Degraded': return NodeStatus.danger;
    case 'Progressing': return NodeStatus.info;
    case 'Suspended': return NodeStatus.warning;
    default: return NodeStatus.default;
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

const layoutFactory: LayoutFactory = (_type: string, graph: Graph): Layout =>
  new DagreLayout(graph, { rankdir: TOP_TO_BOTTOM, nodesep: 60, ranksep: 80 });

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

  useEffect(() => {
    const appName = app.metadata?.name ?? t('Application');
    const nodes = [
      {
        id: 'app',
        type: 'node',
        label: appName,
        width: 160,
        height: 50,
        data: {
          badge: kindBadge('Application'),
          badgeColor: '#0066cc',
          isRoot: true,
        },
        status: healthToNodeStatus(app.status?.health?.status),
      },
      ...resources.map((r) => ({
        id: resourceNodeId(r),
        type: 'node',
        label: r.name,
        width: 160,
        height: 50,
        data: {
          badge: kindBadge(r.kind),
          badgeColor: r.health?.status === 'Healthy' ? '#3e8635' : r.health?.status === 'Degraded' ? '#c9190b' : '#6a6e73',
        },
        status: healthToNodeStatus(r.health?.status),
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

  useEffect(() => {
    const onLayoutEnd = () => {
      controller.getGraph()?.fit(50);
    };
    controller.addEventListener(GRAPH_LAYOUT_END_EVENT, onLayoutEnd);
    return () => controller.removeEventListener(GRAPH_LAYOUT_END_EVENT, onLayoutEnd);
  }, [controller]);

  const handleSelection: SelectionEventListener = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) { setDrawerResource(null); return; }
      const nodeId = ids[0];
      if (nodeId === 'app') return;
      const res = resources.find((r) => resourceNodeId(r) === nodeId);
      if (res) setDrawerResource(res);
    },
    [resources],
  );

  useEffect(() => {
    controller.addEventListener(SELECTION_EVENT, handleSelection);
    return () => controller.removeEventListener(SELECTION_EVENT, handleSelection);
  }, [controller, handleSelection]);

  const handleFitToScreen = () => controller.getGraph()?.fit(50);
  const handleZoomIn = () => controller.getGraph()?.scaleBy(1.2);
  const handleZoomOut = () => controller.getGraph()?.scaleBy(0.8);

  if (resources.length === 0) {
    return <EmptyState><EmptyStateBody>{t('No managed resources found.')}</EmptyStateBody></EmptyState>;
  }

  const syncedCount = resources.filter((r) => r.status === 'Synced').length;
  const healthyCount = resources.filter((r) => r.health?.status === 'Healthy').length;

  const drawerPanel = drawerResource ? (
    <ResourceDrawer resource={drawerResource} appName={app.metadata.name} appNamespace={app.metadata.namespace} onClose={() => setDrawerResource(null)} />
  ) : undefined;

  return (
    <>
      <Toolbar className="pf-v6-u-mb-sm">
        <ToolbarContent>
          <ToolbarItem>
            <Label isCompact color="blue">{resources.length} {t('resources')}</Label>
          </ToolbarItem>
          <ToolbarItem>
            <Label isCompact color={syncedCount === resources.length ? 'green' : 'gold'}>{syncedCount}/{resources.length} {t('Synced')}</Label>
          </ToolbarItem>
          <ToolbarItem>
            <Label isCompact color={healthyCount === resources.length ? 'green' : 'gold'}>{healthyCount}/{resources.length} {t('Healthy')}</Label>
          </ToolbarItem>
          <ToolbarItem variant="separator" />
          <ToolbarItem>
            <Button variant="plain" aria-label={t('Zoom in')} onClick={handleZoomIn}><SearchPlusIcon /></Button>
          </ToolbarItem>
          <ToolbarItem>
            <Button variant="plain" aria-label={t('Zoom out')} onClick={handleZoomOut}><SearchMinusIcon /></Button>
          </ToolbarItem>
          <ToolbarItem>
            <Button variant="plain" aria-label={t('Fit to screen')} onClick={handleFitToScreen}><ExpandArrowsAltIcon /></Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <Drawer isExpanded={!!drawerResource}>
        <DrawerContent panelContent={drawerPanel}>
          <DrawerContentBody>
            <div className="gitops-resource-tree">
              <VisualizationSurface />
            </div>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export const ResourceTreeTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const app = obj as ApplicationResource | undefined;

  const controllerRef = useRef<Visualization | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new Visualization();
    controllerRef.current.registerComponentFactory(componentFactory);
    controllerRef.current.registerLayoutFactory(layoutFactory);
  }

  if (!app?.metadata) {
    return <Bullseye><Spinner /></Bullseye>;
  }

  return (
    <PageSection>
      <VisualizationProvider controller={controllerRef.current}>
        <ResourceTreeContent app={app} />
      </VisualizationProvider>
    </PageSection>
  );
};

export default ResourceTreeTab;
