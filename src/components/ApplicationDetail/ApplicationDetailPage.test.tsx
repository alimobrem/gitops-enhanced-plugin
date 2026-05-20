import React from 'react';
import { render, screen } from '@testing-library/react';
import { ApplicationDetailPage } from './ApplicationDetailPage';
import type { FC, PropsWithChildren } from 'react';

const mockUseK8sWatchResource = jest.fn();

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: (...args: unknown[]) =>
    mockUseK8sWatchResource(...args),
  DocumentTitle: ({ children }: PropsWithChildren) => <title>{children}</title>,
  HorizontalNav: ({
    pages,
  }: {
    pages: Array<{ name: string; component: FC }>;
  }) => (
    <div>
      {pages.map((p) => (
        <div key={p.name}>{p.name}</div>
      ))}
    </div>
  ),
  k8sPatch: jest.fn(),
  consoleFetch: jest.fn(),
}));

jest.mock('react-router', () => ({
  useParams: () => ({ name: 'test-app', ns: 'openshift-gitops' }),
}));

jest.mock('react-router-dom', () => ({
  useParams: () => ({ name: 'test-app', ns: 'openshift-gitops' }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));

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
  },
};

describe('ApplicationDetailPage', () => {
  it('renders application name when loaded', () => {
    mockUseK8sWatchResource.mockReturnValue([mockApp, true, null]);
    render(<ApplicationDetailPage />);
    expect(screen.getByRole('heading', { name: 'test-app' })).toBeInTheDocument();
  });

  it('renders tab names', () => {
    mockUseK8sWatchResource.mockReturnValue([mockApp, true, null]);
    render(<ApplicationDetailPage />);
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0);
    expect(screen.getAllByText('History').length).toBeGreaterThan(0);
  });

  it('renders sync and health status', () => {
    mockUseK8sWatchResource.mockReturnValue([mockApp, true, null]);
    render(<ApplicationDetailPage />);
    expect(screen.getAllByText('Synced').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Healthy').length).toBeGreaterThan(0);
  });
});
