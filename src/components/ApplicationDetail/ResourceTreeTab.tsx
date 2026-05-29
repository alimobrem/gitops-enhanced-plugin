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
  Switch,
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
  Node,
} from '@patternfly/react-topology';
import '@patternfly/react-topology/dist/esm/css/topology-components.css';
import '@patternfly/react-topology/dist/esm/css/topology-controlbar.css';
import '@patternfly/react-topology/dist/esm/css/topology-view.css';
import './ResourceTreeTab.css';
import { ResourceDrawer } from './ResourceDrawer';
import { useResourceTree } from '../../hooks/useResourceTree';
import { nodeKey, buildHierarchy, findDegradedPaths } from '../../utils/tree';
import type { ApplicationResource, SyncStatusCode } from '../../types';
import type { ResourceNode } from '../../types/argocd-api';

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
  Service: 'SVC',
  Deployment: 'D',
  ReplicaSet: 'RS',
  Pod: 'P',
  ConfigMap: 'CM',
  Secret: 'S',
  Ingress: 'ING',
  StatefulSet: 'SS',
  DaemonSet: 'DS',
  Job: 'J',
  CronJob: 'CJ',
  PersistentVolumeClaim: 'PVC',
  ServiceAccount: 'SA',
  NetworkPolicy: 'NP',
  HorizontalPodAutoscaler: 'HPA',
  Application: 'APP',
  Route: 'RT',
  Rollout: 'RO',
  EndpointSlice: 'EP',
};

const KIND_COLOR: Record<string, string> = {
  Deployment: '#004080',
  ReplicaSet: '#0066cc',
  Pod: '#009596',
  Service: '#6753ac',
  Ingress: '#8476d1',
  Route: '#8476d1',
  ConfigMap: '#3e8635',
  Secret: '#c46100',
  StatefulSet: '#004080',
  DaemonSet: '#004080',
  Job: '#005f60',
  CronJob: '#005f60',
  PersistentVolumeClaim: '#2b9af3',
  Application: '#06c',
  Rollout: '#004080',
};

function kindAbbr(kind: string): string {
  return KIND_ABBR[kind] ?? kind.toUpperCase().slice(0, 3);
}

