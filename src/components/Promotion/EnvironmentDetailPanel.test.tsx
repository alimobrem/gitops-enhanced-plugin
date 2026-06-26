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
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
}));

import { EnvironmentDetailPanel } from './EnvironmentDetailPanel';
import type { DerivedPipelineStage } from '../../utils/promotion';

const healthyStage: DerivedPipelineStage = {
  branch: 'env/dev',
  label: 'dev',
  status: 'healthy',
  repoURL: 'https://github.com/alimobrem/argocd-example-apps',
  activeSha: 'abc1234567890',
  activeHydratedSha: 'def5678901234',
  activeCommitTime: '2026-06-26T10:00:00Z',
  proposedSha: 'abc1234567890',
  proposedChecks: [],
  activeChecks: [{ key: 'argocd-health', phase: 'success' }],
  history: [
    { activeSha: 'aaa111222333', author: 'Alice', subject: 'feat: add feature', commitTime: '2026-06-25T10:00:00Z' },
    { activeSha: 'bbb444555666', author: 'Bob', subject: 'fix: repair bug', commitTime: '2026-06-24T10:00:00Z' },
  ],
};

const promotingStage: DerivedPipelineStage = {
  branch: 'env/staging',
  label: 'staging',
  status: 'promoting',
  repoURL: 'https://github.com/alimobrem/argocd-example-apps',
  activeSha: 'old1234567890',
  proposedSha: 'new1234567890',
  proposedHydratedSha: 'hyd1234567890',
  proposedChecks: [{ key: 'integration-tests', phase: 'pending' }],
  activeChecks: [],
  pr: { state: 'open', url: 'https://github.com/org/repo/pull/1', id: '1', createdAt: '2026-06-26T14:00:00Z' },
  history: [],
};

beforeEach(() => {
  mockUseK8sWatchResource.mockReturnValue([[], true, undefined]);
});

describe('EnvironmentDetailPanel', () => {
  it('renders environment title', () => {
    render(<MemoryRouter><EnvironmentDetailPanel stage={healthyStage} /></MemoryRouter>);
    expect(screen.getByText('Environment: dev')).toBeInTheDocument();
  });

  it('renders branch name', () => {
    render(<MemoryRouter><EnvironmentDetailPanel stage={healthyStage} /></MemoryRouter>);
    expect(screen.getByText('env/dev')).toBeInTheDocument();
  });

  it('renders commit SHAs as links', () => {
    render(<MemoryRouter><EnvironmentDetailPanel stage={healthyStage} /></MemoryRouter>);
    const links = screen.getAllByRole('link');
    const commitLinks = links.filter((l) => l.getAttribute('href')?.includes('/commit/'));
    expect(commitLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders hydrated SHA when different from dry', () => {
    render(<MemoryRouter><EnvironmentDetailPanel stage={healthyStage} /></MemoryRouter>);
    expect(screen.getByText('Active commit (hydrated)')).toBeInTheDocument();
  });

  it('renders proposed commit section when proposed differs from active', () => {
    render(<MemoryRouter><EnvironmentDetailPanel stage={promotingStage} /></MemoryRouter>);
    expect(screen.getByText('Proposed commit (dry)')).toBeInTheDocument();
  });

  it('renders PR link for promoting stage', () => {
    render(<MemoryRouter><EnvironmentDetailPanel stage={promotingStage} /></MemoryRouter>);
    expect(screen.getByText('PR #1')).toBeInTheDocument();
  });

  it('renders promotion history table', () => {
    render(<MemoryRouter><EnvironmentDetailPanel stage={healthyStage} /></MemoryRouter>);
    expect(screen.getByText('Promotion History')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('feat: add feature')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('fix: repair bug')).toBeInTheDocument();
  });

  it('does not render history section when empty', () => {
    render(<MemoryRouter><EnvironmentDetailPanel stage={promotingStage} /></MemoryRouter>);
    expect(screen.queryByText('Promotion History')).not.toBeInTheDocument();
  });

  it('renders related applications when apps match', () => {
    mockUseK8sWatchResource.mockReturnValue([[
      { metadata: { name: 'myapp', namespace: 'default', uid: 'uid-1' }, spec: { source: { repoURL: 'https://github.com/alimobrem/argocd-example-apps.git' } } },
    ], true, undefined]);
    render(<MemoryRouter><EnvironmentDetailPanel stage={healthyStage} namespace="default" /></MemoryRouter>);
    expect(screen.getByText('Related Applications')).toBeInTheDocument();
    expect(screen.getByText('myapp')).toBeInTheDocument();
  });

  it('does not render related apps when none match', () => {
    mockUseK8sWatchResource.mockReturnValue([[
      { metadata: { name: 'other', namespace: 'default', uid: 'uid-2' }, spec: { source: { repoURL: 'https://github.com/other/repo.git' } } },
    ], true, undefined]);
    render(<MemoryRouter><EnvironmentDetailPanel stage={healthyStage} namespace="default" /></MemoryRouter>);
    expect(screen.queryByText('Related Applications')).not.toBeInTheDocument();
  });

  it('renders commit status table', () => {
    render(<MemoryRouter><EnvironmentDetailPanel stage={healthyStage} /></MemoryRouter>);
    expect(screen.getByText('Commit Statuses')).toBeInTheDocument();
    expect(screen.getByText('argocd-health')).toBeInTheDocument();
  });
});
