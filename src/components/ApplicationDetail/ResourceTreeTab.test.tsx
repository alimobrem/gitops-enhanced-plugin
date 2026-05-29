import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
jest.mock('@patternfly/react-topology', () => ({
  Visualization: jest.fn().mockImplementation(() => ({
    registerComponentFactory: jest.fn(),
    registerLayoutFactory: jest.fn(),
    fromModel: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getGraph: jest.fn().mockReturnValue({ fit: jest.fn() }),
  })),
  VisualizationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  VisualizationSurface: () => <div data-testid="topology-surface">topology</div>,
  GRAPH_LAYOUT_END_EVENT: 'graph-layout-end',
  SELECTION_EVENT: 'selection',
  ModelKind: { graph: 'graph', node: 'node', edge: 'edge' },
  GraphComponent: () => <div />,
  DefaultNode: () => <div />,
  DefaultEdge: () => <div />,
  DefaultGroup: () => <div />,
  NodeStatus: { success: 'success', danger: 'danger', info: 'info', warning: 'warning', default: 'default' },
  withPanZoom: () => (c: unknown) => c,
  withSelection: () => (c: unknown) => c,
  useVisualizationController: () => ({
    fromModel: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getGraph: jest.fn().mockReturnValue({ fit: jest.fn() }),
  }),
  DagreLayout: jest.fn(),
  TOP_TO_BOTTOM: 'TB',
}));
jest.mock('./ResourceDrawer', () => ({
  ResourceDrawer: () => <div data-testid="resource-drawer" />,
}));

const mockUseResourceTree = jest.fn();
jest.mock('../../hooks/useResourceTree', () => ({
  useResourceTree: (...args: unknown[]) => mockUseResourceTree(...args),
}));

jest.mock('../../utils/tree', () => ({
  nodeKey: (n: { group: string; kind: string; namespace: string; name: string }) =>
    `${n.group}/${n.kind}/${n.namespace}/${n.name}`,
  buildHierarchy: (nodes: Array<{ group: string; kind: string; namespace: string; name: string; parentRefs?: unknown[] }>) => ({
    nodeMap: new Map(),
    edges: nodes.map((n) => ({
      source: n.parentRefs ? `parent/${n.kind}/${n.namespace}/parent` : 'app',
      target: `${n.group}/${n.kind}/${n.namespace}/${n.name}`,
    })),
  }),
  findDegradedPaths: (nodes: Array<{ group: string; kind: string; namespace: string; name: string; health?: { status: string } }>) => {
    const set = new Set<string>();
    for (const n of nodes) {
      if (n.health?.status && n.health.status !== 'Healthy') {
        set.add(`${n.group}/${n.kind}/${n.namespace}/${n.name}`);
      }
    }
    return set;
  },
}));

import { ResourceTreeTab } from './ResourceTreeTab';

const mockApp = {
  metadata: { name: 'test-app', namespace: 'default', uid: '1' },
  spec: { destination: { namespace: 'target-ns' } },
  status: {
    sync: { status: 'Synced' },
    health: { status: 'Healthy' },
    resources: [
      { kind: 'Deployment', version: 'v1', name: 'my-deploy', namespace: 'target-ns', status: 'Synced', health: { status: 'Healthy' } },
      { kind: 'Service', version: 'v1', name: 'my-svc', namespace: 'target-ns', status: 'Synced', health: { status: 'Healthy' } },
    ],
  },
};

const treeNodes = [
  { group: 'apps', version: 'v1', kind: 'Deployment', namespace: 'target-ns', name: 'my-deploy', uid: 'u1', health: { status: 'Healthy' } },
  { group: '', version: 'v1', kind: 'Service', namespace: 'target-ns', name: 'my-svc', uid: 'u2', health: { status: 'Healthy' } },
  { group: 'apps', version: 'v1', kind: 'ReplicaSet', namespace: 'target-ns', name: 'my-rs', uid: 'u3', parentRefs: [{ group: 'apps', version: 'v1', kind: 'Deployment', namespace: 'target-ns', name: 'my-deploy', uid: 'u1' }], health: { status: 'Degraded' } },
];

describe('ResourceTreeTab', () => {
  beforeEach(() => {
    mockUseResourceTree.mockReturnValue({
      tree: { nodes: treeNodes },
      loaded: true,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders spinner when obj is undefined', () => {
    const { container } = render(<ResourceTreeTab />);
    expect(container.querySelector('.pf-v6-c-spinner')).toBeTruthy();
  });

  it('renders topology surface with hierarchy tree', () => {
    render(<ResourceTreeTab obj={mockApp} />);
    expect(screen.getByTestId('topology-surface')).toBeInTheDocument();
  });

  it('shows resource count from tree nodes', () => {
    render(<ResourceTreeTab obj={mockApp} />);
    expect(screen.getByText(/3.*resources/)).toBeInTheDocument();
  });

  it('renders Focus issues switch when hierarchy is available', () => {
    render(<ResourceTreeTab obj={mockApp} />);
    expect(screen.getByLabelText('Focus issues')).toBeInTheDocument();
  });

  it('falls back to flat view when tree fails to load', () => {
    mockUseResourceTree.mockReturnValue({
      tree: null,
      loaded: true,
      error: 'network error',
      refetch: jest.fn(),
    });
    render(<ResourceTreeTab obj={mockApp} />);
    expect(screen.getByTestId('topology-surface')).toBeInTheDocument();
    expect(screen.getByText(/2.*resources/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Focus issues')).not.toBeInTheDocument();
  });

  it('shows empty state when no resources exist', () => {
    mockUseResourceTree.mockReturnValue({
      tree: { nodes: [] },
      loaded: true,
      error: null,
      refetch: jest.fn(),
    });
    const emptyApp = {
      ...mockApp,
      status: { ...mockApp.status, resources: [] },
    };
    render(<ResourceTreeTab obj={emptyApp} />);
    expect(screen.getByText('No managed resources found.')).toBeInTheDocument();
  });

  it('Focus issues toggle can be switched on', () => {
    render(<ResourceTreeTab obj={mockApp} />);
    const toggle = screen.getByLabelText('Focus issues');
    fireEvent.click(toggle);
    expect(toggle).toBeInTheDocument();
  });

  it('falls back to flat view silently when tree fetch errors', () => {
    mockUseResourceTree.mockReturnValue({
      tree: null,
      loaded: true,
      error: 'network error',
      refetch: jest.fn(),
    });
    render(<ResourceTreeTab obj={mockApp} />);
    expect(screen.getByText('2 resources')).toBeInTheDocument();
  });
});
