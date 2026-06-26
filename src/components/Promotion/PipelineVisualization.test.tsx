import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string, opts?: Record<string, unknown>) => {
  if (opts) return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts[k] ?? ''));
  return s;
} }) }));

const mockUseK8sWatchResource = jest.fn().mockReturnValue([[], true, undefined]);
const mockK8sPatch = jest.fn().mockResolvedValue(undefined);
const mockK8sCreate = jest.fn().mockResolvedValue(undefined);
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: (...args: unknown[]) => mockUseK8sWatchResource(...args),
  k8sPatch: (...args: unknown[]) => mockK8sPatch(...args),
  k8sCreate: (...args: unknown[]) => mockK8sCreate(...args),
}));

import { PipelineVisualization } from './PipelineVisualization';
import type { PromotionStrategyResource } from '../../types';

const healthyStrategy: PromotionStrategyResource = {
  apiVersion: 'promoter.argoproj.io/v1alpha1',
  kind: 'PromotionStrategy',
  metadata: { name: 'test', namespace: 'default', uid: 'uid-1' },
  spec: {
    gitRepositoryRef: { name: 'my-repo' },
    environments: [
      { branch: 'env/dev' },
      { branch: 'env/staging' },
      { branch: 'env/prod' },
    ],
  },
  status: {
    environments: [
      { branch: 'env/dev', proposed: {}, active: { dry: { sha: 'abc1234' } } },
      { branch: 'env/staging', proposed: {}, active: { dry: { sha: 'abc1234' } } },
      { branch: 'env/prod', proposed: {}, active: { dry: { sha: 'abc1234' } } },
    ],
  },
};

const blockedStrategy: PromotionStrategyResource = {
  ...healthyStrategy,
  metadata: { ...healthyStrategy.metadata, uid: 'uid-2' },
  status: {
    environments: [
      { branch: 'env/dev', proposed: {}, active: { dry: { sha: 'abc1234' } } },
      {
        branch: 'env/staging',
        proposed: {
          commitStatuses: [
            { key: 'security-scan', phase: 'failure', url: 'https://tekton/run/1' },
            { key: 'e2e-tests', phase: 'pending' },
          ],
        },
        active: { dry: { sha: 'def5678' } },
        pullRequest: { state: 'open', id: '42', url: 'https://github.com/org/repo/pull/42' },
      },
      { branch: 'env/prod', proposed: {}, active: { dry: { sha: 'ghi9012' } } },
    ],
  },
};

beforeEach(() => {
  mockUseK8sWatchResource.mockReturnValue([[], true, undefined]);
  mockK8sPatch.mockClear();
});

describe('PipelineVisualization', () => {
  it('renders all environment stage cards', () => {
    render(<PipelineVisualization strategy={healthyStrategy} />);
    expect(screen.getByText('dev')).toBeInTheDocument();
    expect(screen.getByText('staging')).toBeInTheDocument();
    expect(screen.getByText('prod')).toBeInTheDocument();
  });

  it('renders Promotion Pipeline title', () => {
    render(<PipelineVisualization strategy={healthyStrategy} />);
    expect(screen.getByText('Promotion Pipeline')).toBeInTheDocument();
  });

  it('renders abbreviated SHA on stage cards', () => {
    render(<PipelineVisualization strategy={healthyStrategy} />);
    expect(screen.getAllByText('abc1234')).toHaveLength(3);
  });

  it('renders healthy status labels when all environments are healthy', () => {
    render(<PipelineVisualization strategy={healthyStrategy} />);
    expect(screen.getAllByText('Healthy')).toHaveLength(3);
  });

  it('renders blocked status when a commit status fails', () => {
    render(<PipelineVisualization strategy={blockedStrategy} />);
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('shows gate detail panel when gate is clicked', () => {
    const { container } = render(<PipelineVisualization strategy={blockedStrategy} />);
    const gates = container.querySelectorAll('.gitops-gate');
    fireEvent.click(gates[0]);
    expect(screen.getByText('Gate: dev → staging')).toBeInTheDocument();
    expect(screen.getAllByText('security-scan').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('e2e-tests').length).toBeGreaterThanOrEqual(1);
  });

  it('shows PR link in gate detail', () => {
    const { container } = render(<PipelineVisualization strategy={blockedStrategy} />);
    const gates = container.querySelectorAll('.gitops-gate');
    fireEvent.click(gates[0]);
    expect(screen.getAllByText('PR #42').length).toBeGreaterThanOrEqual(1);
  });

  it('shows View Logs link for checks with URL', () => {
    const { container } = render(<PipelineVisualization strategy={blockedStrategy} />);
    const gates = container.querySelectorAll('.gitops-gate');
    fireEvent.click(gates[0]);
    expect(screen.getByText('View Logs')).toBeInTheDocument();
  });

  it('shows Retry button for failed checks', () => {
    const { container } = render(<PipelineVisualization strategy={blockedStrategy} />);
    const gates = container.querySelectorAll('.gitops-gate');
    fireEvent.click(gates[0]);
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('toggles gate detail panel off when clicking same gate', () => {
    const { container } = render(<PipelineVisualization strategy={blockedStrategy} />);
    const gates = container.querySelectorAll('.gitops-gate');
    fireEvent.click(gates[0]);
    expect(screen.getByText('Gate: dev → staging')).toBeInTheDocument();
    fireEvent.click(gates[0]);
    expect(screen.queryByText('Gate: dev → staging')).not.toBeInTheDocument();
  });
});
