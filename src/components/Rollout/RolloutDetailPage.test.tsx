import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [{
    metadata: { name: 'demo-rollout', namespace: 'guestbook', uid: '1' },
    spec: {
      replicas: 3,
      revisionHistoryLimit: 5,
      minReadySeconds: 10,
      progressDeadlineSeconds: 300,
      strategy: {
        canary: {
          maxSurge: '25%',
          maxUnavailable: '0',
          stableService: 'demo-stable',
          canaryService: 'demo-canary',
          steps: [{ setWeight: 20 }, { pause: { duration: '30s' } }],
        },
      },
      template: { spec: { containers: [{ name: 'app', image: 'nginx:latest', ports: [{ containerPort: 80 }] }] } },
    },
    status: { phase: 'Healthy', currentStepIndex: 0 },
  }, true, null],
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
  k8sPatch: jest.fn().mockResolvedValue({}),
  k8sDelete: jest.fn(),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
jest.mock('react-router', () => ({ useParams: () => ({ name: 'demo-rollout', ns: 'guestbook' }) }));
jest.mock('react-router-dom', () => ({ useHistory: () => ({ push: jest.fn(), goBack: jest.fn() }) }));

import { RolloutDetailPage } from './RolloutDetailPage';

describe('RolloutDetailPage', () => {
  it('renders rollout name', () => {
    render(<RolloutDetailPage />);
    expect(screen.getByRole('heading', { name: 'demo-rollout' })).toBeInTheDocument();
  });

  it('shows strategy type', () => {
    render(<RolloutDetailPage />);
    expect(screen.getAllByText('Canary').length).toBeGreaterThanOrEqual(1);
  });

  it('shows canary steps', () => {
    render(<RolloutDetailPage />);
    expect(screen.getAllByText(/setWeight/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows phase', () => {
    render(<RolloutDetailPage />);
    expect(screen.getAllByText('Healthy').length).toBeGreaterThan(0);
  });

  it('shows Overview and Configuration tabs', () => {
    render(<RolloutDetailPage />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
  });

  it('shows new overview fields', () => {
    render(<RolloutDetailPage />);
    expect(screen.getAllByText('Revision History Limit').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Min Ready Seconds').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Progress Deadline Seconds').length).toBeGreaterThanOrEqual(1);
  });

  it('shows canary strategy details', () => {
    render(<RolloutDetailPage />);
    expect(screen.getAllByText('Max Surge').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Stable Service').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('demo-stable').length).toBeGreaterThanOrEqual(1);
  });
});
