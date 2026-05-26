import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const mockConsoleFetch = jest.fn();

function makeStreamResponse(text: string) {
  let done = false;
  return {
    body: {
      getReader: () => ({
        read: () => {
          if (!done) {
            done = true;
            const arr = new Uint8Array(text.length);
            for (let i = 0; i < text.length; i++) arr[i] = text.charCodeAt(i);
            return Promise.resolve({ done: false, value: arr });
          }
          return Promise.resolve({ done: true, value: undefined });
        },
      }),
    },
  };
}

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
  consoleFetch: (...args: unknown[]) => mockConsoleFetch(...args),
  consoleFetchText: jest.fn(),
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
    mockConsoleFetch.mockReset();
    mockConsoleFetch.mockResolvedValue(makeStreamResponse('Apache log line 1\nApache log line 2'));
  });

  it('finds pods via ownerReference chain', () => {
    render(<LogsTab app={mockApp} />);
    expect(screen.getByText('pod-1')).toBeInTheDocument();
  });

  it('calls consoleFetch on mount with streaming URL', async () => {
    render(<LogsTab app={mockApp} />);
    await waitFor(() => expect(mockConsoleFetch).toHaveBeenCalled());
    const url = mockConsoleFetch.mock.calls[0][0] as string;
    expect(url).toContain('/api/kubernetes/api/v1/namespaces/default/pods/pod-1/log');
    expect(url).toContain('container=main');
    expect(url).toContain('follow=true');
  });

  it('streams logs via consoleFetch with follow', async () => {
    render(<LogsTab app={mockApp} />);
    await waitFor(() => expect(mockConsoleFetch).toHaveBeenCalled());
    const url = mockConsoleFetch.mock.calls[0][0] as string;
    expect(url).toContain('follow=true');
    expect(url).toContain('tailLines=500');
  });

  it('shows error message when fetch fails', async () => {
    mockConsoleFetch.mockRejectedValue(new Error('403 Forbidden'));
    render(<LogsTab app={mockApp} />);
    await waitFor(() => expect(screen.getByText(/Error fetching logs: 403 Forbidden/)).toBeInTheDocument());
  });

  it('renders refresh button', () => {
    render(<LogsTab app={mockApp} />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });
});
