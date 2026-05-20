import React from 'react';
import { render, screen } from '@testing-library/react';

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
  k8sPatch: jest.fn(),
  k8sDelete: jest.fn(),
}));
jest.mock('@patternfly/react-log-viewer', () => ({
  LogViewer: ({ data }: { data: string }) => <pre data-testid="log-viewer">{data}</pre>,
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
  it('finds pods via ownerReference chain and shows pod selector', () => {
    render(<LogsTab app={mockApp} />);
    expect(screen.getByText('pod-1')).toBeInTheDocument();
  });

  it('renders LogViewer component', () => {
    render(<LogsTab app={mockApp} />);
    expect(screen.getByTestId('log-viewer')).toBeInTheDocument();
  });

  it('renders follow button', () => {
    render(<LogsTab app={mockApp} />);
    expect(screen.getByText('Follow')).toBeInTheDocument();
  });
});
