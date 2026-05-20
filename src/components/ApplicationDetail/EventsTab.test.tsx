import React from 'react';
import { render, screen } from '@testing-library/react';
import { EventsTab } from './EventsTab';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

const baseApp = {
  apiVersion: 'argoproj.io/v1alpha1' as const,
  kind: 'Application' as const,
  metadata: { name: 'test', namespace: 'ns', uid: '1' },
  spec: { destination: { server: 'https://kubernetes.default.svc', namespace: 'default' }, project: 'default' },
};

describe('EventsTab', () => {
  it('shows empty conditions', () => {
    render(<EventsTab app={{ ...baseApp, status: { sync: { status: 'Synced' }, health: { status: 'Healthy' } } }} />);
    expect(screen.getByText('No conditions.')).toBeInTheDocument();
  });

  it('shows operation state when present', () => {
    const app = {
      ...baseApp,
      status: {
        sync: { status: 'Synced' as const },
        health: { status: 'Healthy' as const },
        operationState: { phase: 'Succeeded', message: 'synced', startedAt: '2026-01-01T00:00:00Z', finishedAt: '2026-01-01T00:01:00Z' },
      },
    };
    render(<EventsTab app={app} />);
    expect(screen.getByText('Succeeded')).toBeInTheDocument();
    expect(screen.getByText('synced')).toBeInTheDocument();
  });

  it('shows conditions when present', () => {
    const app = {
      ...baseApp,
      status: {
        sync: { status: 'Synced' as const },
        health: { status: 'Healthy' as const },
        conditions: [{ type: 'SyncError', message: 'something failed' }],
      },
    };
    render(<EventsTab app={app} />);
    expect(screen.getByText('SyncError')).toBeInTheDocument();
    expect(screen.getByText('something failed')).toBeInTheDocument();
  });
});
