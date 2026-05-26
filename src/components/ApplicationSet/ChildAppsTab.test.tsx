import React from 'react';
import { render, screen } from '@testing-library/react';

const mockChildApps = [
  {
    metadata: {
      name: 'child-1',
      namespace: 'openshift-gitops',
      uid: 'c1',
      ownerReferences: [{ kind: 'ApplicationSet', name: 'test-appset' }],
    },
    spec: { destination: { server: 'https://kubernetes.default.svc', namespace: 'prod' } },
    status: { sync: { status: 'Synced' }, health: { status: 'Healthy' } },
  },
];

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [mockChildApps, true, null],
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { ChildAppsTab } from './ChildAppsTab';
import type { AppSetResource } from '../../types';

const mockAppSet: AppSetResource = {
  metadata: { name: 'test-appset', namespace: 'openshift-gitops', uid: '1' },
  spec: { generators: [] },
};

describe('ChildAppsTab', () => {
  it('renders spinner when obj is undefined', () => {
    const { container } = render(<ChildAppsTab />);
    expect(container.querySelector('.pf-v6-c-spinner')).toBeTruthy();
  });

  it('renders child app names in table', () => {
    render(<ChildAppsTab obj={mockAppSet} />);
    expect(screen.getByText('child-1')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<ChildAppsTab obj={mockAppSet} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Sync Status')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Destination')).toBeInTheDocument();
  });
});

describe('ChildAppsTab empty state', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('renders empty state when no child apps match', () => {
    jest.doMock('@openshift-console/dynamic-plugin-sdk', () => ({
      useK8sWatchResource: () => [[], true, null],
      ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
    }));
    jest.doMock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

    const { ChildAppsTab: FreshChildAppsTab } = require('./ChildAppsTab');
    render(<FreshChildAppsTab obj={mockAppSet} />);
    expect(screen.getByText('No child applications found.')).toBeInTheDocument();
  });
});
