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

import { ApplicationSetEditTab } from './ApplicationSetEditTab';
import type { AppSetResource } from '../../types';

const mockAppSet: AppSetResource = {
  metadata: { name: 'test-appset', namespace: 'default', uid: '123' },
  spec: {
    template: {
      metadata: { name: 'tpl' },
      spec: {
        source: { repoURL: 'https://github.com/test/repo', path: '.', targetRevision: 'HEAD' },
        destination: { namespace: 'default' },
        syncPolicy: { automated: { prune: true, selfHeal: false } },
      },
    },
  },
};

describe('ApplicationSetEditTab', () => {
  it('renders without crashing', () => {
    render(<ApplicationSetEditTab obj={mockAppSet} />);
  });

  it('renders form fields', () => {
    render(<ApplicationSetEditTab obj={mockAppSet} />);
    expect(screen.getByText('Template')).toBeInTheDocument();
    expect(screen.getByText('Repository URL')).toBeInTheDocument();
    expect(screen.getByText('Sync Policy')).toBeInTheDocument();
  });
});
