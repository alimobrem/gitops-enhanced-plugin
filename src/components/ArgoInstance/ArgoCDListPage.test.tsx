import React from 'react';
import { render, screen } from '@testing-library/react';

const mockInstances = [
  {
    metadata: { name: 'openshift-gitops', namespace: 'openshift-gitops', uid: '1', creationTimestamp: '2024-01-01T00:00:00Z' },
    status: { phase: 'Available', host: 'argocd.example.com', server: 'Running', repo: 'Running', redis: 'Running', applicationController: 'Running' },
  },
];

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: (resource: { groupVersionKind?: { kind?: string } }) => {
    if (resource.groupVersionKind?.kind === 'Application') return [[], true, null];
    if (resource.groupVersionKind?.kind === 'Pod') return [[], true, null];
    return [mockInstances, true, null];
  },
  usePrometheusPoll: () => [undefined, false, null],
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
});
