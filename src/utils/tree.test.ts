import type { ResourceNode } from '../types/argocd-api';
import { nodeKey, buildHierarchy, findDegradedPaths } from './tree';

function makeNode(
  overrides: Partial<ResourceNode> & Pick<ResourceNode, 'kind' | 'name'>,
): ResourceNode {
  return {
    group: 'apps',
    version: 'v1',
    namespace: 'default',
    uid: overrides.name,
    ...overrides,
  };
}

describe('nodeKey', () => {
  it('produces group/kind/namespace/name', () => {
    expect(
      nodeKey({
        group: 'apps',
        version: 'v1',
        kind: 'Deployment',
        namespace: 'ns',
        name: 'web',
      }),
    ).toBe('apps/Deployment/ns/web');
  });
});

describe('buildHierarchy', () => {
  it('connects parentless nodes to root app', () => {
    const nodes: ResourceNode[] = [
      makeNode({ kind: 'Deployment', name: 'web' }),
      makeNode({ kind: 'Service', name: 'web-svc' }),
    ];

    const { edges, nodeMap } = buildHierarchy(nodes, 'my-app');

    expect(nodeMap.size).toBe(2);
    expect(edges).toHaveLength(2);
    edges.forEach((e) => expect(e.source).toBe('app'));
  });

  it('creates edges from parentRefs', () => {
    const deploy = makeNode({ kind: 'Deployment', name: 'web' });
    const rs = makeNode({
      kind: 'ReplicaSet',
      name: 'web-abc',
      parentRefs: [
        {
          group: 'apps',
          version: 'v1',
          kind: 'Deployment',
          namespace: 'default',
          name: 'web',
          uid: 'web',
        },
      ],
    });
    const pod = makeNode({
      kind: 'Pod',
      name: 'web-abc-xyz',
      parentRefs: [
        {
          group: 'apps',
          version: 'v1',
          kind: 'ReplicaSet',
          namespace: 'default',
          name: 'web-abc',
          uid: 'web-abc',
        },
      ],
    });

    const { edges } = buildHierarchy([deploy, rs, pod], 'my-app');

    expect(edges).toContainEqual({
      source: 'app',
      target: 'apps/Deployment/default/web',
    });
    expect(edges).toContainEqual({
      source: 'apps/Deployment/default/web',
      target: 'apps/ReplicaSet/default/web-abc',
    });
    expect(edges).toContainEqual({
      source: 'apps/ReplicaSet/default/web-abc',
      target: 'apps/Pod/default/web-abc-xyz',
    });
  });

  it('handles nodes with multiple parentRefs', () => {
    const node = makeNode({
      kind: 'EndpointSlice',
      name: 'eps',
      parentRefs: [
        { group: '', version: 'v1', kind: 'Service', namespace: 'default', name: 'svc', uid: 'svc' },
        { group: 'apps', version: 'v1', kind: 'Deployment', namespace: 'default', name: 'web', uid: 'web' },
      ],
    });

    const { edges } = buildHierarchy([node], 'my-app');
    expect(edges).toHaveLength(2);
    expect(edges[0].source).toBe('/Service/default/svc');
    expect(edges[1].source).toBe('apps/Deployment/default/web');
  });
});

describe('findDegradedPaths', () => {
  it('returns empty set when all healthy', () => {
    const nodes: ResourceNode[] = [
      makeNode({ kind: 'Deployment', name: 'web', health: { status: 'Healthy' } }),
      makeNode({ kind: 'Pod', name: 'pod1', health: { status: 'Healthy' } }),
    ];

    expect(findDegradedPaths(nodes).size).toBe(0);
  });

  it('includes degraded node and traces up to ancestors', () => {
    const deploy = makeNode({
      kind: 'Deployment',
      name: 'web',
      health: { status: 'Healthy' },
    });
    const rs = makeNode({
      kind: 'ReplicaSet',
      name: 'web-abc',
      health: { status: 'Healthy' },
      parentRefs: [
        { group: 'apps', version: 'v1', kind: 'Deployment', namespace: 'default', name: 'web', uid: 'web' },
      ],
    });
    const pod = makeNode({
      kind: 'Pod',
      name: 'web-abc-crash',
      health: { status: 'Degraded' },
      parentRefs: [
        { group: 'apps', version: 'v1', kind: 'ReplicaSet', namespace: 'default', name: 'web-abc', uid: 'web-abc' },
      ],
    });

    const result = findDegradedPaths([deploy, rs, pod]);

    expect(result.has(nodeKey(pod))).toBe(true);
    expect(result.has(nodeKey(rs))).toBe(true);
    expect(result.has(nodeKey(deploy))).toBe(true);
  });

  it('does not include healthy siblings', () => {
    const deploy = makeNode({
      kind: 'Deployment',
      name: 'web',
      health: { status: 'Healthy' },
    });
    const healthyPod = makeNode({
      kind: 'Pod',
      name: 'pod-ok',
      health: { status: 'Healthy' },
      parentRefs: [
        { group: 'apps', version: 'v1', kind: 'Deployment', namespace: 'default', name: 'web', uid: 'web' },
      ],
    });
    const degradedPod = makeNode({
      kind: 'Pod',
      name: 'pod-bad',
      health: { status: 'Degraded' },
      parentRefs: [
        { group: 'apps', version: 'v1', kind: 'Deployment', namespace: 'default', name: 'web', uid: 'web' },
      ],
    });

    const result = findDegradedPaths([deploy, healthyPod, degradedPod]);

    expect(result.has(nodeKey(degradedPod))).toBe(true);
    expect(result.has(nodeKey(deploy))).toBe(true);
    expect(result.has(nodeKey(healthyPod))).toBe(false);
  });

  it('handles nodes without health field', () => {
    const nodes: ResourceNode[] = [
      makeNode({ kind: 'ConfigMap', name: 'cfg' }),
    ];
    expect(findDegradedPaths(nodes).size).toBe(0);
  });
});
