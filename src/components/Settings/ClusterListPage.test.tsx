import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [[], true, null],
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
  k8sPatch: jest.fn(),
  k8sCreate: jest.fn(),
  k8sDelete: jest.fn(),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
jest.mock('react-router', () => ({ useParams: () => ({ name: 'test', ns: 'default' }) }));
jest.mock('react-router-dom', () => ({ useHistory: () => ({ push: jest.fn() }) }));
jest.mock('../../hooks/useArgoCDInstances', () => ({
  useCurrentInstance: () => ({ instance: { name: 'test', namespace: 'default' }, instances: [], setInstance: jest.fn() }),
  watchNamespace: (inst: { namespace: string }) => inst.namespace === '*' ? undefined : inst.namespace,
}));

import { ClusterListPage } from './ClusterListPage';

describe('ClusterListPage', () => {
  it('renders without crashing', () => {
    render(<ClusterListPage />);
  });

  it('renders the page title', () => {
    render(<ClusterListPage />);
    expect(screen.getByRole('heading', { name: 'Clusters' })).toBeInTheDocument();
  });
});
