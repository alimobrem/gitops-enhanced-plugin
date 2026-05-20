import { useApplicationActions } from './useApplicationActions';
import type { ApplicationResource } from '../types';

const mockK8sPatch = jest.fn();
const mockK8sDelete = jest.fn();

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  k8sPatch: (...args: unknown[]) => mockK8sPatch(...args),
  k8sDelete: (...args: unknown[]) => mockK8sDelete(...args),
  useK8sWatchResource: () => [{ metadata: { name: 'testuser' } }, true, null],
}));

const mockApp: ApplicationResource = {
  apiVersion: 'argoproj.io/v1alpha1',
  kind: 'Application',
  metadata: { name: 'test-app', namespace: 'openshift-gitops', uid: '123' },
  spec: {
    source: { repoURL: 'https://github.com/example/repo', path: 'manifests', targetRevision: 'main' },
    destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
    project: 'default',
  },
  status: {
    sync: { status: 'Synced' },
    health: { status: 'Healthy' },
    operationState: { phase: 'Failed', syncResult: { revision: 'deadbeef' } },
  },
};

describe('useApplicationActions', () => {
  beforeEach(() => {
    mockK8sPatch.mockReset().mockResolvedValue({});
    mockK8sDelete.mockReset().mockResolvedValue({});
  });

  describe('sync', () => {
    it('patches with operation field and real username', async () => {
      const { sync } = useApplicationActions(mockApp);
      await sync();
      expect(mockK8sPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({
            op: 'add',
            path: '/operation',
            value: expect.objectContaining({
              initiatedBy: { username: 'testuser' },
              sync: { revision: 'main' },
            }),
          })],
        }),
      );
    });

    it('supports selective sync with resources array', async () => {
      const { sync } = useApplicationActions(mockApp);
      const resources = [{ group: 'apps', kind: 'Deployment', name: 'nginx', namespace: 'default' }];
      await sync(undefined, resources);
      expect(mockK8sPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({
            value: expect.objectContaining({
              sync: expect.objectContaining({ resources }),
            }),
          })],
        }),
      );
    });

    it('does nothing when app is null', async () => {
      const { sync } = useApplicationActions(null);
      await sync();
      expect(mockK8sPatch).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('patches with normal refresh', async () => {
      const { refresh } = useApplicationActions(mockApp);
      await refresh(false);
      expect(mockK8sPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ value: 'normal' })],
        }),
      );
    });

    it('patches with hard refresh', async () => {
      const { refresh } = useApplicationActions(mockApp);
      await refresh(true);
      expect(mockK8sPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ value: 'hard' })],
        }),
      );
    });
  });

  describe('terminate', () => {
    it('patches with terminate annotation', async () => {
      const { terminate } = useApplicationActions(mockApp);
      await terminate();
      expect(mockK8sPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({
            path: '/metadata/annotations/argocd.argoproj.io~1operation-terminate',
          })],
        }),
      );
    });
  });

  describe('deleteApp', () => {
    it('deletes the application', async () => {
      const { deleteApp } = useApplicationActions(mockApp);
      await deleteApp();
      expect(mockK8sDelete).toHaveBeenCalled();
    });

    it('removes finalizers before deleting when cascade=false', async () => {
      const { deleteApp } = useApplicationActions(mockApp);
      await deleteApp(false);
      expect(mockK8sPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ op: 'remove', path: '/metadata/finalizers' })],
        }),
      );
      expect(mockK8sDelete).toHaveBeenCalled();
    });
  });

  describe('retry', () => {
    it('syncs with the last failed revision', async () => {
      const { retry } = useApplicationActions(mockApp);
      await retry();
      expect(mockK8sPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({
            value: expect.objectContaining({
              sync: { revision: 'deadbeef' },
            }),
          })],
        }),
      );
    });
  });
});
