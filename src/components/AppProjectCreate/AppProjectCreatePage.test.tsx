import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [{ metadata: { name: 'testuser' } }, true, null],
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
  k8sCreate: jest.fn().mockResolvedValue({}),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
jest.mock('react-router-dom', () => ({ useHistory: () => ({ push: jest.fn(), goBack: jest.fn() }) }));
jest.mock('../../hooks/useArgoCDInstances', () => ({
  useCurrentInstance: () => ({ instance: { name: 't', namespace: 'openshift-gitops' }, instances: [], setInstance: jest.fn() }),
}));
jest.mock('../shared/InstanceProvider', () => ({ InstanceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { AppProjectCreatePage } from './AppProjectCreatePage';

describe('AppProjectCreatePage', () => {
  it('renders wizard title', () => {
    render(<AppProjectCreatePage />);
    expect(screen.getByRole('heading', { name: 'Create AppProject' })).toBeInTheDocument();
  });

  it('shows name field', () => {
    render(<AppProjectCreatePage />);
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
  });

  it('shows description field', () => {
    render(<AppProjectCreatePage />);
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
  });
});
