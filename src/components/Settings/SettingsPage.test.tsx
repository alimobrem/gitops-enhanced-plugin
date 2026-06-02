import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [[], true, null],
  usePrometheusPoll: () => [undefined, false, null],
  PrometheusEndpoint: { QUERY: 'api/v1/query' },
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
  ListPageHeader: ({ title, children }: { title: string; children?: React.ReactNode }) => <div><h1>{title}</h1>{children}</div>,
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string, o?: Record<string, string>) => o ? Object.entries(o).reduce((a, [k, v]) => a.replace(`{{${k}}}`, v), s) : s }) }));
jest.mock('../../hooks/useArgoCDInstances', () => ({
  useCurrentInstance: () => ({ instance: { name: 't', namespace: 'openshift-gitops' }, instances: [], setInstance: jest.fn() }),
  watchNamespace: (inst: { namespace: string }) => inst.namespace === '*' ? undefined : inst.namespace,
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
    expect(screen.getAllByText('Repositories').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Clusters').length).toBeGreaterThan(0);
  });

  it('does not render removed tabs', () => {
    render(<SettingsPage />);
    expect(screen.queryByText('ArgoCD Instances')).not.toBeInTheDocument();
    expect(screen.queryByText('AnalysisRuns')).not.toBeInTheDocument();
    expect(screen.queryByText('Experiments')).not.toBeInTheDocument();
  });
});
