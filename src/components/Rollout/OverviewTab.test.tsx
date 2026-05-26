import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

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

  it('renders Canary strategy label', () => {
    render(<OverviewTab obj={mockRollout} />);
    expect(screen.getAllByText('Canary')).toHaveLength(2); // strategy Label + CardTitle
  });

  it('renders replicas', () => {
    render(<OverviewTab obj={mockRollout} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders phase', () => {
    render(<OverviewTab obj={mockRollout} />);
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('renders canary strategy fields', () => {
    render(<OverviewTab obj={mockRollout} />);
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('my-svc-stable')).toBeInTheDocument();
    expect(screen.getByText('my-svc-canary')).toBeInTheDocument();
  });

  it('renders container image', () => {
    render(<OverviewTab obj={mockRollout} />);
    expect(screen.getByText('nginx:1.21')).toBeInTheDocument();
  });

  it('renders container port', () => {
    render(<OverviewTab obj={mockRollout} />);
    expect(screen.getByText('8080')).toBeInTheDocument();
  });

  it('renders current step index', () => {
    render(<OverviewTab obj={mockRollout} />);
    expect(screen.getByText('Current Step')).toBeInTheDocument();
  });

  it('renders canary steps', () => {
    render(<OverviewTab obj={mockRollout} />);
    expect(screen.getByText('setWeight: 20')).toBeInTheDocument();
  });
});
