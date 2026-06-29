import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

const mockUseK8sWatchResource = jest.fn();
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: (...args: unknown[]) => mockUseK8sWatchResource(...args),
}));

jest.mock('./PipelineVisualization', () => ({
  PipelineVisualization: () => <div data-testid="pipeline-viz">PipelineVisualization</div>,
}));

import { PromotionDetailPage } from './PromotionDetailPage';

const strategy = {
  apiVersion: 'promoter.argoproj.io/v1alpha1',
  kind: 'PromotionStrategy',
  metadata: { name: 'test', namespace: 'default', uid: 'uid-1' },
  spec: {
    gitRepositoryRef: { name: 'my-repo' },
    environments: [{ branch: 'env/dev' }, { branch: 'env/prod' }],
  },
  status: {
    environments: [
      { branch: 'env/dev', proposed: {}, active: { dry: { sha: 'aaa' } } },
      { branch: 'env/prod', proposed: {}, active: { dry: { sha: 'aaa' } } },
    ],
    conditions: [{ type: 'Ready', status: 'True', message: 'Reconciliation successful' }],
  },
};

const obj = { metadata: { name: 'test', namespace: 'default' } };

describe('PromotionDetailPage', () => {
  it('renders loading spinner when not loaded', () => {
    mockUseK8sWatchResource.mockReturnValue([null, false, undefined]);
    const { container } = render(<PromotionDetailPage obj={obj} />);
    expect(container.querySelector('.pf-v6-c-spinner')).toBeTruthy();
  });

  it('renders error alert when watch fails', () => {
    mockUseK8sWatchResource.mockReturnValue([null, true, new Error('not found')]);
    render(<PromotionDetailPage obj={obj} />);
    expect(screen.getByText('Error loading PromotionStrategy')).toBeInTheDocument();
  });

  it('renders nothing when strategy is null and loaded', () => {
    mockUseK8sWatchResource.mockReturnValue([null, true, undefined]);
    const { container } = render(<PromotionDetailPage obj={obj} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders repository and environments when loaded', () => {
    mockUseK8sWatchResource.mockReturnValue([strategy, true, undefined]);
    render(<PromotionDetailPage obj={obj} />);
    expect(screen.getByText('my-repo')).toBeInTheDocument();
    expect(screen.getByText('env/dev → env/prod')).toBeInTheDocument();
  });

  it('renders Ready condition', () => {
    mockUseK8sWatchResource.mockReturnValue([strategy, true, undefined]);
    render(<PromotionDetailPage obj={obj} />);
    expect(screen.getByText('True')).toBeInTheDocument();
    expect(screen.getByText('Reconciliation successful')).toBeInTheDocument();
  });

  it('renders PipelineVisualization component', () => {
    mockUseK8sWatchResource.mockReturnValue([strategy, true, undefined]);
    render(<PromotionDetailPage obj={obj} />);
    expect(screen.getByTestId('pipeline-viz')).toBeInTheDocument();
  });

  it('renders status label', () => {
    mockUseK8sWatchResource.mockReturnValue([strategy, true, undefined]);
    render(<PromotionDetailPage obj={obj} />);
    expect(screen.getByText('healthy')).toBeInTheDocument();
  });
});
