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
    generators: [
      { list: { elements: [{ cluster: 'prod', url: 'https://prod.example.com' }] } },
    ],
    template: {
      metadata: { name: 'tpl' },
      spec: {
        source: { repoURL: 'https://github.com/test/repo', path: '.', targetRevision: 'HEAD' },
        destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
        syncPolicy: { automated: { prune: true, selfHeal: false }, syncOptions: ['CreateNamespace=true'] },
      },
    },
  },
};

describe('ApplicationSetEditTab', () => {
  it('renders without crashing', () => {
    render(<ApplicationSetEditTab obj={mockAppSet} />);
  });

  it('renders form sections', () => {
    render(<ApplicationSetEditTab obj={mockAppSet} />);
    expect(screen.getByText('Generators')).toBeInTheDocument();
    expect(screen.getByText('Template')).toBeInTheDocument();
    expect(screen.getAllByText(/Sync Policy/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders generator editor for list generator', () => {
    render(<ApplicationSetEditTab obj={mockAppSet} />);
    expect(screen.getByText(/Generator 1: List/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('prod')).toBeInTheDocument();
  });

  it('renders template fields', () => {
    render(<ApplicationSetEditTab obj={mockAppSet} />);
    expect(screen.getByDisplayValue('https://github.com/test/repo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('HEAD')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://kubernetes.default.svc')).toBeInTheDocument();
  });

  it('renders sync policy checkboxes', () => {
    render(<ApplicationSetEditTab obj={mockAppSet} />);
    expect(screen.getByLabelText('Enable auto-sync')).toBeChecked();
    expect(screen.getByLabelText('Prune resources')).toBeChecked();
    expect(screen.getByLabelText('CreateNamespace')).toBeChecked();
  });

  it('shows spinner when no metadata', () => {
    render(<ApplicationSetEditTab obj={{}} />);
    expect(screen.queryByText('Generators')).not.toBeInTheDocument();
  });

  it('shows add generator button', () => {
    render(<ApplicationSetEditTab obj={mockAppSet} />);
    expect(screen.getByText('Add Generator')).toBeInTheDocument();
  });

  it('renders with no generators', () => {
    const noGenAppSet: AppSetResource = {
      ...mockAppSet,
      spec: { ...mockAppSet.spec, generators: [] },
    };
    render(<ApplicationSetEditTab obj={noGenAppSet} />);
    expect(screen.getByText('Generators')).toBeInTheDocument();
    expect(screen.queryByText(/Generator 1/)).not.toBeInTheDocument();
  });
});
