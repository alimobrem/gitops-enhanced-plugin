import React from 'react';
import { render, screen } from '@testing-library/react';
import { DiffTab } from './DiffTab';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string, opts?: Record<string, unknown>) => {
    if (opts?.count !== undefined) return s.replace('{{count}}', String(opts.count));
    return s;
  }}),
}));

jest.mock('js-yaml', () => ({
  dump: (obj: unknown) => JSON.stringify(obj),
}));

const mockUseManagedResources = jest.fn();
jest.mock('../../hooks/useManagedResources', () => ({
  useManagedResources: (...args: unknown[]) => mockUseManagedResources(...args),
}));

const baseApp = {
  apiVersion: 'argoproj.io/v1alpha1' as const,
  kind: 'Application' as const,
  metadata: { name: 'test-app', namespace: 'argocd', uid: '1' },
  spec: { destination: { server: 'https://kubernetes.default.svc', namespace: 'default' }, project: 'default' },
};

describe('DiffTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows spinner when loading', () => {
    mockUseManagedResources.mockReturnValue({ resources: [], loaded: false, error: null });
    render(<DiffTab obj={baseApp} />);
    expect(document.querySelector('.pf-v6-c-spinner')).toBeTruthy();
  });

  it('shows empty state when no diffs', () => {
    const sameState = JSON.stringify({ kind: 'ConfigMap', data: { key: 'val' } });
    mockUseManagedResources.mockReturnValue({
      resources: [{ group: '', kind: 'ConfigMap', namespace: 'default', name: 'cm1', targetState: sameState, liveState: sameState }],
      loaded: true,
      error: null,
    });
    render(<DiffTab obj={baseApp} />);
    expect(screen.getByText('All resources are in sync')).toBeInTheDocument();
  });

  it('renders expandable sections for changed resources', () => {
    const target = JSON.stringify({ kind: 'ConfigMap', data: { key: 'old' } });
    const live = JSON.stringify({ kind: 'ConfigMap', data: { key: 'new' } });
    mockUseManagedResources.mockReturnValue({
      resources: [
        { group: '', kind: 'ConfigMap', namespace: 'default', name: 'cm-drift', targetState: target, liveState: live },
      ],
      loaded: true,
      error: null,
    });
    render(<DiffTab obj={baseApp} />);
    expect(screen.getByText('1 resources with differences')).toBeInTheDocument();
    expect(screen.getByText('ConfigMap')).toBeInTheDocument();
    expect(screen.getByText('cm-drift')).toBeInTheDocument();
  });

  it('shows error alert on fetch failure', () => {
    mockUseManagedResources.mockReturnValue({ resources: [], loaded: true, error: 'fetch failed' });
    render(<DiffTab obj={baseApp} />);
    expect(screen.getByText('fetch failed')).toBeInTheDocument();
  });

  it('shows spinner when no app metadata', () => {
    render(<DiffTab obj={{}} />);
    expect(document.querySelector('.pf-v6-c-spinner')).toBeTruthy();
  });
});
