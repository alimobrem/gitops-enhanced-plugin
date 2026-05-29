import { renderHook, act } from '@testing-library/react-hooks';
import type { ApplicationTree } from '../types/argocd-api';

const mockFetchResourceTree = jest.fn();

jest.mock('../services/argocd-api', () => ({
  fetchResourceTree: (...args: unknown[]) => mockFetchResourceTree(...args),
}));

import { useResourceTree } from './useResourceTree';

const mockTree: ApplicationTree = {
  nodes: [
    {
      group: 'apps',
      version: 'v1',
      kind: 'Deployment',
      namespace: 'default',
      name: 'nginx',
      uid: 'uid-1',
    },
  ],
};

describe('useResourceTree', () => {
  beforeEach(() => mockFetchResourceTree.mockReset());

  it('starts with loaded=false and tree=null', () => {
    mockFetchResourceTree.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useResourceTree('my-app', 'openshift-gitops'));
    expect(result.current.loaded).toBe(false);
    expect(result.current.tree).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('populates tree after fetch completes', async () => {
    mockFetchResourceTree.mockResolvedValue(mockTree);
    const { result, waitForNextUpdate } = renderHook(() =>
      useResourceTree('my-app', 'openshift-gitops'),
    );
    await waitForNextUpdate();
    expect(result.current.loaded).toBe(true);
    expect(result.current.tree).toEqual(mockTree);
    expect(result.current.error).toBeNull();
  });

  it('sets error on fetch failure', async () => {
    mockFetchResourceTree.mockRejectedValue(new Error('fetch failed'));
    const { result, waitForNextUpdate } = renderHook(() =>
      useResourceTree('my-app', 'openshift-gitops'),
    );
    await waitForNextUpdate();
    expect(result.current.loaded).toBe(true);
    expect(result.current.error).toBe('fetch failed');
    expect(result.current.tree).toBeNull();
  });

  it('refetch triggers a new fetch', async () => {
    mockFetchResourceTree.mockResolvedValue(mockTree);
    const { result, waitForNextUpdate } = renderHook(() =>
      useResourceTree('my-app', 'openshift-gitops'),
    );
    await waitForNextUpdate();
    expect(mockFetchResourceTree).toHaveBeenCalledTimes(1);

    mockFetchResourceTree.mockResolvedValue({ nodes: [] });
    await act(async () => {
      result.current.refetch();
    });
    expect(mockFetchResourceTree).toHaveBeenCalledTimes(2);
  });
});
