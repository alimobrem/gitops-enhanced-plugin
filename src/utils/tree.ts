import type { ResourceNode } from '../types/argocd-api';

export function nodeKey(node: {
  group: string;
  version: string;
  kind: string;
  namespace: string;
  name: string;
}): string {
  return `${node.group}/${node.kind}/${node.namespace}/${node.name}`;
}

export function buildHierarchy(
  nodes: ResourceNode[],
  appName: string,
): {
  nodeMap: Map<string, ResourceNode>;
  edges: Array<{ source: string; target: string }>;
} {
  const nodeMap = new Map<string, ResourceNode>();
  const edges: Array<{ source: string; target: string }> = [];

  for (const node of nodes) {
    nodeMap.set(nodeKey(node), node);
  }

  for (const node of nodes) {
    const key = nodeKey(node);
    if (node.parentRefs && node.parentRefs.length > 0) {
      for (const parent of node.parentRefs) {
        edges.push({ source: nodeKey(parent), target: key });
      }
    } else {
      edges.push({ source: 'app', target: key });
    }
  }

  return { nodeMap, edges };
}

export function findDegradedPaths(nodes: ResourceNode[]): Set<string> {
  const byKey = new Map<string, ResourceNode>();
  for (const node of nodes) {
    byKey.set(nodeKey(node), node);
  }

  const degraded = new Set<string>();

  function traceUp(node: ResourceNode): void {
    const key = nodeKey(node);
    if (degraded.has(key)) return;
    degraded.add(key);
    if (!node.parentRefs) return;
    for (const ref of node.parentRefs) {
      const parent = byKey.get(nodeKey(ref));
      if (parent) traceUp(parent);
    }
  }

  for (const node of nodes) {
    if (node.health?.status && node.health.status !== 'Healthy') {
      traceUp(node);
    }
  }

  return degraded;
}
