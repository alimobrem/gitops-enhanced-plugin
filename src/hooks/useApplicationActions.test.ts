import { useApplicationActions } from './useApplicationActions';
import type { ApplicationResource } from '../types';

const mockK8sPatch = jest.fn();

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  k8sPatch: (...args: unknown[]) => mockK8sPatch(...args),
}));

const mockApp: ApplicationResource = {
  apiVersion: 'argoproj.io/v1alpha1',
  kind: 'Application',
  metadata: { name: 'test-app', namespace: 'openshift-gitops', uid: '123' },
  spec: {
    source: {
      repoURL: 'https://github.com/example/repo',
      path: 'manifests',
      targetRevision: 'main',
    },
    destination: {
      server: 'https://kubernetes.default.svc',
      namespace: 'default',
    },
    project: 'default',
  },
  status: {
    sync: { status: 'Synced' },
    health: { status: 'Healthy' },
  },
};

describe('useApplicationActions', () => {
  beforeEach(() => {
    mockK8sPatch.mockReset();
    mockK8sPatch.mockResolvedValue({});
  });

  describe('sync', () => {
    it('patches the Application CR with an operation field', async () => {
      const { sync } = useApplicationActions(mockApp);
      await sync();

      expect(mockK8sPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: mockApp,
          data: [
            expect.objectContaining({
              op: 'add',
              path: '/operation',
              value: expect.objectContaining({
                sync: { revision: 'main' },
              }),
            }),
          ],
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
    it('patches with normal refresh annotation', async () => {
      const { refresh } = useApplicationActions(mockApp);
      await refresh(false);

      expect(mockK8sPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              path: '/metadata/annotations/argocd.argoproj.io~1refresh',
              value: 'normal',
            }),
          ],
        }),
      );
    });

    it('patches with hard refresh annotation', async () => {
      const { refresh } = useApplicationActions(mockApp);
      await refresh(true);

      expect(mockK8sPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              value: 'hard',
            }),
          ],
        }),
      );
    });

    it('does nothing when app is null', async () => {
      const { refresh } = useApplicationActions(null);
      await refresh();
      expect(mockK8sPatch).not.toHaveBeenCalled();
    });
  });

  describe('terminate', () => {
    it('patches with terminate annotation', async () => {
      const { terminate } = useApplicationActions(mockApp);
      await terminate();

      expect(mockK8sPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              path: '/metadata/annotations/argocd.argoproj.io~1operation-terminate',
              value: 'true',
            }),
          ],
        }),
      );
    });

    it('does nothing when app is null', async () => {
      const { terminate } = useApplicationActions(null);
      await terminate();
      expect(mockK8sPatch).not.toHaveBeenCalled();
    });
  });
});
