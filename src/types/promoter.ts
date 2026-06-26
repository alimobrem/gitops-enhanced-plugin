export type CommitStatusPhase = 'pending' | 'success' | 'failure';
export type PullRequestState = 'open' | 'merged' | 'closed';

export interface ObjectReference {
  name: string;
}

export interface CommitStatusSelector {
  key: string;
}

export interface Environment {
  branch: string;
  autoMerge?: boolean;
  activeCommitStatuses?: CommitStatusSelector[];
  proposedCommitStatuses?: CommitStatusSelector[];
  activePath?: string;
}

export interface PromotionStrategySpec {
  gitRepositoryRef: ObjectReference;
  activeCommitStatuses?: CommitStatusSelector[];
  proposedCommitStatuses?: CommitStatusSelector[];
  environments: Environment[];
  activePath?: string;
}

export interface CommitShaState {
  sha?: string;
}

export interface CommitStatusPhaseEntry {
  key: string;
  phase: CommitStatusPhase;
  url?: string;
  description?: string;
}

export interface HydratorMetadata {
  drySha?: string;
  repoURL?: string;
  author?: string;
  date?: string;
  subject?: string;
  body?: string;
}

export interface CommitBranchState {
  dry?: CommitShaState;
  hydrated?: CommitShaState;
  note?: HydratorMetadata;
  commitStatuses?: CommitStatusPhaseEntry[];
}

export interface PullRequestCommonStatus {
  id?: string;
  state?: PullRequestState;
  prCreationTime?: string;
  prMergeTime?: string;
  url?: string;
}

export interface HealthyDryShas {
  sha: string;
  time: string;
}

export interface PromotionHistory {
  dry?: CommitShaState;
  hydrated?: CommitShaState;
}

export interface EnvironmentStatus {
  branch: string;
  proposed: CommitBranchState;
  active: CommitBranchState;
  pullRequest?: PullRequestCommonStatus;
  lastHealthyDryShas?: HealthyDryShas[];
  history?: PromotionHistory[];
}

export interface PromotionStrategyStatus {
  observedGeneration?: number;
  environments?: EnvironmentStatus[];
  conditions?: Array<{ type: string; status: string; reason?: string; message?: string; lastTransitionTime?: string }>;
}

export interface PromotionStrategyResource {
  apiVersion: string;
  kind: 'PromotionStrategy';
  metadata: { name: string; namespace: string; uid: string; creationTimestamp?: string; labels?: Record<string, string>; annotations?: Record<string, string> };
  spec: PromotionStrategySpec;
  status?: PromotionStrategyStatus;
}

export interface ChangeTransferPolicySpec {
  gitRepositoryRef: ObjectReference;
  proposedBranch: string;
  activeBranch: string;
  activePath?: string;
  autoMerge?: boolean;
  activeCommitStatuses?: CommitStatusSelector[];
  proposedCommitStatuses?: CommitStatusSelector[];
}

export interface ChangeTransferPolicyStatus {
  observedGeneration?: number;
  proposed?: CommitBranchState;
  active?: CommitBranchState;
  pullRequest?: PullRequestCommonStatus;
  history?: PromotionHistory[];
  conditions?: Array<{ type: string; status: string; reason?: string; message?: string }>;
}

export interface ChangeTransferPolicyResource {
  apiVersion: string;
  kind: 'ChangeTransferPolicy';
  metadata: { name: string; namespace: string; uid: string; creationTimestamp?: string; ownerReferences?: Array<{ kind: string; name: string; uid: string }> };
  spec: ChangeTransferPolicySpec;
  status?: ChangeTransferPolicyStatus;
}

export interface CommitStatusSpec {
  gitRepositoryRef: ObjectReference;
  sha: string;
  name: string;
  description?: string;
  phase: CommitStatusPhase;
  url?: string;
}

export interface CommitStatusStatus {
  observedGeneration?: number;
  id?: string;
  sha?: string;
  phase?: CommitStatusPhase;
  conditions?: Array<{ type: string; status: string; reason?: string; message?: string }>;
}

export interface CommitStatusResource {
  apiVersion: string;
  kind: 'CommitStatus';
  metadata: { name: string; namespace: string; uid: string; labels?: Record<string, string> };
  spec: CommitStatusSpec;
  status?: CommitStatusStatus;
}

export interface PromoterPullRequestSpec {
  gitRepositoryRef: ObjectReference;
  title: string;
  targetBranch: string;
  sourceBranch: string;
  description?: string;
  mergeSha?: string;
  state: PullRequestState;
}

export interface PromoterPullRequestStatus {
  observedGeneration?: number;
  id?: string;
  state?: PullRequestState;
  prCreationTime?: string;
  url?: string;
  conditions?: Array<{ type: string; status: string; reason?: string; message?: string }>;
}

export interface PromoterPullRequestResource {
  apiVersion: string;
  kind: 'PullRequest';
  metadata: { name: string; namespace: string; uid: string };
  spec: PromoterPullRequestSpec;
  status?: PromoterPullRequestStatus;
}
