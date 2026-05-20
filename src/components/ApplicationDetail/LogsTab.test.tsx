import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const mockConsoleFetchText = jest.fn();

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: (resource: { groupVersionKind?: { kind?: string }; isList?: boolean }) => {
    const kind = resource.groupVersionKind?.kind;
    if (kind === 'Pod') return [[
      { metadata: { name: 'pod-1', namespace: 'default', ownerReferences: [{ kind: 'ReplicaSet', name: 'deploy-abc' }] }, spec: { containers: [{ name: 'main' }] } },
    ], true, null];
    if (kind === 'ReplicaSet') return [[
      { metadata: { name: 'deploy-abc', namespace: 'default', ownerReferences: [{ kind: 'Deployment', name: 'my-deploy' }] } },
    ], true, null];
    return [{ metadata: { name: 'testuser' } }, true, null];
  },
  consoleFetchText: (...args: unknown[]) => mockConsoleFetchText(...args),
  k8sPatch: jest.fn(),
  k8sDelete: jest.fn(),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { LogsTab } from './LogsTab';

const mockApp = {
  apiVersion: 'argoproj.io/v1alpha1' as const,
  kind: 'Application' as const,
  metadata: { name: 'test', namespace: 'openshift-gitops', uid: '1' },
  spec: { destination: { server: 'https://kubernetes.default.svc', namespace: 'default' }, project: 'default' },
  status: {
    sync: { status: 'Synced' as const },
    health: { status: 'Healthy' as const },
    resources: [
      { group: 'apps', version: 'v1', kind: 'Deployment', name: 'my-deploy', namespace: 'default', status: 'Synced' as const },
    ],
  },
};

describe('LogsTab', () => {
  beforeEach(() => {
    mockConsoleFetchText.mockReset();
    mockConsoleFetchText.mockResolvedValue('Apache log line 1\nApache log line 2');
  });

  it('finds pods via ownerReference chain', () => {
    render(<LogsTab app={mockApp} />);
    expect(screen.getByText('pod-1')).toBeInTheDocument();
  });

  it('calls consoleFetchText on mount with correct URL', async () => {
    render(<LogsTab app={mockApp} />);
    await waitFor(() => expect(mockConsoleFetchText).toHaveBeenCalled());
    const url = mockConsoleFetchText.mock.calls[0][0] as string;
    expect(url).toContain('/api/kubernetes/api/v1/namespaces/default/pods/pod-1/log');
    expect(url).toContain('container=main');
  });

  it('displays fetched log content', async () => {
    render(<LogsTab app={mockApp} />);
    await waitFor(() => expect(screen.getByText(/Apache log line 1/)).toBeInTheDocument());
  });

  it('shows error message when fetch fails', async () => {
    mockConsoleFetchText.mockRejectedValue(new Error('403 Forbidden'));
    render(<LogsTab app={mockApp} />);
    await waitFor(() => expect(screen.getByText(/Error fetching logs: 403 Forbidden/)).toBeInTheDocument());
  });

  it('renders follow and refresh buttons', () => {
    render(<LogsTab app={mockApp} />);
    expect(screen.getByText('Follow')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });
});
