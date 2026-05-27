import React from 'react';
import { render, screen } from '@testing-library/react';

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
  NodeStatus: { success: 'success', danger: 'danger', info: 'info', default: 'default' },
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

describe('ResourceTreeTab', () => {
  it('renders spinner when obj is undefined', () => {
    const { container } = render(<ResourceTreeTab />);
    expect(container.querySelector('.pf-v6-c-spinner')).toBeTruthy();
  });

  it('renders without crashing with resources', () => {
    const { container } = render(<ResourceTreeTab obj={mockApp} />);
    expect(container.querySelector('.pf-v6-c-spinner')).toBeFalsy();
  });

  it('renders the topology surface with resources', () => {
    render(<ResourceTreeTab obj={mockApp} />);
    expect(screen.getByTestId('topology-surface')).toBeInTheDocument();
  });
});
