import React from 'react';
import { render, screen } from '@testing-library/react';
import { GenericResourceListPage } from './GenericResourceListPage';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [
    [
      { metadata: { name: 'item-1', namespace: 'default', uid: '1' }, status: { phase: 'Running' } },
      { metadata: { name: 'item-2', namespace: 'test', uid: '2' }, status: { phase: 'Succeeded' } },
    ],
    true,
    null,
  ],
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
  ListPageHeader: ({ title, children }: { title: string; children?: React.ReactNode }) => <div><h1>{title}</h1>{children}</div>,
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string, opts?: Record<string, string>) => {
    if (opts) return Object.entries(opts).reduce((acc, [k, v]) => acc.replace(`{{${k}}}`, v), s);
    return s;
  }}),
}));

describe('GenericResourceListPage', () => {
  const gvk = { group: 'argoproj.io', version: 'v1alpha1', kind: 'TestKind' };

  it('renders title and items', () => {
    render(
      <GenericResourceListPage
        title="Test Resources"
        groupVersionKind={gvk}
        columns={[
          { title: 'Name', field: 'metadata.name' },
          { title: 'Namespace', field: 'metadata.namespace' },
          { title: 'Phase', field: 'status.phase' },
        ]}
      />,
    );
    expect(screen.getByText('item-1')).toBeInTheDocument();
    expect(screen.getByText('item-2')).toBeInTheDocument();
  });

  it('renders a create button', () => {
    render(
      <GenericResourceListPage
        title="Test"
        groupVersionKind={gvk}
        columns={[{ title: 'Name', field: 'metadata.name' }]}
      />,
    );
    expect(screen.getByText('Create TestKind')).toBeInTheDocument();
  });
});
