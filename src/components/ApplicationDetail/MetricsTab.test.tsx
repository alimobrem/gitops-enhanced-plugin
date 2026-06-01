import React from 'react';
import { render, screen } from '@testing-library/react';
import { MetricsTab } from './MetricsTab';

let mockPrometheusPollReturn: [unknown, boolean, unknown] = [undefined, false, null];

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  usePrometheusPoll: () => mockPrometheusPollReturn,
  PrometheusEndpoint: { QUERY: 'QUERY' },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (s: string) => s,
  }),
}));

const mockApp = {
  apiVersion: 'argoproj.io/v1alpha1' as const,
  kind: 'Application' as const,
  metadata: { name: 'test-app', namespace: 'openshift-gitops', uid: '1' },
  spec: {
    source: { repoURL: 'https://github.com/org/repo', path: 'manifests', targetRevision: 'main' },
    destination: { server: 'https://kubernetes.default.svc', namespace: 'prod' },
    project: 'default',
  },
  status: {
    sync: { status: 'Synced' as const },
    health: { status: 'Healthy' as const },
    resources: [
      { group: 'apps', version: 'v1', kind: 'Deployment', name: 'web', status: 'Synced' as const },
      { group: '', version: 'v1', kind: 'Service', name: 'web-svc', status: 'OutOfSync' as const },
    ],
  },
};

const makePromResp = (val: string) => ({
  data: { result: [{ value: [1234567890, val] }] },
});

describe('MetricsTab', () => {
  beforeEach(() => {
    mockPrometheusPollReturn = [undefined, false, null];
  });

  it('shows spinner when loading', () => {
    render(<MetricsTab obj={mockApp} />);
    expect(document.querySelector('.pf-v6-c-spinner')).toBeInTheDocument();
  });

  it('shows empty state when all metrics are null', () => {
    mockPrometheusPollReturn = [{ data: { result: [] } }, true, null];
    render(<MetricsTab obj={mockApp} />);
    expect(screen.getByText('Metrics unavailable')).toBeInTheDocument();
  });

  it('renders metric cards when loaded', () => {
    mockPrometheusPollReturn = [makePromResp('10'), true, null];
    render(<MetricsTab obj={mockApp} />);
    expect(screen.getByText('Sync Activity')).toBeInTheDocument();
    expect(screen.getByText('Reconciliation')).toBeInTheDocument();
    expect(screen.getByText('Resource Health')).toBeInTheDocument();
  });

  it('shows managed resource count from CR status', () => {
    mockPrometheusPollReturn = [makePromResp('5'), true, null];
    render(<MetricsTab obj={mockApp} />);
    expect(screen.getByText('Managed Resources')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows OutOfSync resource count', () => {
    mockPrometheusPollReturn = [makePromResp('5'), true, null];
    render(<MetricsTab obj={mockApp} />);
    expect(screen.getByText('OutOfSync Resources')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows health and sync status from CR', () => {
    mockPrometheusPollReturn = [makePromResp('5'), true, null];
    render(<MetricsTab obj={mockApp} />);
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Synced')).toBeInTheDocument();
  });
});
