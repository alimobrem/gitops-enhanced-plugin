import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [[
    { metadata: { uid: '1', name: 'app1', namespace: 'ns', creationTimestamp: '2026-01-01' }, spec: { project: 'default', source: { repoURL: 'https://github.com/org/repo' }, destination: { namespace: 'default' } }, status: { sync: { status: 'Synced' }, health: { status: 'Healthy' }, reconciledAt: '2026-01-01' } },
  ], true, null],
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
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

  it('renders status cards', () => {
    render(<GitOpsDashboardPage />);
    expect(screen.getByText('Total Applications')).toBeInTheDocument();
  });

  it('renders recent applications', () => {
    render(<GitOpsDashboardPage />);
    expect(screen.getByText('app1')).toBeInTheDocument();
  });
});
