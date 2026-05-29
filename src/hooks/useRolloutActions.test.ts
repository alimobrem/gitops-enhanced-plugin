import { renderHook, act } from '@testing-library/react-hooks';
import type { RolloutResource } from '../types/rollout';

const mockK8sPatch = jest.fn().mockResolvedValue({});

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  k8sPatch: (...args: unknown[]) => mockK8sPatch(...args),
}));

jest.mock('../models', () => ({
  RolloutModel: { apiGroup: 'argoproj.io', apiVersion: 'v1alpha1', kind: 'Rollout' },
}));

import { useRolloutActions } from './useRolloutActions';

const mockRollout: RolloutResource = {
  metadata: { name: 'test-rollout', namespace: 'default', uid: '1' },
  spec: { replicas: 3, strategy: { canary: { maxSurge: '25%' } } },
  status: { phase: 'Healthy' },
};

describe('useRolloutActions', () => {
  beforeEach(() => mockK8sPatch.mockClear());

  it('promote patches rollout.argoproj.io/promote annotation', async () => {
    const { result } = renderHook(() => useRolloutActions(mockRollout));
    await act(async () => {
      await result.current.promote();
    });
    expect(mockK8sPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            path: '/metadata/annotations/rollout.argoproj.io~1promote',
            value: 'true',
          }),
        ],
      }),
    );
  });

  it('promoteFull patches rollout.argoproj.io/promote-full annotation', async () => {
    const { result } = renderHook(() => useRolloutActions(mockRollout));
    await act(async () => {
      await result.current.promoteFull();
    });
    expect(mockK8sPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            path: '/metadata/annotations/rollout.argoproj.io~1promote-full',
            value: 'true',
          }),
        ],
      }),
    );
  });

  it('abort patches rollout.argoproj.io/abort annotation', async () => {
    const { result } = renderHook(() => useRolloutActions(mockRollout));
    await act(async () => {
      await result.current.abort();
    });
    expect(mockK8sPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            path: '/metadata/annotations/rollout.argoproj.io~1abort',
            value: 'true',
          }),
        ],
      }),
    );
  });

  it('restart patches rollout.argoproj.io/restart with ISO timestamp', async () => {
    const before = new Date().toISOString();
    const { result } = renderHook(() => useRolloutActions(mockRollout));
    await act(async () => {
      await result.current.restart();
    });
    const after = new Date().toISOString();

    expect(mockK8sPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            path: '/metadata/annotations/rollout.argoproj.io~1restart',
          }),
        ],
      }),
    );

    const patchedValue = mockK8sPatch.mock.calls[0][0].data[0].value as string;
    expect(patchedValue >= before).toBe(true);
    expect(patchedValue <= after).toBe(true);
  });

  it('all actions are no-ops when rollout is null', async () => {
    const { result } = renderHook(() => useRolloutActions(null));
    await act(async () => {
      await result.current.promote();
      await result.current.promoteFull();
      await result.current.abort();
      await result.current.restart();
    });
    expect(mockK8sPatch).not.toHaveBeenCalled();
  });
});
