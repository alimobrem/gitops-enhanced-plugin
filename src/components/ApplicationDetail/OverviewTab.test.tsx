import React from 'react';
import { render, screen } from '@testing-library/react';
import { OverviewTab } from './OverviewTab';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  k8sPatch: jest.fn().mockResolvedValue({}),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));

const mockApp = {
  apiVersion: 'argoproj.io/v1alpha1' as const,
  kind: 'Application' as const,
  metadata: { name: 'test-app', namespace: 'openshift-gitops', uid: '1' },
  spec: {
    source: { repoURL: 'https://github.com/org/repo', path: 'manifests', targetRevision: 'v1.0' },
    destination: { server: 'https://kubernetes.default.svc', namespace: 'prod' },
    project: 'my-project',
    syncPolicy: { automated: { prune: true, selfHeal: false } },
  },
  status: {
    sync: { status: 'Synced' as const, revision: 'abc1234567890' },
    health: { status: 'Healthy' as const },
    operationState: { phase: 'Succeeded', message: 'successfully synced (all tasks run)', syncResult: { revision: 'abc1234567890' }, finishedAt: '2026-05-26T12:00:00Z' },
  },
};

describe('OverviewTab', () => {
  it('renders source info', () => {
    render(<OverviewTab obj={mockApp} />);
    expect(screen.getByText('github.com/org/repo')).toBeInTheDocument();
    expect(screen.getByText('manifests')).toBeInTheDocument();
    expect(screen.getByText('v1.0')).toBeInTheDocument();
  });

  it('renders destination info', () => {
    render(<OverviewTab obj={mockApp} />);
    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getByText('my-project')).toBeInTheDocument();
  });

  it('renders revision as clickable link with short hash', () => {
    render(<OverviewTab obj={mockApp} />);
    expect(screen.getAllByText(/abc1234/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders sync policy banner', () => {
    render(<OverviewTab obj={mockApp} />);
    expect(screen.getByText(/Auto sync is enabled/)).toBeInTheDocument();
  });

  it('renders last sync result', () => {
    render(<OverviewTab obj={mockApp} />);
    expect(screen.getByText('Sync OK')).toBeInTheDocument();
  });

  it('renders sync policy toggles', () => {
    render(<OverviewTab obj={mockApp} />);
    expect(screen.getByText('Auto-sync')).toBeInTheDocument();
    expect(screen.getByText('Prune resources')).toBeInTheDocument();
    expect(screen.getByText('Self-heal')).toBeInTheDocument();
  });
});
