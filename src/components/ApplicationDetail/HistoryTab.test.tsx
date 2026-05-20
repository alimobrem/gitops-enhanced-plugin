import React from 'react';
import { render, screen } from '@testing-library/react';
import { HistoryTab } from './HistoryTab';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));

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
    render(<HistoryTab app={{ ...baseApp, status: { sync: { status: 'Synced' }, health: { status: 'Healthy' }, history: [] } }} />);
    expect(screen.getByText('No deployment history available.')).toBeInTheDocument();
  });

  it('renders history rows', () => {
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
    render(<HistoryTab app={app} />);
    expect(screen.getByText('abc1234')).toBeInTheDocument();
    expect(screen.getByText('def4567')).toBeInTheDocument();
  });
});
