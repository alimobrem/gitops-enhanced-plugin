import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: (resource: { isList?: boolean }) => {
    if (resource.isList) return [[], true, null];
    return [{
      metadata: { name: 'my-appset', namespace: 'openshift-gitops', uid: '1' },
      spec: { generators: [{ list: {} }, { git: {} }] },
      status: { conditions: [{ type: 'Ready', status: 'True', message: 'ok' }] },
    }, true, null];
  },
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
jest.mock('react-router', () => ({ useParams: () => ({ name: 'my-appset', ns: 'openshift-gitops' }) }));

import { ApplicationSetDetailPage } from './ApplicationSetDetailPage';

describe('ApplicationSetDetailPage', () => {
  it('renders appset name', () => {
    render(<ApplicationSetDetailPage />);
    expect(screen.getByRole('heading', { name: 'my-appset' })).toBeInTheDocument();
  });

  it('renders generator labels', () => {
    render(<ApplicationSetDetailPage />);
    expect(screen.getByText('list')).toBeInTheDocument();
    expect(screen.getByText('git')).toBeInTheDocument();
  });

  it('renders conditions', () => {
    render(<ApplicationSetDetailPage />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('True')).toBeInTheDocument();
  });
});
