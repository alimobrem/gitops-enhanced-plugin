import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [[], true, null],
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
  ListPageHeader: ({ title, children }: { title: string; children?: React.ReactNode }) => <div><h1>{title}</h1>{children}</div>,
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string, o?: Record<string, string>) => o ? Object.entries(o).reduce((a, [k, v]) => a.replace(`{{${k}}}`, v), s) : s }) }));
jest.mock('../../hooks/useArgoCDInstances', () => ({
  useCurrentInstance: () => ({ instance: { name: 't', namespace: 'openshift-gitops' }, instances: [], setInstance: jest.fn() }),
  InstanceContext: { Provider: ({ children }: { children: React.ReactNode }) => <>{children}</> },
}));
jest.mock('../shared/InstanceProvider', () => ({ InstanceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { SettingsPage } from './SettingsPage';

describe('SettingsPage', () => {
  it('renders settings heading', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { name: 'GitOps Settings' })).toBeInTheDocument();
  });

  it('renders tab labels', () => {
    render(<SettingsPage />);
    expect(screen.getAllByText('ArgoCD Instances').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Repositories').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Clusters').length).toBeGreaterThan(0);
  });
});
