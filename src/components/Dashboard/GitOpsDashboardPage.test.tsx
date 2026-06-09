import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [[
    { metadata: { uid: '1', name: 'app1', namespace: 'ns', creationTimestamp: '2026-01-01' }, spec: { project: 'default', source: { repoURL: 'https://github.com/org/repo' }, destination: { namespace: 'default' } }, status: { sync: { status: 'Synced' }, health: { status: 'Healthy' }, reconciledAt: '2026-01-01', operationState: { phase: 'Succeeded', message: 'ok', finishedAt: '2026-01-01' } } },
  ], true, null],
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
  usePrometheusPoll: () => [undefined, true, null],
  PrometheusEndpoint: { QUERY: 'api/v1/query', QUERY_RANGE: 'api/v1/query_range' },
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
jest.mock('../../hooks/useArgoCDInstances', () => ({
  useCurrentInstance: () => ({ instance: { name: 't', namespace: 'ns' }, instances: [], setInstance: jest.fn() }),
  watchNamespace: (inst: { namespace: string }) => inst.namespace,
  isAllInstances: () => false,
  InstanceContext: { Provider: ({ children }: { children: React.ReactNode }) => <>{children}</> },
}));
jest.mock('../shared/InstanceProvider', () => ({ InstanceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('../shared/DismissibleAlert', () => ({
  DismissibleAlert: ({ title, children }: { title: string; children: React.ReactNode }) => <div data-testid="dismissible-alert">{title}: {children}</div>,
}));
jest.mock('../../utils/sync-windows', () => ({
  isWindowActive: () => false,
}));
jest.mock('@patternfly/react-charts/victory', () => ({
  ChartDonutUtilization: (props: Record<string, unknown>) => <div data-testid="chart-donut">{String(props.title)}</div>,
  ChartArea: () => <div data-testid="chart-area" />,
  Chart: ({ children }: { children: React.ReactNode }) => <div data-testid="chart">{children}</div>,
  ChartAxis: () => <div data-testid="chart-axis" />,
  ChartGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ChartVoronoiContainer: () => <div />,
}));

import { GitOpsDashboardPage } from './GitOpsDashboardPage';

describe('GitOpsDashboardPage', () => {
  it('renders overview title', () => {
    render(<GitOpsDashboardPage />);
    expect(screen.getByRole('heading', { name: 'GitOps Overview' })).toBeInTheDocument();
  });

  it('renders summary strip', () => {
    render(<GitOpsDashboardPage />);
    expect(screen.getAllByText('Applications').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Synced').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Healthy').length).toBeGreaterThanOrEqual(1);
  });

  it('renders applications table', () => {
    render(<GitOpsDashboardPage />);
    expect(screen.getAllByText('app1').length).toBeGreaterThanOrEqual(1);
  });

  it('renders donut charts for sync and health', () => {
    render(<GitOpsDashboardPage />);
    const donuts = screen.getAllByTestId('chart-donut');
    expect(donuts.length).toBe(2);
    expect(donuts[0]).toHaveTextContent('100%');
    expect(donuts[1]).toHaveTextContent('100%');
  });

  it('renders operational metrics section', () => {
    render(<GitOpsDashboardPage />);
    expect(screen.getByText('Operational Metrics')).toBeInTheDocument();
    expect(screen.getByText('Sync Success Rate')).toBeInTheDocument();
    expect(screen.getByText('Failed Syncs (24h)')).toBeInTheDocument();
    expect(screen.getByText('Reconciliations (1h)')).toBeInTheDocument();
  });

  it('renders activity chart cards', () => {
    render(<GitOpsDashboardPage />);
    expect(screen.getByText('Sync Activity (24h)')).toBeInTheDocument();
    expect(screen.getByText('Reconciliation Activity (24h)')).toBeInTheDocument();
  });

  it('shows empty message when range queries return empty', () => {
    render(<GitOpsDashboardPage />);
    expect(screen.getByText('No sync operations in the last 24 hours')).toBeInTheDocument();
    expect(screen.getByText('No reconciliation data available')).toBeInTheDocument();
  });

  it('renders recent operations', () => {
    render(<GitOpsDashboardPage />);
    expect(screen.getByText('Recent Operations')).toBeInTheDocument();
  });

  it('shows metrics unavailable when Prometheus returns no data', () => {
    render(<GitOpsDashboardPage />);
    expect(screen.getAllByText('Metrics unavailable').length).toBeGreaterThanOrEqual(1);
  });
});
