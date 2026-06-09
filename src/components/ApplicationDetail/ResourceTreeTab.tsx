import React from 'react';
import { useEffect, useMemo, useState, useCallback, useRef, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
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
import { ArgoCDGroupVersionKind, AppProjectGroupVersionKind } from '../../models';
import { useCurrentInstance } from '../../hooks/useArgoCDInstances';
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
  ArgoCD: 'ARGO',
  AppProject: 'PROJ',
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
  ArgoCD: '#e63e11',
  AppProject: '#8a4ca7',
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

function resourceNodeId(r: ManagedResource): string {
  return `${r.kind}/${r.namespace ?? ''}/${r.name}`;
}

const LAYOUT_ID = 'DagreLayout';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 64;
const ICON_SIZE = 32;
const HEALTH_DOT: Record<string, string> = {
  [NodeStatus.success]: '#3e8635',
  [NodeStatus.danger]: '#c9190b',
  [NodeStatus.info]: '#06c',
  [NodeStatus.warning]: '#f0ab00',
  [NodeStatus.default]: '#b8bbbe',
};

interface NodeClickData {
  navigateTo?: string;
  isArgoResource?: boolean;
}

const ResourceCardNode: FC<{ element?: Node }> = ({ element }) => {
  if (!element) return null;
  const data = element.getData() ?? {};
  const label = element.getLabel?.() ?? '';
  const status = (element as unknown as { getNodeStatus?: () => string }).getNodeStatus?.() ?? NodeStatus.default;
  const selected = (element as unknown as { isSelected?: () => boolean }).isSelected?.() ?? false;
  const abbr = data.badge ?? '?';
  const bgColor = data.badgeColor ?? '#6a6e73';
  const kindLabel = data.kindLabel ?? '';
  const dimmed = data.dimmed;
  const isDegradedNode = data.isDegradedNode;
  const healthColor = HEALTH_DOT[status] ?? HEALTH_DOT[NodeStatus.default];
  const navigateTo = data.navigateTo;

  const truncatedName = label.length > 26 ? `${label.slice(0, 24)}…` : label;

  return (
    <g
      className={[
        'gitops-node-card',
        selected ? 'gitops-node-card--selected' : '',
        dimmed ? 'gitops-node--dimmed' : '',
        isDegradedNode ? 'gitops-node--degraded' : '',
        navigateTo ? 'gitops-node-card--clickable' : '',
      ].filter(Boolean).join(' ')}
    >
      <rect
        className="gitops-node-card__body"
        x={0} y={0}
        width={NODE_WIDTH} height={NODE_HEIGHT}
        rx={10} ry={10}
        fill="#fff"
        stroke={selected ? '#06c' : '#e0e0e0'}
        strokeWidth={selected ? 2 : 1}
      />
      <rect
        className="gitops-node-card__icon-bg"
        x={10} y={(NODE_HEIGHT - ICON_SIZE) / 2}
        width={ICON_SIZE} height={ICON_SIZE}
        rx={8} ry={8}
        fill={bgColor}
      />
      <text
        className="gitops-node-card__abbr"
        x={10 + ICON_SIZE / 2}
        y={NODE_HEIGHT / 2 + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={abbr.length > 3 ? 9 : 11}
      >
        {abbr}
      </text>
      <text
        className="gitops-node-card__name"
        x={50} y={NODE_HEIGHT / 2 - 7}
        dominantBaseline="central"
      >
        {truncatedName}
      </text>
      <text
        className="gitops-node-card__kind"
        x={50} y={NODE_HEIGHT / 2 + 9}
        dominantBaseline="central"
      >
        {kindLabel}
      </text>
      <circle
        className="gitops-node-card__health-dot"
        cx={NODE_WIDTH - 14}
        cy={NODE_HEIGHT / 2}
        r={5}
        fill={healthColor}
      />
    </g>
  );
};

const SelectableResourceNode = withSelection()(ResourceCardNode as FC);

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
  const { instance } = useCurrentInstance();

  const appName = app.metadata?.name ?? t('Application');
  const appNamespace = app.metadata?.namespace ?? '';
  const projectName = app.spec?.project ?? 'default';

  const { tree, loaded: treeLoaded, error: treeError } = useResourceTree(appName, appNamespace);

  const [argoInstances] = useK8sWatchResource<Array<{ metadata: { name: string; namespace: string }; status?: { phase?: string } }>>({
    groupVersionKind: ArgoCDGroupVersionKind,
    namespace: appNamespace,
    isList: true,
  });

  const [projects] = useK8sWatchResource<Array<{ metadata: { name: string; namespace: string } }>>({
    groupVersionKind: AppProjectGroupVersionKind,
    namespace: appNamespace,
    isList: true,
  });

  const argoInstance = useMemo(
    () => (argoInstances ?? []).find((i) => i.metadata.namespace === appNamespace) ?? (argoInstances ?? [])[0],
    [argoInstances, appNamespace],
  );
  const project = useMemo(
    () => (projects ?? []).find((p) => p.metadata.name === projectName),
    [projects, projectName],
  );

  const flatResources: ManagedResource[] = useMemo(
    () => (app.status?.resources ?? []) as ManagedResource[],
    [app.status?.resources],
  );

  const useHierarchy = treeLoaded && !treeError && tree && tree.nodes.length > 0;

  const [focusIssues, setFocusIssues] = useState(false);
  const [showArgoContext, setShowArgoContext] = useState(true);
  const [drawerResource, setDrawerResource] = useState<ManagedResource | null>(null);

  const degradedPaths = useMemo(() => {
    if (!useHierarchy || !tree) return new Set<string>();
    return findDegradedPaths(tree.nodes);
  }, [useHierarchy, tree]);

  const { modelNodes, modelEdges, resourceCount } = useMemo(() => {
    const argoNodes: Array<{ id: string; type: string; label: string; width: number; height: number; data: Record<string, unknown>; status: NodeStatus }> = [];
    const argoEdges: Array<{ id: string; type: string; source: string; target: string }> = [];

    if (showArgoContext && argoInstance) {
      const argoNs = argoInstance.metadata.namespace;
      const argoName = argoInstance.metadata.name;
      argoNodes.push({
        id: 'argo-instance',
        type: 'node',
        label: argoName,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        data: {
          badge: kindAbbr('ArgoCD'),
          badgeColor: kindColor('ArgoCD'),
          kindLabel: 'ArgoCD Instance',
          isArgoResource: true,
          navigateTo: `/k8s/ns/${argoNs}/argoproj.io~v1beta1~ArgoCD/${argoName}`,
          dimmed: false,
          isDegradedNode: false,
        },
        status: argoInstance.status?.phase === 'Available' ? NodeStatus.success : NodeStatus.default,
      });
    }

    if (showArgoContext && project) {
      const projNs = project.metadata.namespace;
      argoNodes.push({
        id: 'argo-project',
        type: 'node',
        label: projectName,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        data: {
          badge: kindAbbr('AppProject'),
          badgeColor: kindColor('AppProject'),
          kindLabel: 'AppProject',
          isArgoResource: true,
          navigateTo: `/k8s/ns/${projNs}/argoproj.io~v1alpha1~AppProject/${projectName}`,
          dimmed: false,
          isDegradedNode: false,
        },
        status: NodeStatus.success,
      });

      if (argoInstance) {
        argoEdges.push({ id: 'edge-argo-to-proj', type: 'edge', source: 'argo-instance', target: 'argo-project' });
      }
      argoEdges.push({ id: 'edge-proj-to-app', type: 'edge', source: 'argo-project', target: 'app' });
    } else if (showArgoContext && argoInstance) {
      argoEdges.push({ id: 'edge-argo-to-app', type: 'edge', source: 'argo-instance', target: 'app' });
    }

    const appNode = {
      id: 'app',
      type: 'node',
      label: appName,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      data: {
        badge: kindAbbr('Application'),
        badgeColor: kindColor('Application'),
        kindLabel: 'Application',
        isRoot: true,
        navigateTo: `/k8s/ns/${appNamespace}/argoproj.io~v1alpha1~Application/${appName}`,
        dimmed: false,
        isDegradedNode: false,
      },
      status: healthToNodeStatus(app.status?.health?.status),
    };

    if (useHierarchy && tree) {
      const { edges: hierarchyEdges } = buildHierarchy(tree.nodes, appName);
      const resourceNodes = tree.nodes.map((n: ResourceNode) => {
        const key = nodeKey(n);
        const onDegradedPath = degradedPaths.has(key);
        const isDegradedNode = n.health?.status !== undefined && n.health.status !== 'Healthy';
        const gvk = n.group ? `${n.group}~${n.version}~${n.kind}` : `~${n.version}~${n.kind}`;
        return {
          id: key,
          type: 'node',
          label: n.name,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          data: {
            badge: kindAbbr(n.kind),
            badgeColor: kindColor(n.kind),
            kindLabel: n.kind,
            navigateTo: n.namespace ? `/k8s/ns/${n.namespace}/${gvk}/${n.name}` : undefined,
            dimmed: focusIssues && !onDegradedPath,
            isDegradedNode: focusIssues && isDegradedNode,
          },
          status: focusIssues && !onDegradedPath ? NodeStatus.default : healthToNodeStatus(n.health?.status),
        };
      });
      const resourceEdges = hierarchyEdges.map((e, i) => ({
        id: `edge-${i}`,
        type: 'edge',
        source: e.source,
        target: e.target,
      }));
      return {
        modelNodes: [...argoNodes, appNode, ...resourceNodes],
        modelEdges: [...argoEdges, ...resourceEdges],
        resourceCount: tree.nodes.length,
      };
    }

    const resourceNodes = flatResources.map((r) => {
      const gvk = r.group ? `${r.group}~${r.version}~${r.kind}` : `~${r.version}~${r.kind}`;
      return {
        id: resourceNodeId(r),
        type: 'node',
        label: r.name,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        data: {
          badge: kindAbbr(r.kind),
          badgeColor: kindColor(r.kind),
          kindLabel: r.kind,
          navigateTo: r.namespace ? `/k8s/ns/${r.namespace}/${gvk}/${r.name}` : undefined,
          dimmed: false,
          isDegradedNode: false,
        },
        status: healthToNodeStatus(r.health?.status),
      };
    });
    const resourceEdges = flatResources.map((r, i) => ({
      id: `edge-${i}`,
      type: 'edge',
      source: 'app',
      target: resourceNodeId(r),
    }));
    return {
      modelNodes: [...argoNodes, appNode, ...resourceNodes],
      modelEdges: [...argoEdges, ...resourceEdges],
      resourceCount: flatResources.length,
    };
  }, [useHierarchy, tree, appName, appNamespace, app.status?.health?.status, flatResources, focusIssues, degradedPaths, showArgoContext, argoInstance, project, projectName]);

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

      const selectedNode = modelNodes.find((n) => n.id === nodeId);
      const nodeData = selectedNode?.data as NodeClickData | undefined;

      if (nodeData?.navigateTo && (nodeData.isArgoResource || nodeId === 'app')) {
        window.location.href = nodeData.navigateTo;
        return;
      }

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
    [useHierarchy, tree, flatResources, modelNodes],
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
      <Toolbar className="gitops-tree-toolbar">
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
          <ToolbarItem>
            <Switch
              id="show-argo-context"
              label={t('GitOps context')}
              isChecked={showArgoContext}
              onChange={(_e, checked) => setShowArgoContext(checked)}
            />
          </ToolbarItem>
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
