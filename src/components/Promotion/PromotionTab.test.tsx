import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

const mockUseMatchingStrategy = jest.fn();
jest.mock('../../hooks/useMatchingStrategy', () => ({
  useMatchingStrategy: (...args: unknown[]) => mockUseMatchingStrategy(...args),
}));

jest.mock('./PipelineVisualization', () => ({
  PipelineVisualization: () => <div data-testid="pipeline-viz">PipelineVisualization</div>,
}));

import { PromotionTab } from './PromotionTab';

const app = {
  apiVersion: 'argoproj.io/v1alpha1',
  kind: 'Application',
  metadata: { name: 'myapp', namespace: 'default', uid: 'uid-1' },
  spec: { source: { repoURL: 'https://github.com/org/repo.git' }, destination: { server: 'https://kubernetes.default.svc', namespace: 'default' }, project: 'default' },
};

const strategy = {
  apiVersion: 'promoter.argoproj.io/v1alpha1',
  kind: 'PromotionStrategy',
  metadata: { name: 'test', namespace: 'default', uid: 'ps-1' },
  spec: { gitRepositoryRef: { name: 'repo' }, environments: [{ branch: 'env/dev' }] },
  status: { environments: [{ branch: 'env/dev', proposed: {}, active: {} }] },
};

describe('PromotionTab', () => {
  it('renders spinner when app metadata missing', () => {
    mockUseMatchingStrategy.mockReturnValue([null, false, null]);
    const { container } = render(<PromotionTab obj={{}} />);
    expect(container.querySelector('.pf-v6-c-spinner')).toBeTruthy();
  });

  it('renders loading spinner when strategies not loaded', () => {
    mockUseMatchingStrategy.mockReturnValue([null, false, null]);
    const { container } = render(<PromotionTab obj={app} />);
    expect(container.querySelector('.pf-v6-c-spinner')).toBeTruthy();
  });

  it('renders empty state when no matching strategy', () => {
    mockUseMatchingStrategy.mockReturnValue([null, true, null]);
    render(<PromotionTab obj={app} />);
    expect(screen.getByText('No promotion pipeline')).toBeInTheDocument();
  });

  it('renders PipelineVisualization when strategy matches', () => {
    mockUseMatchingStrategy.mockReturnValue([strategy, true, null]);
    render(<PromotionTab obj={app} />);
    expect(screen.getByTestId('pipeline-viz')).toBeInTheDocument();
  });
});
