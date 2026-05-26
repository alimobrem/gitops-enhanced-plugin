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
    const [actions, loaded, error] = useApplicationActionsProvider(mockApp);
    expect(loaded).toBe(true);
    expect(error).toBeNull();
    expect(Array.isArray(actions)).toBe(true);
  });

  it('includes standard action IDs', () => {
    const [actions] = useApplicationActionsProvider(mockApp);
    const ids = actions.map((a) => a.id);
    expect(ids).toContain('argocd-sync');
    expect(ids).toContain('argocd-refresh');
    expect(ids).toContain('argocd-hard-refresh');
    expect(ids).toContain('argocd-terminate');
    expect(ids).toContain('argocd-delete');
  });

  it('does not include retry when operation has not failed', () => {
    const [actions] = useApplicationActionsProvider(mockApp);
    const ids = actions.map((a) => a.id);
    expect(ids).not.toContain('argocd-retry');
  });

  it('includes retry when operation phase is Failed', () => {
    const [actions] = useApplicationActionsProvider(failedApp);
    const ids = actions.map((a) => a.id);
    expect(ids).toContain('argocd-retry');
  });

  it('includes retry when operation phase is Error', () => {
    const errorApp: ApplicationResource = {
      ...mockApp,
      status: {
        sync: { status: 'OutOfSync' },
        health: { status: 'Degraded' },
        operationState: { phase: 'Error' },
      },
    };
    const [actions] = useApplicationActionsProvider(errorApp);
    const ids = actions.map((a) => a.id);
    expect(ids).toContain('argocd-retry');
  });

  it('calls sync when sync action cta is invoked', () => {
    const [actions] = useApplicationActionsProvider(mockApp);
    const syncAction = actions.find((a) => a.id === 'argocd-sync');
    syncAction?.cta();
    expect(mockSync).toHaveBeenCalled();
  });
});
