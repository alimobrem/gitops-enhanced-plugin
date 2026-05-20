export type SyncStatusCode = 'Synced' | 'OutOfSync' | 'Unknown';
export type HealthStatusCode =
  | 'Healthy'
  | 'Degraded'
  | 'Progressing'
  | 'Suspended'
  | 'Missing'
  | 'Unknown';
export type OperationPhase =
  | 'Running'
  | 'Error'
  | 'Failed'
  | 'Succeeded'
  | 'Terminating';

export interface ApplicationSource {
  repoURL: string;
  path?: string;
  targetRevision?: string;
  chart?: string;
  helm?: {
    parameters?: Array<{ name: string; value: string; forceString?: boolean }>;
    valueFiles?: string[];
    values?: string;
    releaseName?: string;
  };
  kustomize?: {
    namePrefix?: string;
    nameSuffix?: string;
    images?: string[];
    commonLabels?: Record<string, string>;
  };
}

export interface ApplicationDestination {
  server?: string;
  namespace?: string;
  name?: string;
}

export interface SyncPolicy {
  automated?: {
    prune?: boolean;
    selfHeal?: boolean;
    allowEmpty?: boolean;
  };
  syncOptions?: string[];
  retry?: {
    limit?: number;
    backoff?: {
      duration?: string;
      factor?: number;
      maxDuration?: string;
    };
  };
}

export interface SyncStatus {
  status: SyncStatusCode;
  revision?: string;
  comparedTo?: {
    source: ApplicationSource;
    destination: ApplicationDestination;
  };
}

export interface HealthStatus {
  status: HealthStatusCode;
  message?: string;
}

export interface OperationState {
  operation?: {
    sync?: {
      revision?: string;
      resources?: Array<{
        group: string;
        kind: string;
        name: string;
        namespace?: string;
      }>;
    };
  };
  phase?: OperationPhase;
  message?: string;
  startedAt?: string;
  finishedAt?: string;
  syncResult?: {
    revision?: string;
    resources?: Array<{
      group: string;
      version: string;
      kind: string;
      namespace: string;
      name: string;
      status: string;
      message: string;
    }>;
    source?: ApplicationSource;
  };
}

export interface RevisionHistory {
  id: number;
  revision: string;
  deployedAt: string;
  deployStartedAt?: string;
  source?: ApplicationSource;
}

export interface ApplicationSpec {
  source?: ApplicationSource;
  sources?: ApplicationSource[];
  destination: ApplicationDestination;
  project: string;
  syncPolicy?: SyncPolicy;
  ignoreDifferences?: Array<{
    group?: string;
    kind: string;
    name?: string;
    namespace?: string;
    jsonPointers?: string[];
    jqPathExpressions?: string[];
  }>;
}

export interface ApplicationStatus {
  sync: SyncStatus;
  health: HealthStatus;
  operationState?: OperationState;
  history?: RevisionHistory[];
  reconciledAt?: string;
  conditions?: Array<{
    type: string;
    message: string;
    lastTransitionTime?: string;
  }>;
  resources?: Array<{
    group?: string;
    version: string;
    kind: string;
    namespace?: string;
    name: string;
    status: SyncStatusCode;
    health?: HealthStatus;
  }>;
  summary?: {
    images?: string[];
    externalURLs?: string[];
  };
}

export interface ApplicationResource {
  apiVersion: string;
  kind: 'Application';
  metadata: {
    name: string;
    namespace: string;
    uid: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    creationTimestamp?: string;
    finalizers?: string[];
  };
  spec: ApplicationSpec;
  status?: ApplicationStatus;
}
