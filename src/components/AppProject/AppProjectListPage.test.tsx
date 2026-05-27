import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppProjectListPage } from './AppProjectListPage';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [[
    { metadata: { name: 'default', namespace: 'openshift-gitops', uid: '1' }, spec: { sourceRepos: ['*'], destinations: [{ server: '*', namespace: '*' }] } },
  ], true, null],
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
  ListPageHeader: ({ title, children }: { title: string; children?: React.ReactNode }) => <div><h1>{title}</h1>{children}</div>,
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string, o?: Record<string, string>) => o ? Object.entries(o).reduce((a, [k, v]) => a.replace(`{{${k}}}`, v), s) : s }) }));
jest.mock('react-router-dom', () => ({ Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> }));
jest.mock('../shared/InstanceProvider', () => ({ InstanceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('../../hooks/useArgoCDInstances', () => ({
  useCurrentInstance: () => ({ instance: { name: 't', namespace: 'openshift-gitops' }, instances: [], setInstance: jest.fn() }),
  useArgoCDInstances: () => [[], true],
  watchNamespace: (inst: { namespace: string }) => inst.namespace,
  InstanceContext: { Provider: ({ children }: { children: React.ReactNode }) => <>{children}</> },
}));

describe('AppProjectListPage', () => {
  it('renders project name', () => {
    render(<AppProjectListPage />);
    expect(screen.getByText('default')).toBeInTheDocument();
  });

  it('shows All label for wildcard sourceRepos', () => {
    render(<AppProjectListPage />);
    expect(screen.getByText('All')).toBeInTheDocument();
  });
});
