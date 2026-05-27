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
  useArgoCDInstances: () => [[{ name: 'test', namespace: 'default' }], true],
  ALL_INSTANCES: { name: '*', namespace: '*' },
  InstanceContext: React.createContext({
    instance: { name: 'test', namespace: 'default' },
    instances: [],
    setInstance: jest.fn(),
  }),
}));

import { GitOpsContextProvider } from './GitOpsContextProvider';

describe('GitOpsContextProvider', () => {
  it('renders without crashing', () => {
    render(<GitOpsContextProvider><span>child content</span></GitOpsContextProvider>);
  });

  it('renders children', () => {
    render(<GitOpsContextProvider><span>child content</span></GitOpsContextProvider>);
    expect(screen.getByText('child content')).toBeInTheDocument();
  });
});
