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
}));

import { AppProjectEditTab } from './AppProjectEditTab';
import type { AppProjectResource } from '../../types';

const mockProject: AppProjectResource = {
  metadata: { name: 'test-project', namespace: 'default', uid: '456' },
  spec: {
    description: 'A test project',
    sourceRepos: ['https://github.com/test/repo'],
    destinations: [{ server: 'https://kubernetes.default.svc', namespace: 'default' }],
  },
};

describe('AppProjectEditTab', () => {
  it('renders without crashing', () => {
    render(<AppProjectEditTab obj={mockProject} />);
  });

  it('renders form fields', () => {
    render(<AppProjectEditTab obj={mockProject} />);
    expect(screen.getByText('Basics')).toBeInTheDocument();
    expect(screen.getByText('Source Repos')).toBeInTheDocument();
    expect(screen.getByText('Destinations')).toBeInTheDocument();
  });
});
