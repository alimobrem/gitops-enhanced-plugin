import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string, opts?: Record<string, unknown>) => {
  if (opts) return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts[k] ?? ''));
  return s;
} }) }));

const mockUseK8sWatchResource = jest.fn().mockReturnValue([[], true, undefined]);
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: (...args: unknown[]) => mockUseK8sWatchResource(...args),
}));

const mockPromote = jest.fn().mockResolvedValue(undefined);
const mockPromoteFull = jest.fn().mockResolvedValue(undefined);

import { RolloutVisualization } from './RolloutVisualization';
import type { RolloutResource } from '../../types';

const canaryRollout: RolloutResource = {
  metadata: { name: 'my-rollout', namespace: 'default', uid: 'uid-1' },
  spec: {
    replicas: 3,
    strategy: {
      canary: {
        stableService: 'svc-stable',
        canaryService: 'svc-canary',
        steps: [
          { setWeight: 20 },
          { pause: { duration: '30s' } },
          { setWeight: 50 },
          { pause: {} },
        ],
      },
    },
    template: { spec: { containers: [{ name: 'app', image: 'nginx:1.21' }] } },
  },
  status: {
    phase: 'Paused',
    currentStepIndex: 2,
    replicas: 3,
    readyReplicas: 3,
    stableRS: 'abc123',
    currentPodHash: 'def456',
  },
};

const blueGreenRollout: RolloutResource = {
  metadata: { name: 'bg-rollout', namespace: 'default', uid: 'uid-2' },
  spec: {
    replicas: 2,
    strategy: {
      blueGreen: {
        activeService: 'svc-active',
        previewService: 'svc-preview',
      },
    },
    template: { spec: { containers: [{ name: 'app', image: 'httpd:2.4' }] } },
  },
  status: {
    phase: 'Healthy',
    replicas: 2,
    readyReplicas: 2,
    stableRS: 'aaa111',
    currentPodHash: 'bbb222',
  },
};

const healthyRollout: RolloutResource = {
  metadata: { name: 'healthy-rollout', namespace: 'default', uid: 'uid-3' },
  spec: {
    replicas: 1,
    strategy: { canary: { steps: [{ setWeight: 100 }] } },
    template: { spec: { containers: [{ name: 'app', image: 'nginx:latest' }] } },
  },
  status: { phase: 'Healthy', replicas: 1, readyReplicas: 1 },
};

const degradedRollout: RolloutResource = {
  metadata: { name: 'bad-rollout', namespace: 'default', uid: 'uid-4' },
  spec: {
    replicas: 1,
    strategy: { canary: { steps: [] } },
    template: { spec: { containers: [{ name: 'app', image: 'nginx:latest' }] } },
  },
  status: { phase: 'Degraded', replicas: 1, readyReplicas: 0 },
};

beforeEach(() => {
  mockUseK8sWatchResource.mockReturnValue([[], true, undefined]);
  mockPromote.mockClear();
  mockPromoteFull.mockClear();
});

