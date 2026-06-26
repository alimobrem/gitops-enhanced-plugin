import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string, opts?: Record<string, unknown>) => {
  if (opts) return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts[k] ?? ''));
  return s;
} }) }));

const mockUseK8sWatchResource = jest.fn().mockReturnValue([[], true, undefined]);
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: (...args: unknown[]) => mockUseK8sWatchResource(...args),
}));

import { PromotionBanner } from './PromotionBanner';
import type { ApplicationResource, PromotionStrategyResource } from '../../types';

const app: ApplicationResource = {
  apiVersion: 'argoproj.io/v1alpha1',
  kind: 'Application',
  metadata: { name: 'myapp', namespace: 'default', uid: 'app-uid-1' },
  spec: {
    source: { repoURL: 'https://github.com/org/my-repo.git', path: 'k8s' },
    destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
    project: 'default',
  },
};

const matchingStrategy: PromotionStrategyResource = {
  apiVersion: 'promoter.argoproj.io/v1alpha1',
  kind: 'PromotionStrategy',
  metadata: { name: 'myapp-promo', namespace: 'default', uid: 'ps-uid-1' },
  spec: {
    gitRepositoryRef: { name: 'my-repo' },
    environments: [{ branch: 'env/dev' }, { branch: 'env/prod' }],
  },
  status: {
    environments: [
      { branch: 'env/dev', proposed: { dry: { sha: 'aaa', repoURL: 'https://github.com/org/my-repo' } }, active: { dry: { sha: 'aaa' } } },
      { branch: 'env/prod', proposed: { dry: { sha: 'aaa', repoURL: 'https://github.com/org/my-repo' } }, active: { dry: { sha: 'aaa' } } },
    ],
  },
};

const blockedStrategy: PromotionStrategyResource = {
  ...matchingStrategy,
  status: {
    environments: [
      { branch: 'env/dev', proposed: { dry: { sha: 'aaa', repoURL: 'https://github.com/org/my-repo' } }, active: { dry: { sha: 'aaa' } } },
      {
        branch: 'env/prod',
        proposed: { dry: { sha: 'bbb', repoURL: 'https://github.com/org/my-repo' }, commitStatuses: [{ key: 'security-scan', phase: 'failure' }] },
        active: { dry: { sha: 'bbb' } },
      },
    ],
  },
};

beforeEach(() => {
  mockUseK8sWatchResource.mockReturnValue([[], true, undefined]);
});

describe('PromotionBanner', () => {
  it('renders nothing when no strategies exist', () => {
    const { container } = render(
      <MemoryRouter>
        <PromotionBanner app={app} />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when no strategy matches the app repo', () => {
    const nonMatchingStrategy: PromotionStrategyResource = {
      ...matchingStrategy,
      spec: { ...matchingStrategy.spec, gitRepositoryRef: { name: 'other-repo' } },
      status: {
        environments: [
          { branch: 'env/dev', proposed: { dry: { sha: 'aaa', repoURL: 'https://github.com/other-org/other-repo' } }, active: { dry: { sha: 'aaa' } } },
          { branch: 'env/prod', proposed: { dry: { sha: 'aaa', repoURL: 'https://github.com/other-org/other-repo' } }, active: { dry: { sha: 'aaa' } } },
        ],
      },
    };
    mockUseK8sWatchResource.mockReturnValue([[nonMatchingStrategy], true, undefined]);
    const { container } = render(
      <MemoryRouter>
        <PromotionBanner app={app} />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders healthy banner when all environments are healthy', () => {
    mockUseK8sWatchResource.mockReturnValue([[matchingStrategy], true, undefined]);
    render(
      <MemoryRouter>
        <PromotionBanner app={app} />
      </MemoryRouter>,
    );
    expect(screen.getByText('All environments healthy')).toBeInTheDocument();
  });

  it('renders blocked banner when a check fails', () => {
    mockUseK8sWatchResource.mockReturnValue([[blockedStrategy], true, undefined]);
    render(
      <MemoryRouter>
        <PromotionBanner app={app} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Promotion blocked: security-scan failed (dev → prod)')).toBeInTheDocument();
  });

  it('renders View Pipeline link', () => {
    mockUseK8sWatchResource.mockReturnValue([[matchingStrategy], true, undefined]);
    render(
      <MemoryRouter>
        <PromotionBanner app={app} />
      </MemoryRouter>,
    );
    expect(screen.getByText('View Pipeline')).toBeInTheDocument();
  });
});
