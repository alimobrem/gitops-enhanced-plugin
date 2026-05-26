import { renderHook } from '@testing-library/react-hooks';
import type { ApplicationResource } from '../types';

const mockSync = jest.fn();
const mockRefresh = jest.fn();
const mockTerminate = jest.fn();
const mockDeleteApp = jest.fn();
const mockRetry = jest.fn();

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [{ metadata: { name: 'testuser' } }, true, null],
  k8sPatch: jest.fn(),
  k8sDelete: jest.fn(),
}));

jest.mock('../hooks/useApplicationActions', () => ({
  useApplicationActions: () => ({
    sync: mockSync,
    refresh: mockRefresh,
    terminate: mockTerminate,
    deleteApp: mockDeleteApp,
    retry: mockRetry,
  }),
}));

import useApplicationActionsProvider from './ApplicationActions';

const mockApp: ApplicationResource = {
  apiVersion: 'argoproj.io/v1alpha1',
  kind: 'Application',
  metadata: { name: 'test-app', namespace: 'openshift-gitops', uid: '123' },
  spec: {
    source: { repoURL: 'https://github.com/org/repo', path: 'manifests', targetRevision: 'main' },
    destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
    project: 'default',
  },
  status: {
    sync: { status: 'Synced' },
    health: { status: 'Healthy' },
  },
};

const failedApp: ApplicationResource = {
  ...mockApp,
  status: {
    sync: { status: 'OutOfSync' },
    health: { status: 'Degraded' },
    operationState: { phase: 'Failed', syncResult: { revision: 'deadbeef' } },
  },
};

describe('useApplicationActionsProvider', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns actions array and loaded=true', () => {
    const { result } = renderHook(() => useApplicationActionsProvider(mockApp));
    const [actions, loaded, error] = result.current;
    expect(loaded).toBe(true);
    expect(error).toBeNull();
    expect(Array.isArray(actions)).toBe(true);
  });

  it('includes standard action IDs', () => {
    const { result } = renderHook(() => useApplicationActionsProvider(mockApp));
    const [actions] = result.current;
    const ids = actions.map((a) => a.id);
    expect(ids).toContain('argocd-sync');
    expect(ids).toContain('argocd-refresh');
    expect(ids).toContain('argocd-hard-refresh');
    expect(ids).toContain('argocd-terminate');
    expect(ids).toContain('argocd-delete');
  });

  it('does not include retry when operation has not failed', () => {
    const { result } = renderHook(() => useApplicationActionsProvider(mockApp));
    const [actions] = result.current;
    const ids = actions.map((a) => a.id);
    expect(ids).not.toContain('argocd-retry');
  });

  it('includes retry when operation phase is Failed', () => {
    const { result } = renderHook(() => useApplicationActionsProvider(failedApp));
    const [actions] = result.current;
    const ids = actions.map((a) => a.id);
    expect(ids).toContain('argocd-retry');
  });

  it('calls sync when sync action cta is invoked', () => {
    const { result } = renderHook(() => useApplicationActionsProvider(mockApp));
    const [actions] = result.current;
    const syncAction = actions.find((a) => a.id === 'argocd-sync');
    syncAction?.cta();
    expect(mockSync).toHaveBeenCalled();
  });
});