function kindColor(kind: string): string {
  return KIND_COLOR[kind] ?? '#6a6e73';
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

const STATUS_RING_COLOR: Record<string, string> = {
  [NodeStatus.success]: '#3e8635',
  [NodeStatus.danger]: '#c9190b',
  [NodeStatus.info]: '#06c',
  [NodeStatus.warning]: '#f0ab00',
  [NodeStatus.default]: '#d2d2d2',
};

function resourceNodeId(r: ManagedResource): string {
  return `${r.kind}/${r.namespace ?? ''}/${r.name}`;
}

const LAYOUT_ID = 'DagreLayout';

const NODE_WIDTH = 104;
const NODE_HEIGHT = 104;
const ICON_RADIUS = 28;

const ResourceIconNode: FC<{ element?: Node }> = ({ element }) => {
  if (!element) return null;
  const data = element.getData() ?? {};
  const label = element.getLabel?.() ?? '';
  const status = (element as unknown as { getNodeStatus?: () => string }).getNodeStatus?.() ?? NodeStatus.default;
  const ringColor = STATUS_RING_COLOR[status] ?? STATUS_RING_COLOR[NodeStatus.default];
  const selected = (element as unknown as { isSelected?: () => boolean }).isSelected?.() ?? false;
  const abbr = data.badge ?? '?';
  const bgColor = data.badgeColor ?? '#6a6e73';
  const dimmed = data.dimmed;
  const isDegradedNode = data.isDegradedNode;

  const cx = NODE_WIDTH / 2;
  const cy = 36;

  return (
    <g
      className={[
        dimmed ? 'gitops-node--dimmed' : '',
        isDegradedNode ? 'gitops-node--degraded' : '',
      ].filter(Boolean).join(' ') || undefined}
    >
      <circle cx={cx} cy={cy} r={ICON_RADIUS + 4} fill="none" stroke={ringColor} strokeWidth={selected ? 3 : 2} />
      <circle cx={cx} cy={cy} r={ICON_RADIUS} fill={bgColor} />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={abbr.length > 3 ? 10 : 12}
        fontWeight={700}
        fontFamily="var(--pf-t--global--font--family--mono, monospace)"
      >
        {abbr}
      </text>
      <text
        x={cx}
        y={cy + ICON_RADIUS + 16}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--pf-t--global--text--color--regular, #151515)"
        fontSize={11}
        fontFamily="var(--pf-t--global--font--family--body, RedHatText, sans-serif)"
      >
        {label.length > 18 ? `${label.slice(0, 16)}…` : label}
      </text>
      {selected && (
        <rect
          x={1} y={1}
          width={NODE_WIDTH - 2} height={NODE_HEIGHT - 2}
          fill="none"
          stroke="var(--pf-t--global--color--brand--default, #06c)"
          strokeWidth={2}
          rx={8}
        />
      )}
    </g>
  );
};

const SelectableResourceNode = withSelection()(ResourceIconNode as FC);

const componentFactory: ComponentFactory = (kind, _type) => {
  switch (kind) {
    case ModelKind.graph:
      return withPanZoom()(GraphComponent);
    case ModelKind.node:
      return SelectableResourceNode;
    case ModelKind.edge:
      return DefaultEdge;
    default:
      return DefaultGroup;
  }
};

const layoutFactory: LayoutFactory = (_type: string, graph: Graph): Layout =>
  new DagreLayout(graph, { rankdir: TOP_TO_BOTTOM, nodesep: 40, ranksep: 60 });

interface ResourceTreeContentProps {
  app: ApplicationResource;
}

const ResourceTreeContent: FC<ResourceTreeContentProps> = ({ app }) => {
  const controller = useVisualizationController();
  const { t } = useTranslation('plugin__gitops-enhanced');

  const appName = app.metadata?.name ?? t('Application');
  const appNamespace = app.metadata?.namespace ?? '';

  const { tree, loaded: treeLoaded, error: treeError } = useResourceTree(appName, appNamespace);

  const flatResources: ManagedResource[] = useMemo(
    () => (app.status?.resources ?? []) as ManagedResource[],
    [app.status?.resources],
  );

  const useHierarchy = treeLoaded && !treeError && tree && tree.nodes.length > 0;

  const [focusIssues, setFocusIssues] = useState(false);
  const [drawerResource, setDrawerResource] = useState<ManagedResource | null>(null);

  const degradedPaths = useMemo(() => {
    if (!useHierarchy || !tree) return new Set<string>();
    return findDegradedPaths(tree.nodes);
  }, [useHierarchy, tree]);

  const { modelNodes, modelEdges, resourceCount } = useMemo(() => {
    const makeAppNode = () => ({
      id: 'app',
      type: 'node',
      label: appName,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      data: {
        badge: kindAbbr('Application'),
        badgeColor: kindColor('Application'),
        isRoot: true,
        dimmed: false,
        isDegradedNode: false,
      },
      status: healthToNodeStatus(app.status?.health?.status),
    });

    if (useHierarchy && tree) {
      const { edges: hierarchyEdges } = buildHierarchy(tree.nodes, appName);
      const nodes = [
        makeAppNode(),
        ...tree.nodes.map((n: ResourceNode) => {
          const key = nodeKey(n);
          const onDegradedPath = degradedPaths.has(key);
          const isDegradedNode = n.health?.status !== undefined && n.health.status !== 'Healthy';
          return {
            id: key,
            type: 'node',
            label: n.name,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            data: {
              badge: kindAbbr(n.kind),
              badgeColor: kindColor(n.kind),
              dimmed: focusIssues && !onDegradedPath,
              isDegradedNode: focusIssues && isDegradedNode,
            },
            status: focusIssues && !onDegradedPath ? NodeStatus.default : healthToNodeStatus(n.health?.status),
          };
        }),
      ];
      const edges = hierarchyEdges.map((e, i) => ({
        id: `edge-${i}`,
        type: 'edge',
        source: e.source,
        target: e.target,
      }));
      return { modelNodes: nodes, modelEdges: edges, resourceCount: tree.nodes.length };
    }

    const nodes = [
      makeAppNode(),
      ...flatResources.map((r) => ({
        id: resourceNodeId(r),
        type: 'node',
        label: r.name,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        data: {
          badge: kindAbbr(r.kind),
          badgeColor: kindColor(r.kind),
          dimmed: false,
          isDegradedNode: false,
        },
        status: healthToNodeStatus(r.health?.status),
      })),
    ];
    const edges = flatResources.map((r, i) => ({
      id: `edge-${i}`,
      type: 'edge',
      source: 'app',
      target: resourceNodeId(r),
    }));
    return { modelNodes: nodes, modelEdges: edges, resourceCount: flatResources.length };
  }, [useHierarchy, tree, appName, app.status?.health?.status, flatResources, focusIssues, degradedPaths]);

  useEffect(() => {
    const model: Model = {
      graph: {
        id: 'resource-tree-graph',
        type: 'graph',
        layout: LAYOUT_ID,
      },
      nodes: modelNodes,
      edges: modelEdges,
    };
    controller.fromModel(model, false);
  }, [controller, modelNodes, modelEdges]);

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

      if (useHierarchy && tree) {
        const node = tree.nodes.find((n: ResourceNode) => nodeKey(n) === nodeId);
        if (node) {
          setDrawerResource({
            group: node.group,
            version: node.version,
            kind: node.kind,
            namespace: node.namespace,
            name: node.name,
            status: 'Unknown' as SyncStatusCode,
            health: node.health,
          });
        }
        return;
      }
      const res = flatResources.find((r) => resourceNodeId(r) === nodeId);
      if (res) setDrawerResource(res);
    },
    [useHierarchy, tree, flatResources],
  );

  useEffect(() => {
    controller.addEventListener(SELECTION_EVENT, handleSelection);
    return () => controller.removeEventListener(SELECTION_EVENT, handleSelection);
  }, [controller, handleSelection]);

  const handleFitToScreen = useCallback(() => controller.getGraph()?.fit(50), [controller]);
  const handleZoomIn = useCallback(() => controller.getGraph()?.scaleBy(1.2), [controller]);
  const handleZoomOut = useCallback(() => controller.getGraph()?.scaleBy(0.8), [controller]);

  if (!treeLoaded && flatResources.length === 0) {
    return <Bullseye><Spinner /></Bullseye>;
  }

  if (resourceCount === 0) {
    return <EmptyState><EmptyStateBody>{t('No managed resources found.')}</EmptyStateBody></EmptyState>;
  }

  const syncedCount = flatResources.filter((r) => r.status === 'Synced').length;
  const healthyCount = useHierarchy && tree
    ? tree.nodes.filter((n: ResourceNode) => n.health?.status === 'Healthy').length
    : flatResources.filter((r) => r.health?.status === 'Healthy').length;

  const handleCloseDrawer = useCallback(() => setDrawerResource(null), []);

  const drawerPanel = drawerResource ? (
    <ResourceDrawer resource={drawerResource} appName={app.metadata.name} appNamespace={app.metadata.namespace} onClose={handleCloseDrawer} />
  ) : undefined;

  return (
    <>
      <Toolbar className="pf-v6-u-mb-sm">
        <ToolbarContent>
          <ToolbarItem>
            <Label isCompact color="blue">{resourceCount} {t('resources')}</Label>
          </ToolbarItem>
          {!useHierarchy && (
            <ToolbarItem>
              <Label isCompact color={syncedCount === flatResources.length ? 'green' : 'gold'}>{syncedCount}/{flatResources.length} {t('Synced')}</Label>
            </ToolbarItem>
          )}
          <ToolbarItem>
            <Label isCompact color={healthyCount === resourceCount ? 'green' : 'gold'}>{healthyCount}/{resourceCount} {t('Healthy')}</Label>
          </ToolbarItem>
          <ToolbarItem variant="separator" />
          {useHierarchy && (
            <ToolbarItem>
              <Switch
                id="focus-issues-toggle"
                label={t('Focus issues')}
                isChecked={focusIssues}
                onChange={(_e, checked) => setFocusIssues(checked)}
              />
            </ToolbarItem>
          )}
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
