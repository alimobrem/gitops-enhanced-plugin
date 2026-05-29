import { renderHook, act } from '@testing-library/react-hooks';
import type { ManagedResource } from '../types/argocd-api';

const mockFetchManagedResources = jest.fn();

jest.mock('../services/argocd-api', () => ({
  fetchManagedResources: (...args: unknown[]) => mockFetchManagedResources(...args),
}));

import { useManagedResources } from './useManagedResources';

const mockResources: ManagedResource[] = [
  {
    group: 'apps',
    kind: 'Deployment',
    namespace: 'default',
    name: 'nginx',
  },
];

describe('useManagedResources', () => {
  beforeEach(() => mockFetchManagedResources.mockReset());

  it('starts with loaded=false', () => {
    mockFetchManagedResources.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useManagedResources('my-app', 'openshift-gitops'));
    expect(result.current.loaded).toBe(false);
    expect(result.current.resources).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('populates resources after fetch completes', async () => {
    mockFetchManagedResources.mockResolvedValue({ items: mockResources });
    const { result, waitForNextUpdate } = renderHook(() =>
      useManagedResources('my-app', 'openshift-gitops'),
    );
    await waitForNextUpdate();
    expect(result.current.loaded).toBe(true);
    expect(result.current.resources).toEqual(mockResources);
    expect(result.current.error).toBeNull();
  });

  it('sets error on fetch failure', async () => {
    mockFetchManagedResources.mockRejectedValue(new Error('network error'));
    const { result, waitForNextUpdate } = renderHook(() =>
      useManagedResources('my-app', 'openshift-gitops'),
    );
    await waitForNextUpdate();
    expect(result.current.loaded).toBe(true);
    expect(result.current.error).toBe('network error');
    expect(result.current.resources).toEqual([]);
  });

  it('refetch triggers a new fetch', async () => {
    mockFetchManagedResources.mockResolvedValue({ items: mockResources });
    const { result, waitForNextUpdate } = renderHook(() =>
      useManagedResources('my-app', 'openshift-gitops'),
    );
    await waitForNextUpdate();
    expect(mockFetchManagedResources).toHaveBeenCalledTimes(1);

    mockFetchManagedResources.mockResolvedValue({ items: [] });
    await act(async () => {
      result.current.refetch();
    });
    expect(mockFetchManagedResources).toHaveBeenCalledTimes(2);
  });
});
