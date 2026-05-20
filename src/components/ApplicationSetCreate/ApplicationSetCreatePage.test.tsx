import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [{ metadata: { name: 'testuser' } }, true, null],
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
  k8sCreate: jest.fn().mockResolvedValue({}),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string, o?: Record<string, string>) => o ? Object.entries(o).reduce((a, [k, v]) => a.replace(`{{${k}}}`, v), s) : s }) }));
jest.mock('react-router-dom', () => ({ useHistory: () => ({ push: jest.fn(), goBack: jest.fn() }) }));
jest.mock('../../hooks/useArgoCDInstances', () => ({
  useCurrentInstance: () => ({ instance: { name: 't', namespace: 'openshift-gitops' }, instances: [], setInstance: jest.fn() }),
}));
jest.mock('../shared/InstanceProvider', () => ({ InstanceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { ApplicationSetCreatePage } from './ApplicationSetCreatePage';

describe('ApplicationSetCreatePage', () => {
  it('renders wizard title', () => {
    render(<ApplicationSetCreatePage />);
    expect(screen.getByRole('heading', { name: 'Create ApplicationSet' })).toBeInTheDocument();
  });

  it('shows project field with default value', () => {
    render(<ApplicationSetCreatePage />);
    expect(screen.getByDisplayValue('default')).toBeInTheDocument();
  });
});
