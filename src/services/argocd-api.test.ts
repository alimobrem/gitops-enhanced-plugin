import {
  fetchResourceTree,
  fetchManagedResources,
  getProxyBase,
} from './argocd-api';

const mockConsoleFetch = jest.fn();

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  consoleFetch: (...args: unknown[]) => mockConsoleFetch(...args),
}));

describe('argocd-api', () => {
  beforeEach(() => {
    mockConsoleFetch.mockReset();
  });

  it('getProxyBase returns default alias', () => {
    expect(getProxyBase()).toBe('/api/proxy/plugin/gitops-enhanced/argocd');
  });

  it('getProxyBase returns custom alias', () => {
    expect(getProxyBase('team-b-argocd')).toBe('/api/proxy/plugin/gitops-enhanced/team-b-argocd');
  });

  it('fetchResourceTree calls correct proxy URL', async () => {
    const tree = { nodes: [], orphanedNodes: [] };
    mockConsoleFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(tree),
    });

    const result = await fetchResourceTree('openshift-gitops', 'my-app');

    expect(mockConsoleFetch).toHaveBeenCalledWith(
      `${getProxyBase()}/api/v1/applications/my-app/resource-tree`,
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result).toEqual(tree);
  });

  it('fetchResourceTree uses custom alias', async () => {
    mockConsoleFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ nodes: [] }),
    });

    await fetchResourceTree('ns', 'app', 'custom-alias');

    expect(mockConsoleFetch).toHaveBeenCalledWith(
      `${getProxyBase('custom-alias')}/api/v1/applications/app/resource-tree`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('fetchManagedResources calls correct proxy URL', async () => {
    const resources = { items: [] };
    mockConsoleFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(resources),
    });

    const result = await fetchManagedResources('openshift-gitops', 'my-app');

    expect(mockConsoleFetch).toHaveBeenCalledWith(
      `${getProxyBase()}/api/v1/applications/my-app/managed-resources`,
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result).toEqual(resources);
  });

  it('throws on non-ok response', async () => {
    mockConsoleFetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: () => Promise.resolve({ message: 'access denied' }),
    });

    await expect(
      fetchResourceTree('openshift-gitops', 'my-app'),
    ).rejects.toThrow('403');
  });
});
