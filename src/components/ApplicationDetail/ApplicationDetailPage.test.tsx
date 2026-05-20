import React from 'react';
import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

const mockApp = {
  apiVersion: 'argoproj.io/v1alpha1',
  kind: 'Application',
  metadata: { name: 'test-app', namespace: 'openshift-gitops', uid: '123' },
  spec: {
    source: {
      repoURL: 'https://github.com/example/repo',
      path: 'manifests',
      targetRevision: 'main',
    },
    destination: {
      server: 'https://kubernetes.default.svc',
      namespace: 'default',
    },
    project: 'default',
  },
  status: {
    sync: { status: 'Synced', revision: 'abc123' },
    health: { status: 'Healthy' },
    history: [
      { id: 1, revision: 'abc123', deployedAt: '2026-05-19T12:00:00Z' },
    ],
    resources: [],
  },
};

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: (resource: { isList?: boolean }) => {
    if (resource.isList) return [[], true, null];
    return [mockApp, true, null];
  },
  DocumentTitle: ({ children }: PropsWithChildren) => <title>{children}</title>,
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
  k8sPatch: jest.fn(),
  k8sDelete: jest.fn(),
  consoleFetch: jest.fn(),
}));

jest.mock('react-router', () => ({
  useParams: () => ({ name: 'test-app', ns: 'openshift-gitops' }),
  useHistory: () => ({ push: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('react-router-dom', () => ({
  useParams: () => ({ name: 'test-app', ns: 'openshift-gitops' }),
  useHistory: () => ({ push: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));

import { ApplicationDetailPage } from './ApplicationDetailPage';

describe('ApplicationDetailPage', () => {
  it('renders application name when loaded', () => {
    render(<ApplicationDetailPage />);
    expect(screen.getByRole('heading', { name: 'test-app' })).toBeInTheDocument();
  });

  it('renders tab names', () => {
    render(<ApplicationDetailPage />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('renders sync and health status', () => {
    render(<ApplicationDetailPage />);
    expect(screen.getAllByText('Synced').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Healthy').length).toBeGreaterThan(0);
  });
});
