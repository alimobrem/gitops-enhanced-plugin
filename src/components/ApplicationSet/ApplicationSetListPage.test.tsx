import React from 'react';
import { render, screen } from '@testing-library/react';
import { ApplicationSetListPage } from './ApplicationSetListPage';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [[
    { metadata: { name: 'appset-1', namespace: 'openshift-gitops', uid: '1' }, spec: { generators: [{ list: {} }] }, status: { conditions: [{ type: 'Ready', status: 'True' }] } },
  ], true, null],
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
  ListPageHeader: ({ title, children }: { title: string; children?: React.ReactNode }) => <div><h1>{title}</h1>{children}</div>,
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
  k8sDelete: jest.fn().mockResolvedValue({}),
}));
jest.mock('../shared/ConfirmModal', () => ({ ConfirmModal: () => null }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string, o?: Record<string, string>) => o ? Object.entries(o).reduce((a, [k, v]) => a.replace(`{{${k}}}`, v), s) : s }) }));
jest.mock('react-router-dom', () => ({ Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> }));
jest.mock('../shared/InstanceProvider', () => ({ InstanceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('../../hooks/useArgoCDInstances', () => ({
  useCurrentInstance: () => ({ instance: { name: 't', namespace: 'openshift-gitops' }, instances: [], setInstance: jest.fn() }),
  useArgoCDInstances: () => [[], true],
  watchNamespace: (inst: { namespace: string }) => inst.namespace,
  InstanceContext: { Provider: ({ children }: { children: React.ReactNode }) => <>{children}</> },
}));

describe('ApplicationSetListPage', () => {
  it('renders appset name', () => {
    render(<ApplicationSetListPage />);
    expect(screen.getByText('appset-1')).toBeInTheDocument();
  });

  it('shows generator type', () => {
    render(<ApplicationSetListPage />);
    expect(screen.getByText('list')).toBeInTheDocument();
  });
});
