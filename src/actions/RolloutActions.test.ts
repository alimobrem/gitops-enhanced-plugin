import { renderHook, act } from '@testing-library/react-hooks';
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
    const { result } = renderHook(() => useRolloutActionsProvider(mockRollout));
    const [actions, loaded, error] = result.current;
    expect(loaded).toBe(true);
    expect(error).toBeNull();
    expect(Array.isArray(actions)).toBe(true);
  });

  it('does not include promote when phase is not Paused', () => {
    const { result } = renderHook(() => useRolloutActionsProvider(mockRollout));
    const [actions] = result.current;
    const ids = actions.map((a) => a.id);
    expect(ids).not.toContain('rollout-promote');
    expect(ids).toContain('rollout-restart');
    expect(ids).toContain('rollout-abort');
  });

  it('includes promote when phase is Paused', () => {
    const { result } = renderHook(() => useRolloutActionsProvider(pausedRollout));
    const [actions] = result.current;
    const ids = actions.map((a) => a.id);
    expect(ids).toContain('rollout-promote');
  });

  it('calls k8sPatch with restart annotation', async () => {
    const { result } = renderHook(() => useRolloutActionsProvider(mockRollout));
    const [actions] = result.current;
    const restartAction = actions.find((a) => a.id === 'rollout-restart');
    await act(async () => { restartAction?.cta(); });
    expect(mockK8sPatch).toHaveBeenCalled();
  });
});
