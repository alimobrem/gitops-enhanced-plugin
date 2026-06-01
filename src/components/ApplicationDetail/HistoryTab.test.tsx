import React from 'react';
import { render, screen } from '@testing-library/react';
import { HistoryTab } from './HistoryTab';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [{ metadata: { name: "testuser" } }, true, null],
  k8sDelete: jest.fn().mockResolvedValue({}),
  k8sPatch: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));
jest.mock('../../utils/time', () => ({ timeAgo: () => '1d ago' }));

const baseApp = {
  apiVersion: 'argoproj.io/v1alpha1' as const,
  kind: 'Application' as const,
  metadata: { name: 'test', namespace: 'openshift-gitops', uid: '1' },
  spec: {
    destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
    project: 'default',
  },
};

describe('HistoryTab', () => {
  it('shows empty state when no history', () => {
    render(<HistoryTab obj={{ ...baseApp, status: { sync: { status: 'Synced' }, health: { status: 'Healthy' }, history: [] } }} />);
    expect(screen.getByText('No deployment history available.')).toBeInTheDocument();
  });

  it('renders history rows with revisions', () => {
    const app = {
      ...baseApp,
      status: {
        sync: { status: 'Synced' as const },
        health: { status: 'Healthy' as const },
        history: [
          { id: 1, revision: 'abc1234567890', deployedAt: '2026-05-19T12:00:00Z', source: { repoURL: 'https://github.com/org/repo.git' } },
          { id: 2, revision: 'def4567890123', deployedAt: '2026-05-20T08:00:00Z', source: { repoURL: 'https://github.com/org/repo.git' } },
        ],
      },
    };
    render(<HistoryTab obj={app} />);
    expect(screen.getByText('abc1234')).toBeInTheDocument();
    expect(screen.getByText('def4567')).toBeInTheDocument();
  });

  it('renders status labels', () => {
    const app = {
      ...baseApp,
      status: {
        sync: { status: 'Synced' as const },
        health: { status: 'Healthy' as const },
        history: [
          { id: 1, revision: 'abc1234567890', deployedAt: '2026-05-19T12:00:00Z' },
        ],
      },
    };
    render(<HistoryTab obj={app} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('links revisions to GitHub commits', () => {
    const app = {
      ...baseApp,
      status: {
        sync: { status: 'Synced' as const },
        health: { status: 'Healthy' as const },
        history: [
          { id: 1, revision: 'abc1234567890', deployedAt: '2026-05-19T12:00:00Z', source: { repoURL: 'https://github.com/org/repo.git' } },
        ],
      },
    };
    render(<HistoryTab obj={app} />);
    const link = screen.getByText('abc1234').closest('a');
    expect(link?.getAttribute('href')).toBe('https://github.com/org/repo/commit/abc1234567890');
  });

  it('shows shortened repo path in Source column', () => {
    const app = {
      ...baseApp,
      status: {
        sync: { status: 'Synced' as const },
        health: { status: 'Healthy' as const },
        history: [
          { id: 1, revision: 'abc1234567890', deployedAt: '2026-05-19T12:00:00Z', source: { repoURL: 'https://github.com/argoproj/argocd-example-apps.git' } },
        ],
      },
    };
    render(<HistoryTab obj={app} />);
    expect(screen.getByText('argoproj/argocd-example-apps.git')).toBeInTheDocument();
  });

  it('renders kebab actions per row', () => {
    const app = {
      ...baseApp,
      status: {
        sync: { status: 'Synced' as const },
        health: { status: 'Healthy' as const },
        history: [
          { id: 1, revision: 'abc1234567890', deployedAt: '2026-05-19T12:00:00Z' },
          { id: 2, revision: 'def4567890123', deployedAt: '2026-05-20T08:00:00Z' },
        ],
      },
    };
    render(<HistoryTab obj={app} />);
    const kebabs = screen.getAllByLabelText('Actions');
    expect(kebabs.length).toBe(2);
  });
});
