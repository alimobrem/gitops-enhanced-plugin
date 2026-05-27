import React from 'react';
import { render, screen } from '@testing-library/react';
import { ApplicationListPage } from './ApplicationListPage';

const mockUseK8sWatchResource = jest.fn();

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: (...args: unknown[]) =>
    mockUseK8sWatchResource(...args),
  ListPageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
  DocumentTitle: ({ children }: { children: string }) => (
    <title>{children}</title>
  ),
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));
jest.mock('../../hooks/useArgoCDInstances', () => ({
  useCurrentInstance: () => ({ instance: { name: 'test', namespace: 'ns' }, instances: [], setInstance: jest.fn() }),
  watchNamespace: (inst: { namespace: string }) => inst.namespace,
  isAllInstances: () => false,
  InstanceContext: { Provider: ({ children }: { children: React.ReactNode }) => <>{children}</> },
}));
jest.mock('../shared/InstanceProvider', () => ({ InstanceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

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
    sync: { status: 'Synced' },
    health: { status: 'Healthy' },
  },
};

describe('ApplicationListPage', () => {
  it('renders loading state', () => {
    mockUseK8sWatchResource.mockReturnValue([[], false, null]);
    render(<ApplicationListPage />);
    expect(screen.getByRole('heading', { name: 'Applications' })).toBeInTheDocument();
  });

  it('renders application rows when loaded', () => {
    mockUseK8sWatchResource.mockReturnValue([[mockApp], true, null]);
    render(<ApplicationListPage />);
    expect(screen.getByText('test-app')).toBeInTheDocument();
    expect(screen.getByText('Synced')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseK8sWatchResource.mockReturnValue([
      [],
      false,
      new Error('fetch failed'),
    ]);
    render(<ApplicationListPage />);
    expect(screen.getByText(/fetch failed/)).toBeInTheDocument();
  });
});
