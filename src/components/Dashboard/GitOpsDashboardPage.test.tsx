import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [[
    { metadata: { uid: '1', name: 'app1', namespace: 'ns', creationTimestamp: '2026-01-01' }, spec: { project: 'default', source: { repoURL: 'https://github.com/org/repo' }, destination: { namespace: 'default' } }, status: { sync: { status: 'Synced' }, health: { status: 'Healthy' }, reconciledAt: '2026-01-01', operationState: { phase: 'Succeeded', message: 'ok', finishedAt: '2026-01-01' } } },
  ], true, null],
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
  usePrometheusPoll: () => [undefined, true, null],
  PrometheusEndpoint: { QUERY: 'api/v1/query' },
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
jest.mock('../../hooks/useArgoCDInstances', () => ({
  useCurrentInstance: () => ({ instance: { name: 't', namespace: 'ns' }, instances: [], setInstance: jest.fn() }),
  InstanceContext: { Provider: ({ children }: { children: React.ReactNode }) => <>{children}</> },
}));
jest.mock('../shared/InstanceProvider', () => ({ InstanceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { GitOpsDashboardPage } from './GitOpsDashboardPage';

describe('GitOpsDashboardPage', () => {
  it('renders overview title', () => {
    render(<GitOpsDashboardPage />);
    expect(screen.getByText('GitOps Overview')).toBeInTheDocument();
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

  it('renders metrics section', () => {
    render(<GitOpsDashboardPage />);
    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByText('Sync Success Rate')).toBeInTheDocument();
    expect(screen.getByText('Failed Syncs (24h)')).toBeInTheDocument();
    expect(screen.getByText('Reconciliations (1h)')).toBeInTheDocument();
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
