import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResourcesTab } from './ResourcesTab';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));

const baseApp = {
  apiVersion: 'argoproj.io/v1alpha1' as const,
  kind: 'Application' as const,
  metadata: { name: 'test-app', namespace: 'openshift-gitops', uid: '1' },
  spec: {
    destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
    project: 'default',
  },
};

describe('ResourcesTab', () => {
  it('shows empty state when no resources', () => {
    render(<ResourcesTab app={{ ...baseApp, status: { sync: { status: 'Synced' }, health: { status: 'Healthy' }, resources: [] } }} />);
    expect(screen.getByText('No managed resources found.')).toBeInTheDocument();
  });

  it('renders resource rows', () => {
    const app = {
      ...baseApp,
      status: {
        sync: { status: 'Synced' as const },
        health: { status: 'Healthy' as const },
        resources: [
          { version: 'v1', kind: 'Service', name: 'my-svc', namespace: 'default', status: 'Synced' as const },
          { group: 'apps', version: 'v1', kind: 'Deployment', name: 'my-deploy', namespace: 'default', status: 'Synced' as const, health: { status: 'Healthy' as const } },
        ],
      },
    };
    render(<ResourcesTab app={app} />);
    expect(screen.getByText('my-svc')).toBeInTheDocument();
    expect(screen.getByText('my-deploy')).toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('Deployment')).toBeInTheDocument();
  });
});
