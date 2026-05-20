import React from 'react';
import { render, screen } from '@testing-library/react';
import { NamespaceGitOpsTab } from './NamespaceGitOpsTab';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [
    [
      {
        metadata: { name: 'app1', namespace: 'openshift-gitops', uid: '1' },
        spec: { destination: { namespace: 'my-ns' }, project: 'default', source: { repoURL: 'https://github.com/org/repo' } },
        status: { sync: { status: 'Synced' }, health: { status: 'Healthy' } },
      },
      {
        metadata: { name: 'app2', namespace: 'openshift-gitops', uid: '2' },
        spec: { destination: { namespace: 'other-ns' }, project: 'default', source: { repoURL: 'https://github.com/org/other' } },
        status: { sync: { status: 'OutOfSync' }, health: { status: 'Degraded' } },
      },
    ],
    true,
    null,
  ],
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));

describe('NamespaceGitOpsTab', () => {
  it('shows only apps targeting the given namespace', () => {
    render(<NamespaceGitOpsTab obj={{ metadata: { name: 'my-ns' } }} />);
    expect(screen.getByText('app1')).toBeInTheDocument();
    expect(screen.queryByText('app2')).not.toBeInTheDocument();
  });

  it('shows empty state when no apps target the namespace', () => {
    render(<NamespaceGitOpsTab obj={{ metadata: { name: 'empty-ns' } }} />);
    expect(screen.getByText('No Argo CD applications target this namespace.')).toBeInTheDocument();
  });
});
