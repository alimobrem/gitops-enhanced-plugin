import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

const mockUseK8sWatchResource = jest.fn();
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: (...args: unknown[]) => mockUseK8sWatchResource(...args),
}));

import { PromotionActivitySection } from './PromotionActivitySection';

const healthyStrategy = {
  apiVersion: 'promoter.argoproj.io/v1alpha1',
  kind: 'PromotionStrategy',
  metadata: { name: 'app1', namespace: 'default', uid: 'uid-1' },
  spec: { gitRepositoryRef: { name: 'repo' }, environments: [{ branch: 'env/dev' }, { branch: 'env/prod' }] },
  status: {
    environments: [
      { branch: 'env/dev', proposed: {}, active: { dry: { sha: 'aaa' } } },
      { branch: 'env/prod', proposed: {}, active: { dry: { sha: 'aaa' } } },
    ],
  },
};

const blockedStrategy = {
  ...healthyStrategy,
  metadata: { name: 'app2', namespace: 'default', uid: 'uid-2' },
  status: {
    environments: [
      { branch: 'env/dev', proposed: {}, active: { dry: { sha: 'aaa' } } },
      { branch: 'env/prod', proposed: { commitStatuses: [{ key: 'test', phase: 'failure' }] }, active: { dry: { sha: 'bbb' } } },
    ],
  },
};

describe('PromotionActivitySection', () => {
  it('renders nothing when not loaded', () => {
    mockUseK8sWatchResource.mockReturnValue([[], false, undefined]);
    const { container } = render(<MemoryRouter><PromotionActivitySection /></MemoryRouter>);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when no strategies exist', () => {
    mockUseK8sWatchResource.mockReturnValue([[], true, undefined]);
    const { container } = render(<MemoryRouter><PromotionActivitySection /></MemoryRouter>);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing on error', () => {
    mockUseK8sWatchResource.mockReturnValue([[], true, new Error('fail')]);
    const { container } = render(<MemoryRouter><PromotionActivitySection /></MemoryRouter>);
    expect(container.innerHTML).toBe('');
  });

  it('renders pipeline count when strategies exist', () => {
    mockUseK8sWatchResource.mockReturnValue([[healthyStrategy], true, undefined]);
    render(<MemoryRouter><PromotionActivitySection /></MemoryRouter>);
    expect(screen.getByText('Promotion Activity')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Pipelines')).toBeInTheDocument();
  });

  it('renders blocked count', () => {
    mockUseK8sWatchResource.mockReturnValue([[healthyStrategy, blockedStrategy], true, undefined]);
    render(<MemoryRouter><PromotionActivitySection /></MemoryRouter>);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders active promotions table for non-healthy strategies', () => {
    mockUseK8sWatchResource.mockReturnValue([[blockedStrategy], true, undefined]);
    render(<MemoryRouter><PromotionActivitySection /></MemoryRouter>);
    expect(screen.getByText('app2')).toBeInTheDocument();
  });

  it('renders empty text when no active promotions', () => {
    mockUseK8sWatchResource.mockReturnValue([[healthyStrategy], true, undefined]);
    render(<MemoryRouter><PromotionActivitySection /></MemoryRouter>);
    expect(screen.getByText('No active promotions.')).toBeInTheDocument();
  });
});
