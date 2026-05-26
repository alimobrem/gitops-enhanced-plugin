import type { RolloutResource } from '../types';

const mockK8sPatch = jest.fn().mockResolvedValue({});

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  k8sPatch: (...args: unknown[]) => mockK8sPatch(...args),
}));

import useRolloutActionsProvider from './RolloutActions';

const mockRollout: RolloutResource = {
  metadata: { name: 'test-rollout', namespace: 'default', uid: '1' },
  spec: {
    replicas: 3,
    strategy: { canary: { maxSurge: '25%' } },
  },
  status: { phase: 'Healthy' },
};

const pausedRollout: RolloutResource = {
  ...mockRollout,
  status: { phase: 'Paused' },
};

describe('useRolloutActionsProvider', () => {
  beforeEach(() => mockK8sPatch.mockClear());

  it('returns actions array and loaded=true', () => {
    const [actions, loaded, error] = useRolloutActionsProvider(mockRollout);
    expect(loaded).toBe(true);
    expect(error).toBeNull();
    expect(Array.isArray(actions)).toBe(true);
  });

  it('does not include promote when phase is not Paused', () => {
    const [actions] = useRolloutActionsProvider(mockRollout);
    const ids = actions.map((a) => a.id);
    expect(ids).not.toContain('rollout-promote');
    expect(ids).toContain('rollout-restart');
    expect(ids).toContain('rollout-abort');
  });

  it('includes promote when phase is Paused', () => {
    const [actions] = useRolloutActionsProvider(pausedRollout);
    const ids = actions.map((a) => a.id);
    expect(ids).toContain('rollout-promote');
  });

  it('calls k8sPatch with promote annotation', async () => {
    const [actions] = useRolloutActionsProvider(pausedRollout);
    const promoteAction = actions.find((a) => a.id === 'rollout-promote');
    await promoteAction?.cta();
    expect(mockK8sPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({
          op: 'add',
          path: '/metadata/annotations/rollout.argoproj.io~1promote',
          value: 'true',
        })],
      }),
    );
  });

  it('calls k8sPatch with restart annotation', async () => {
    const [actions] = useRolloutActionsProvider(mockRollout);
    const restartAction = actions.find((a) => a.id === 'rollout-restart');
    await restartAction?.cta();
    expect(mockK8sPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({
          op: 'add',
          path: '/metadata/annotations/rollout.argoproj.io~1restart',
        })],
      }),
    );
  });

  it('calls k8sPatch with abort annotation', async () => {
    const [actions] = useRolloutActionsProvider(mockRollout);
    const abortAction = actions.find((a) => a.id === 'rollout-abort');
    await abortAction?.cta();
    expect(mockK8sPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({
          op: 'add',
          path: '/metadata/annotations/rollout.argoproj.io~1abort',
          value: 'true',
        })],
      }),
    );
  });
});
