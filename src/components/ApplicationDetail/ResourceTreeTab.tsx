import React from 'react';
import { useEffect, useMemo, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bullseye,
  Spinner,
  EmptyState,
  EmptyStateBody,
  PageSection,
} from '@patternfly/react-core';
import {
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
  GRAPH_LAYOUT_END_EVENT,
  ModelKind,
  GraphComponent,
  DefaultNode,
  DefaultEdge,
  DefaultGroup,
  withPanZoom,
  useVisualizationController,
  DagreLayout,
  TOP_TO_BOTTOM,
} from '@patternfly/react-topology';
import type { Model, ComponentFactory, Graph, Layout, LayoutFactory } from '@patternfly/react-topology';
import './ResourceTreeTab.css';
import type { ApplicationResource } from '../../types';

const LAYOUT_ID = 'DagreLayout';

const componentFactory: ComponentFactory = (kind, _type) => {
  switch (kind) {
    case ModelKind.graph:
      return withPanZoom()(GraphComponent);
    case ModelKind.node:
      return DefaultNode;
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

  const resources = useMemo(() => app.status?.resources ?? [], [app.status?.resources]);

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
        },
      },
      ...resources.map((r) => ({
        id: `${r.kind}/${r.namespace ?? ''}/${r.name}`,
        type: 'node',
        label: r.name,
        width: 120,
        height: 40,
        data: {
          kind: r.kind,
          sync: r.status,
          health: r.health?.status,
        },
      })),
    ];

    const edges = resources.map((r, i) => ({
      id: `edge-${i}`,
      type: 'edge',
      source: 'app',
      target: `${r.kind}/${r.namespace ?? ''}/${r.name}`,
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
      controller.getGraph()?.fit(40);
    };
    controller.addEventListener(GRAPH_LAYOUT_END_EVENT, onLayoutEnd);
    return () => {
      controller.removeEventListener(GRAPH_LAYOUT_END_EVENT, onLayoutEnd);
    };
  }, [controller]);

  if (resources.length === 0) {
    return (
      <EmptyState>
        <EmptyStateBody>{t('No managed resources found.')}</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <div className="gitops-resource-tree">
      <VisualizationSurface />
    </div>
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
