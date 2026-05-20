import type { HealthStatus } from './application';

export interface ResourceRef {
  group: string;
  version: string;
  kind: string;
  namespace: string;
  name: string;
  uid: string;
}

export interface ResourceNode extends ResourceRef {
  parentRefs?: ResourceRef[];
  health?: HealthStatus;
  info?: Array<{ name: string; value: string }>;
  networkingInfo?: {
    targetRefs?: ResourceRef[];
    labels?: Record<string, string>;
    ingress?: Array<{ ip?: string; hostname?: string }>;
    externalURLs?: string[];
  };
  images?: string[];
  resourceVersion?: string;
  createdAt?: string;
}

export interface ApplicationTree {
  nodes: ResourceNode[];
  orphanedNodes?: ResourceNode[];
  hosts?: Array<{
    name: string;
    resourcesInfo: Array<{
      resourceName: string;
      requestedByApp: number;
      requestedByNeighbors: number;
      capacity: number;
    }>;
    systemInfo?: {
      architecture: string;
      operatingSystem: string;
      kernelVersion: string;
    };
  }>;
}

export interface ManagedResource {
  group: string;
  kind: string;
  namespace: string;
  name: string;
  targetState?: string;
  liveState?: string;
  normalizedLiveState?: string;
  predictedLiveState?: string;
  diff?: {
    status: string;
    normalizedLiveState?: string;
    predictedLiveState?: string;
  };
}

export interface ArgoRepository {
  repo: string;
  type?: string;
  name?: string;
  project?: string;
  connectionState?: {
    status: string;
    message?: string;
    attemptedAt?: string;
  };
}

export interface ArgoCluster {
  server: string;
  name: string;
  config?: Record<string, unknown>;
  connectionState?: {
    status: string;
    message?: string;
    attemptedAt?: string;
  };
  serverVersion?: string;
  info?: {
    connectionState?: { status: string };
    applicationsCount?: number;
  };
}
