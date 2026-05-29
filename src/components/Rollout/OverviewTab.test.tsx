import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string, opts?: Record<string, unknown>) => {
  if (opts) return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts[k] ?? ''));
  return s;
} }) }));
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: jest.fn().mockReturnValue([[], true, undefined]),
}));

const mockAbort = jest.fn().mockResolvedValue(undefined);
const mockRestart = jest.fn().mockResolvedValue(undefined);
jest.mock('../../hooks/useRolloutActions', () => ({
  useRolloutActions: () => ({
    promote: jest.fn(),
    promoteFull: jest.fn(),
    abort: mockAbort,
    restart: mockRestart,
  }),
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

beforeEach(() => {
  mockAbort.mockClear();
  mockRestart.mockClear();
});

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

  describe('Abort button', () => {
    it('renders Abort button when phase is Paused', () => {
      render(<OverviewTab obj={mockRollout} />);
      expect(screen.getByText('Abort')).toBeInTheDocument();
    });

    it('renders Abort button when phase is Progressing', () => {
      const progRollout = { ...mockRollout, status: { ...mockRollout.status, phase: 'Progressing' } };
      render(<OverviewTab obj={progRollout} />);
      expect(screen.getByText('Abort')).toBeInTheDocument();
    });

    it('does not render Abort button when phase is Healthy', () => {
      const healthyRollout = { ...mockRollout, status: { ...mockRollout.status, phase: 'Healthy' } };
      render(<OverviewTab obj={healthyRollout} />);
      expect(screen.queryByText('Abort')).not.toBeInTheDocument();
    });

    it('clicking Abort opens danger ConfirmModal', () => {
      render(<OverviewTab obj={mockRollout} />);
      fireEvent.click(screen.getByText('Abort'));
      expect(screen.getByText('Are you sure you want to abort this rollout? This will revert traffic to the stable version.')).toBeInTheDocument();
    });

    it('confirming Abort calls abort()', async () => {
      render(<OverviewTab obj={mockRollout} />);
      fireEvent.click(screen.getByText('Abort'));
      const abortButtons = screen.getAllByText('Abort');
      const modalConfirm = abortButtons[abortButtons.length - 1];
      fireEvent.click(modalConfirm);
      await waitFor(() => expect(mockAbort).toHaveBeenCalledTimes(1));
    });
  });

  describe('Restart button', () => {
    it('renders Restart button always', () => {
      render(<OverviewTab obj={mockRollout} />);
      expect(screen.getByText('Restart')).toBeInTheDocument();
    });

    it('renders Restart button for Healthy phase', () => {
      const healthyRollout = { ...mockRollout, status: { ...mockRollout.status, phase: 'Healthy' } };
      render(<OverviewTab obj={healthyRollout} />);
      expect(screen.getByText('Restart')).toBeInTheDocument();
    });

    it('clicking Restart opens ConfirmModal', () => {
      render(<OverviewTab obj={mockRollout} />);
      fireEvent.click(screen.getByText('Restart'));
      expect(screen.getByText('Are you sure you want to restart this rollout?')).toBeInTheDocument();
    });

    it('confirming Restart calls restart()', async () => {
      render(<OverviewTab obj={mockRollout} />);
      fireEvent.click(screen.getByText('Restart'));
      const restartButtons = screen.getAllByText('Restart');
      const modalConfirm = restartButtons[restartButtons.length - 1];
      fireEvent.click(modalConfirm);
      await waitFor(() => expect(mockRestart).toHaveBeenCalledTimes(1));
    });
  });
});
