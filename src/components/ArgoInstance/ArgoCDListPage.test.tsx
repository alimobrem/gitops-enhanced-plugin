import React from 'react';
import { render, screen } from '@testing-library/react';

const mockInstances = [
  {
    metadata: { name: 'openshift-gitops', namespace: 'openshift-gitops', uid: '1', creationTimestamp: '2024-01-01T00:00:00Z' },
    status: { phase: 'Available', host: 'argocd.example.com', server: 'Running', repo: 'Running', redis: 'Running', applicationController: 'Running' },
  },
];

const mockPromData = (val: string) => ({
  data: { result: [{ value: [0, val] }] },
});

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: (resource: { groupVersionKind?: { kind?: string } }) => {
    if (resource.groupVersionKind?.kind === 'Application') return [[], true, null];
    if (resource.groupVersionKind?.kind === 'Pod') return [[], true, null];
    return [mockInstances, true, null];
  },
  usePrometheusPoll: ({ query }: { query: string }) => {
    if (query.includes('phase="Succeeded"')) return [mockPromData('42'), true, null];
    if (query.includes('phase=~"Error|Failed"')) return [mockPromData('3'), true, null];
    if (query.includes('cluster_connection_status') && query.startsWith('sum(')) return [mockPromData('2'), true, null];
    if (query.includes('cluster_connection_status') && query.startsWith('count(')) return [mockPromData('2'), true, null];
    if (query.includes('repo_pending_request')) return [mockPromData('0'), true, null];
    if (query.includes('git_fetch_fail')) return [mockPromData('1'), true, null];
    return [undefined, false, null];
  },
  PrometheusEndpoint: { QUERY: 'api/v1/query' },
  k8sDelete: jest.fn().mockResolvedValue({}),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
jest.mock('js-yaml', () => ({ dump: () => 'yaml content' }));
jest.mock('../../utils/time', () => ({ timeAgo: () => '1d ago' }));

import { ArgoCDListPage } from './ArgoCDListPage';

describe('ArgoCDListPage', () => {
  it('renders instance name', () => {
    render(<ArgoCDListPage />);
    expect(screen.getAllByText('openshift-gitops').length).toBeGreaterThanOrEqual(1);
  });

  it('renders phase label', () => {
    render(<ArgoCDListPage />);
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('renders component status labels', () => {
    render(<ArgoCDListPage />);
    expect(screen.getByText('server')).toBeInTheDocument();
    expect(screen.getByText('repo')).toBeInTheDocument();
  });

  it('renders filter input', () => {
    render(<ArgoCDListPage />);
    expect(screen.getByPlaceholderText('Filter instances...')).toBeInTheDocument();
  });

  it('renders successful syncs metric', () => {
    render(<ArgoCDListPage />);
    expect(screen.getByText('Successful Syncs')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders failed syncs metric', () => {
    render(<ArgoCDListPage />);
    expect(screen.getByText('Failed Syncs (24h)')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders cluster connectivity metric', () => {
    render(<ArgoCDListPage />);
    expect(screen.getByText('Cluster Connectivity')).toBeInTheDocument();
    expect(screen.getByText('2/2')).toBeInTheDocument();
  });

  it('renders repo pending requests metric', () => {
    render(<ArgoCDListPage />);
    expect(screen.getByText('Repo Pending Requests')).toBeInTheDocument();
  });

  it('renders git fetch failures metric', () => {
    render(<ArgoCDListPage />);
    expect(screen.getByText('Git Fetch Failures (24h)')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
