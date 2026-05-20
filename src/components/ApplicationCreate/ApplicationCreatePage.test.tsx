import React from 'react';
import { render, screen } from '@testing-library/react';
import { ApplicationCreatePage } from './ApplicationCreatePage';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [{ metadata: { name: 'testuser' } }, true, null],
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
  k8sCreate: jest.fn().mockResolvedValue({}),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
jest.mock('react-router', () => ({ useNavigate: () => jest.fn() }));
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }));
jest.mock('../shared/InstanceProvider', () => ({
  InstanceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../hooks/useArgoCDInstances', () => ({
  useCurrentInstance: () => ({ instance: { name: 'test', namespace: 'openshift-gitops' }, instances: [], setInstance: jest.fn() }),
  useArgoCDInstances: () => [[], true],
  InstanceContext: { Provider: ({ children }: { children: React.ReactNode }) => <>{children}</> },
}));

describe('ApplicationCreatePage', () => {
  it('renders the create wizard title', () => {
    render(<ApplicationCreatePage />);
    expect(screen.getByRole('heading', { name: 'Create Application' })).toBeInTheDocument();
  });

  it('renders source step fields', () => {
    render(<ApplicationCreatePage />);
    expect(screen.getByLabelText(/Application Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Repository URL/)).toBeInTheDocument();
  });
});
