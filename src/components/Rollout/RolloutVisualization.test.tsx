import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string, opts?: Record<string, unknown>) => {
  if (opts) return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts[k] ?? ''));
  return s;
} }) }));

const mockUseK8sWatchResource = jest.fn().mockReturnValue([[], true, undefined]);
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: (...args: unknown[]) => mockUseK8sWatchResource(...args),
}));

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
});

describe('RolloutVisualization', () => {
  describe('Phase Banner', () => {
    it('renders success variant for Healthy phase', () => {
      const { container } = render(<RolloutVisualization rollout={healthyRollout} />);
      expect(container.querySelector('.pf-m-success')).toBeTruthy();
    });

    it('renders info variant for Paused phase', () => {
      const { container } = render(<RolloutVisualization rollout={canaryRollout} />);
      expect(container.querySelector('.pf-m-info')).toBeTruthy();
    });

    it('renders danger variant for Degraded phase', () => {
      const { container } = render(<RolloutVisualization rollout={degradedRollout} />);
      expect(container.querySelector('.pf-m-danger')).toBeTruthy();
    });
  });

  describe('Canary Step Timeline', () => {
    it('renders all step cards', () => {
      render(<RolloutVisualization rollout={canaryRollout} />);
      expect(screen.getByText('20%')).toBeInTheDocument();
      expect(screen.getByText('30s')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('∞')).toBeInTheDocument();
    });

    it('renders step count title', () => {
      render(<RolloutVisualization rollout={canaryRollout} />);
      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
    });

    it('marks completed steps with success icon', () => {
      const { container } = render(<RolloutVisualization rollout={canaryRollout} />);
      expect(container.querySelectorAll('.gitops-step-icon--success').length).toBe(2);
    });

    it('marks current step with paused icon when phase is Paused', () => {
      const { container } = render(<RolloutVisualization rollout={canaryRollout} />);
      expect(container.querySelector('.gitops-step-icon--paused')).toBeTruthy();
    });
  });

  describe('Traffic Split Bar', () => {
    it('renders traffic split with correct percentages', () => {
      render(<RolloutVisualization rollout={canaryRollout} />);
      expect(screen.getByText('Traffic Split')).toBeInTheDocument();
      // currentStepIndex=2, last completed setWeight is step[0]=20
      expect(screen.getByText('Stable (80%)')).toBeInTheDocument();
      expect(screen.getByText('Canary (20%)')).toBeInTheDocument();
    });

    it('does not render traffic bar for blue-green', () => {
      render(<RolloutVisualization rollout={blueGreenRollout} />);
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

      render(<RolloutVisualization rollout={blueGreenRollout} />);
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

      render(<RolloutVisualization rollout={canaryRollout} />);
      expect(screen.getByText('Analysis Result')).toBeInTheDocument();
      expect(screen.getByText('Successful')).toBeInTheDocument();
      expect(screen.getByText('All metrics passed')).toBeInTheDocument();
    });
  });
});
