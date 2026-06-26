import type {
  PromotionStrategyResource,
  EnvironmentStatus,
  CommitStatusPhaseEntry,
  HydratorMetadata,
} from '../types';

export type PipelineStageStatus = 'healthy' | 'promoting' | 'blocked' | 'pending';
export type GateStatus = 'passed' | 'blocked' | 'running' | 'waiting';

export interface PromotionHistoryEntry {
  activeSha?: string;
  activeHydratedSha?: string;
  author?: string;
  subject?: string;
  commitTime?: string;
}

export interface DerivedPipelineStage {
  branch: string;
  label: string;
  status: PipelineStageStatus;
  repoURL?: string;
  activeSha: string;
  activeHydratedSha?: string;
  activeCommitTime?: string;
  proposedSha?: string;
  proposedHydratedSha?: string;
  activeNote?: HydratorMetadata;
  proposedNote?: HydratorMetadata;
  pr?: { state: string; url?: string; id?: string; createdAt?: string };
  proposedChecks: CommitStatusPhaseEntry[];
  activeChecks: CommitStatusPhaseEntry[];
  history: PromotionHistoryEntry[];
  stuckMinutes: number;
}

export function computeStuckMinutes(prCreatedAt?: string, checks?: CommitStatusPhaseEntry[]): number {
  if (!prCreatedAt || !checks || checks.length === 0) return 0;
  const allPending = checks.every((c) => c.phase === 'pending');
  if (!allPending) return 0;
  return Math.floor((Date.now() - new Date(prCreatedAt).getTime()) / 60000);
}

export function buildCommitLink(repoURL: string | undefined, sha: string): string | undefined {
  if (!repoURL || !sha) return undefined;
  const cleaned = repoURL
    .replace(/^https?:\/\/git@/, 'https://')
    .replace(/\.git$/, '');
  if (!/^https?:\/\//i.test(cleaned)) return undefined;
  return `${cleaned}/commit/${sha}`;
}

export interface DerivedGateStatus {
  sourceEnv: string;
  targetEnv: string;
  status: GateStatus;
  failedChecks: string[];
  pendingChecks: string[];
  passedChecks: string[];
  pr?: { state: string; url?: string; id?: string };
}

export function deriveEnvLabel(branch: string): string {
  const parts = branch.split('/');
  return parts[parts.length - 1];
}

function deriveStageStatus(envStatus?: EnvironmentStatus): PipelineStageStatus {
  if (!envStatus) return 'pending';

  const proposed = envStatus.proposed?.commitStatuses ?? [];
  const active = envStatus.active?.commitStatuses ?? [];
  const allChecks = [...proposed, ...active];

  if (allChecks.some((c) => c.phase === 'failure')) return 'blocked';
  if (envStatus.pullRequest?.state === 'open') return 'promoting';
  if (allChecks.some((c) => c.phase === 'pending')) return 'pending';
  return 'healthy';
}

function deriveGateStatus(proposed: CommitStatusPhaseEntry[]): GateStatus {
  if (proposed.length === 0) return 'waiting';
  if (proposed.some((c) => c.phase === 'failure')) return 'blocked';
  if (proposed.some((c) => c.phase === 'pending')) return 'running';
  return 'passed';
}

export function derivePipelineStatus(strategy: PromotionStrategyResource): {
  stages: DerivedPipelineStage[];
  gates: DerivedGateStatus[];
  overallStatus: PipelineStageStatus;
} {
  const envSpecs = strategy.spec.environments;
  const envStatuses = strategy.status?.environments ?? [];

  const stages: DerivedPipelineStage[] = envSpecs.map((env) => {
    const envStatus = envStatuses.find((s) => s.branch === env.branch);
    const proposedChecks = envStatus?.proposed?.commitStatuses ?? [];
    const activeChecks = envStatus?.active?.commitStatuses ?? [];

    return {
      branch: env.branch,
      label: deriveEnvLabel(env.branch),
      status: deriveStageStatus(envStatus),
      repoURL: envStatus?.proposed?.dry?.repoURL ?? envStatus?.active?.dry?.repoURL,
      activeSha: envStatus?.active?.dry?.sha ?? '',
      activeHydratedSha: envStatus?.active?.hydrated?.sha,
      activeCommitTime: envStatus?.active?.hydrated?.commitTime ?? envStatus?.active?.dry?.commitTime,
      proposedSha: envStatus?.proposed?.dry?.sha,
      proposedHydratedSha: envStatus?.proposed?.hydrated?.sha,
      activeNote: envStatus?.active?.note,
      proposedNote: envStatus?.proposed?.note,
      pr: envStatus?.pullRequest
        ? {
            state: envStatus.pullRequest.state ?? 'closed',
            url: envStatus.pullRequest.url,
            id: envStatus.pullRequest.id,
            createdAt: envStatus.pullRequest.prCreationTime,
          }
        : undefined,
      proposedChecks,
      activeChecks,
      history: (envStatus?.history ?? []).map((h) => ({
        activeSha: h.active?.dry?.sha,
        activeHydratedSha: h.active?.hydrated?.sha,
        author: h.active?.hydrated?.author,
        subject: h.active?.hydrated?.subject,
        commitTime: h.active?.hydrated?.commitTime,
      })),
      stuckMinutes: computeStuckMinutes(
        envStatus?.pullRequest?.prCreationTime,
        [...proposedChecks, ...activeChecks],
      ),
    };
  });

  const gates: DerivedGateStatus[] = [];
  for (let i = 1; i < stages.length; i++) {
    const proposed = stages[i].proposedChecks;
    gates.push({
      sourceEnv: stages[i - 1].label,
      targetEnv: stages[i].label,
      status: deriveGateStatus(proposed),
      failedChecks: proposed.filter((c) => c.phase === 'failure').map((c) => c.key),
      pendingChecks: proposed.filter((c) => c.phase === 'pending').map((c) => c.key),
      passedChecks: proposed.filter((c) => c.phase === 'success').map((c) => c.key),
      pr: stages[i].pr,
    });
  }

  let overallStatus: PipelineStageStatus = 'healthy';
  if (stages.some((s) => s.status === 'blocked')) overallStatus = 'blocked';
  else if (stages.some((s) => s.status === 'promoting')) overallStatus = 'promoting';
  else if (stages.some((s) => s.status === 'pending')) overallStatus = 'pending';

  return { stages, gates, overallStatus };
}

export const STUCK_THRESHOLD_MINUTES = 30;

export const commitStatusPhaseColor: Record<string, 'green' | 'red' | 'blue' | 'gold' | 'grey'> = {
  success: 'green',
  failure: 'red',
  pending: 'blue',
};

export const pipelineStageStatusColor: Record<PipelineStageStatus, string> = {
  healthy: 'var(--pf-t--global--color--status--success--default)',
  promoting: 'var(--pf-t--global--color--status--info--default)',
  blocked: 'var(--pf-t--global--color--status--danger--default)',
  pending: 'var(--pf-t--global--color--status--warning--default)',
};
