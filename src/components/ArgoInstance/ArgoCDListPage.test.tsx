import React from 'react';
import { render, screen } from '@testing-library/react';

const mockInstances = [
  {
    metadata: { name: 'openshift-gitops', namespace: 'openshift-gitops', uid: '1' },
    status: { phase: 'Available', host: 'argocd.example.com', server: 'Running', repo: 'Running', redis: 'Running', applicationController: 'Running' },
  },
];

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: (resource: { groupVersionKind?: { kind?: string } }) => {
    if (resource.groupVersionKind?.kind === 'Application') return [[], true, null];
    return [mockInstances, true, null];
  },
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { ArgoCDListPage } from './ArgoCDListPage';

describe('ArgoCDListPage', () => {
  it('renders instance name', () => {
    render(<ArgoCDListPage />);
    expect(screen.getAllByText('openshift-gitops').length).toBeGreaterThanOrEqual(1);
  });

  it('renders phase label', () => {
    render(<ArgoCDListPage />);
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('renders Open in Argo CD link', () => {
    render(<ArgoCDListPage />);
    expect(screen.getByText('Open in Argo CD')).toBeInTheDocument();
  });

  it('renders component status labels', () => {
    render(<ArgoCDListPage />);
    expect(screen.getByText('server')).toBeInTheDocument();
    expect(screen.getByText('repo')).toBeInTheDocument();
    expect(screen.getByText('redis')).toBeInTheDocument();
    expect(screen.getByText('controller')).toBeInTheDocument();
  });
});