describe('RolloutVisualization', () => {
  describe('Phase Banner', () => {
    it('renders success variant for Healthy phase', () => {
      const { container } = render(<RolloutVisualization rollout={healthyRollout} promote={mockPromote} promoteFull={mockPromoteFull} />);
      expect(container.querySelector('.pf-m-success')).toBeTruthy();
    });

    it('renders info variant for Paused phase', () => {
      const { container } = render(<RolloutVisualization rollout={canaryRollout} promote={mockPromote} promoteFull={mockPromoteFull} />);
      expect(container.querySelector('.pf-m-info')).toBeTruthy();
    });

    it('renders danger variant for Degraded phase', () => {
      const { container } = render(<RolloutVisualization rollout={degradedRollout} promote={mockPromote} promoteFull={mockPromoteFull} />);
      expect(container.querySelector('.pf-m-danger')).toBeTruthy();
    });
  });

  describe('Canary Step Timeline', () => {
    it('renders all step cards', () => {
      render(<RolloutVisualization rollout={canaryRollout} promote={mockPromote} promoteFull={mockPromoteFull} />);
      expect(screen.getByText('20%')).toBeInTheDocument();
      expect(screen.getByText('30s')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('∞')).toBeInTheDocument();
    });

    it('renders step count title', () => {
      render(<RolloutVisualization rollout={canaryRollout} promote={mockPromote} promoteFull={mockPromoteFull} />);
      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
    });

    it('marks completed steps with success icon', () => {
      const { container } = render(<RolloutVisualization rollout={canaryRollout} promote={mockPromote} promoteFull={mockPromoteFull} />);
      expect(container.querySelectorAll('.gitops-step-icon--success').length).toBe(2);
    });

    it('marks current step with paused icon when phase is Paused', () => {
      const { container } = render(<RolloutVisualization rollout={canaryRollout} promote={mockPromote} promoteFull={mockPromoteFull} />);
      expect(container.querySelector('.gitops-step-icon--paused')).toBeTruthy();
    });
  });

  describe('Traffic Split Bar', () => {
    it('renders traffic split with correct percentages', () => {
      render(<RolloutVisualization rollout={canaryRollout} promote={mockPromote} promoteFull={mockPromoteFull} />);
      expect(screen.getByText('Traffic Split')).toBeInTheDocument();
      // currentStepIndex=2, last completed setWeight is step[0]=20
      expect(screen.getByText('Stable (80%)')).toBeInTheDocument();
      expect(screen.getByText('Canary (20%)')).toBeInTheDocument();
    });

    it('does not render traffic bar for blue-green', () => {
      render(<RolloutVisualization rollout={blueGreenRollout} promote={mockPromote} promoteFull={mockPromoteFull} />);
      expect(screen.queryByText('Traffic Split')).not.toBeInTheDocument();
    });
  });

  describe('Blue-Green visualization', () => {
    it('renders Active and Preview labels for blue-green rollout', () => {
      mockUseK8sWatchResource.mockImplementation((resource: Record<string, unknown>) => {
        if ((resource.groupVersionKind as Record<string, string>)?.kind === 'ReplicaSet') {
          return [[
            {
              metadata: { name: 'rs-active', namespace: 'default', uid: 'rs-1', labels: { 'rollouts-pod-template-hash': 'aaa111' }, ownerReferences: [{ name: 'bg-rollout', kind: 'Rollout', uid: 'uid-2' }] },
              spec: { replicas: 2, template: { spec: { containers: [{ image: 'httpd:2.4' }] } } },
              status: { replicas: 2, readyReplicas: 2 },
            },
            {
              metadata: { name: 'rs-preview', namespace: 'default', uid: 'rs-2', labels: { 'rollouts-pod-template-hash': 'bbb222' }, ownerReferences: [{ name: 'bg-rollout', kind: 'Rollout', uid: 'uid-2' }] },
              spec: { replicas: 2, template: { spec: { containers: [{ image: 'httpd:2.5' }] } } },
              status: { replicas: 2, readyReplicas: 1 },
            },
          ], true, undefined];
        }
        return [[], true, undefined];
      });

      render(<RolloutVisualization rollout={blueGreenRollout} promote={mockPromote} promoteFull={mockPromoteFull} />);
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });
  });

  describe('Latest Analysis Run', () => {
    it('renders analysis result when available', () => {
      mockUseK8sWatchResource.mockImplementation((resource: Record<string, unknown>) => {
        if ((resource.groupVersionKind as Record<string, string>)?.kind === 'AnalysisRun') {
          return [[{
            metadata: { name: 'ar-1', namespace: 'default', uid: 'ar-uid', creationTimestamp: '2025-01-01T00:00:00Z', ownerReferences: [{ name: 'my-rollout', kind: 'Rollout' }] },
            status: { phase: 'Successful', message: 'All metrics passed' },
          }], true, undefined];
        }
        return [[], true, undefined];
      });

      render(<RolloutVisualization rollout={canaryRollout} promote={mockPromote} promoteFull={mockPromoteFull} />);
      expect(screen.getByText('Analysis Result')).toBeInTheDocument();
      expect(screen.getByText('Successful')).toBeInTheDocument();
      expect(screen.getByText('All metrics passed')).toBeInTheDocument();
    });
  });

  describe('Promote/Promote Full buttons', () => {
    it('renders Promote and Promote Full buttons when phase is Paused', () => {
      render(<RolloutVisualization rollout={canaryRollout} promote={mockPromote} promoteFull={mockPromoteFull} />);
      expect(screen.getByText('Promote')).toBeInTheDocument();
      expect(screen.getByText('Promote Full')).toBeInTheDocument();
    });

    it('does not render Promote button when phase is Progressing', () => {
      const progressingRollout: RolloutResource = {
        ...canaryRollout,
        status: { ...canaryRollout.status, phase: 'Progressing' },
      };
      render(<RolloutVisualization rollout={progressingRollout} promote={mockPromote} promoteFull={mockPromoteFull} />);
      expect(screen.queryByText('Promote')).not.toBeInTheDocument();
      expect(screen.queryByText('Promote Full')).not.toBeInTheDocument();
    });

    it('clicking Promote opens ConfirmModal with traffic shift message', () => {
      render(<RolloutVisualization rollout={canaryRollout} promote={mockPromote} promoteFull={mockPromoteFull} />);
      fireEvent.click(screen.getByText('Promote'));
      expect(screen.getByText('Traffic will shift from 20% to 100%')).toBeInTheDocument();
    });

    it('clicking Promote Full opens ConfirmModal with skip message', () => {
      render(<RolloutVisualization rollout={canaryRollout} promote={mockPromote} promoteFull={mockPromoteFull} />);
      fireEvent.click(screen.getByText('Promote Full'));
      expect(screen.getByText('Skip remaining steps and promote to 100% traffic')).toBeInTheDocument();
    });

    it('confirming Promote calls promote()', async () => {
      render(<RolloutVisualization rollout={canaryRollout} promote={mockPromote} promoteFull={mockPromoteFull} />);
      fireEvent.click(screen.getByText('Promote'));
      const confirmButtons = screen.getAllByText('Promote');
      const modalConfirm = confirmButtons[confirmButtons.length - 1];
      fireEvent.click(modalConfirm);
      await waitFor(() => expect(mockPromote).toHaveBeenCalledTimes(1));
    });

    it('confirming Promote Full calls promoteFull()', async () => {
      render(<RolloutVisualization rollout={canaryRollout} promote={mockPromote} promoteFull={mockPromoteFull} />);
      fireEvent.click(screen.getByText('Promote Full'));
      const confirmButtons = screen.getAllByText('Promote Full');
      const modalConfirm = confirmButtons[confirmButtons.length - 1];
      fireEvent.click(modalConfirm);
      await waitFor(() => expect(mockPromoteFull).toHaveBeenCalledTimes(1));
    });

    it('computes nextWeight from subsequent setWeight step', () => {
      const rolloutWithNext: RolloutResource = {
        ...canaryRollout,
        spec: {
          ...canaryRollout.spec,
          strategy: {
            canary: {
              steps: [
                { setWeight: 20 },
                { pause: {} },
                { setWeight: 50 },
                { pause: {} },
                { setWeight: 80 },
              ],
            },
          },
        },
        status: { ...canaryRollout.status, phase: 'Paused', currentStepIndex: 1 },
      };
      render(<RolloutVisualization rollout={rolloutWithNext} promote={mockPromote} promoteFull={mockPromoteFull} />);
      fireEvent.click(screen.getByText('Promote'));
      expect(screen.getByText('Traffic will shift from 20% to 50%')).toBeInTheDocument();
    });
  });
});
