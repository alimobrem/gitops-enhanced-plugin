import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string, opts?: Record<string, unknown>) => {
  if (opts) return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts[k] ?? ''));
  return s;
} }) }));
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: jest.fn().mockReturnValue([[], true, undefined]),
}));

import { OverviewTab } from './OverviewTab';
import type { RolloutResource } from '../../types';

const mockRollout: RolloutResource = {
  metadata: { name: 'test-rollout', namespace: 'default', uid: '1' },
  spec: {
    replicas: 3,
    revisionHistoryLimit: 5,
    minReadySeconds: 10,
    progressDeadlineSeconds: 300,
    strategy: {
      canary: {
        maxSurge: '25%',
        maxUnavailable: 0,
        stableService: 'my-svc-stable',
        canaryService: 'my-svc-canary',
        steps: [{ setWeight: 20 }, { pause: {} }],
      },
    },
    template: {
      spec: {
        containers: [{ name: 'app', image: 'nginx:1.21', ports: [{ containerPort: 8080 }] }],
      },
    },
  },
  status: {
    phase: 'Paused',
    currentStepIndex: 1,
    replicas: 3,
    updatedReplicas: 1,
    readyReplicas: 3,
    availableReplicas: 3,
  },
};

describe('OverviewTab (Rollout)', () => {
  it('renders spinner when obj is undefined', () => {
    const { container } = render(<OverviewTab />);
    expect(container.querySelector('.pf-v6-c-spinner')).toBeTruthy();
  });

  it('renders phase banner from RolloutVisualization', () => {
    const { container } = render(<OverviewTab obj={mockRollout} />);
    // Paused phase renders info variant alert
    expect(container.querySelector('.pf-m-info')).toBeTruthy();
  });

  it('renders canary step timeline', () => {
    render(<OverviewTab obj={mockRollout} />);
    // Steps rendered as step labels: 20% and ∞
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('∞')).toBeInTheDocument();
  });

  it('renders traffic split', () => {
    render(<OverviewTab obj={mockRollout} />);
    expect(screen.getByText('Traffic Split')).toBeInTheDocument();
  });

  it('renders configuration section', () => {
    render(<OverviewTab obj={mockRollout} />);
    expect(screen.getByText('Configuration')).toBeInTheDocument();
  });
});
