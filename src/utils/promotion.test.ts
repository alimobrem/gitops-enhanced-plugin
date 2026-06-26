import {
  deriveEnvLabel,
  derivePipelineStatus,
} from './promotion';
import type { PromotionStrategyResource } from '../types';

const makeStrategy = (overrides?: Partial<PromotionStrategyResource>): PromotionStrategyResource => ({
  apiVersion: 'promoter.argoproj.io/v1alpha1',
  kind: 'PromotionStrategy',
  metadata: { name: 'test', namespace: 'default', uid: 'uid-1' },
  spec: {
    gitRepositoryRef: { name: 'my-repo' },
    environments: [
      { branch: 'env/dev' },
      { branch: 'env/staging' },
      { branch: 'env/prod' },
    ],
  },
  ...overrides,
});

describe('deriveEnvLabel', () => {
  it('extracts last segment from slash-separated branch', () => {
    expect(deriveEnvLabel('env/dev')).toBe('dev');
    expect(deriveEnvLabel('environment/staging')).toBe('staging');
  });

  it('returns branch name when no slashes', () => {
    expect(deriveEnvLabel('main')).toBe('main');
  });

  it('handles deeply nested paths', () => {
    expect(deriveEnvLabel('a/b/c/prod')).toBe('prod');
  });
});

describe('derivePipelineStatus', () => {
  it('returns healthy when all environments have no issues', () => {
    const strategy = makeStrategy({
      status: {
        environments: [
          { branch: 'env/dev', proposed: {}, active: { dry: { sha: 'aaa' } } },
          { branch: 'env/staging', proposed: {}, active: { dry: { sha: 'aaa' } } },
          { branch: 'env/prod', proposed: {}, active: { dry: { sha: 'aaa' } } },
        ],
      },
    });
    const result = derivePipelineStatus(strategy);
    expect(result.overallStatus).toBe('healthy');
    expect(result.stages).toHaveLength(3);
    expect(result.gates).toHaveLength(2);
  });

  it('returns blocked when any commit status has failure', () => {
    const strategy = makeStrategy({
      status: {
        environments: [
          { branch: 'env/dev', proposed: {}, active: { dry: { sha: 'aaa' } } },
          {
            branch: 'env/staging',
            proposed: { commitStatuses: [{ key: 'security-scan', phase: 'failure' }] },
            active: { dry: { sha: 'bbb' } },
          },
          { branch: 'env/prod', proposed: {}, active: { dry: { sha: 'ccc' } } },
        ],
      },
    });
    const result = derivePipelineStatus(strategy);
    expect(result.overallStatus).toBe('blocked');
    expect(result.stages[1].status).toBe('blocked');
  });

  it('returns promoting when a PR is open', () => {
    const strategy = makeStrategy({
      status: {
        environments: [
          { branch: 'env/dev', proposed: {}, active: { dry: { sha: 'aaa' } } },
          {
            branch: 'env/staging',
            proposed: {},
            active: { dry: { sha: 'aaa' } },
            pullRequest: { state: 'open', id: '42', url: 'https://github.com/org/repo/pull/42' },
          },
          { branch: 'env/prod', proposed: {}, active: { dry: { sha: 'bbb' } } },
        ],
      },
    });
    const result = derivePipelineStatus(strategy);
    expect(result.overallStatus).toBe('promoting');
    expect(result.stages[1].status).toBe('promoting');
    expect(result.stages[1].pr?.state).toBe('open');
  });

  it('returns pending when commit statuses are pending', () => {
    const strategy = makeStrategy({
      status: {
        environments: [
          { branch: 'env/dev', proposed: {}, active: { dry: { sha: 'aaa' } } },
          {
            branch: 'env/staging',
            proposed: { commitStatuses: [{ key: 'e2e', phase: 'pending' }] },
            active: { dry: { sha: 'aaa' } },
          },
          { branch: 'env/prod', proposed: {}, active: { dry: { sha: 'bbb' } } },
        ],
      },
    });
    const result = derivePipelineStatus(strategy);
    expect(result.overallStatus).toBe('pending');
  });

  it('derives gate statuses between environments', () => {
    const strategy = makeStrategy({
      status: {
        environments: [
          { branch: 'env/dev', proposed: {}, active: { dry: { sha: 'aaa' } } },
          {
            branch: 'env/staging',
            proposed: {
              commitStatuses: [
                { key: 'security-scan', phase: 'success' },
                { key: 'e2e', phase: 'failure' },
              ],
            },
            active: { dry: { sha: 'bbb' } },
          },
          { branch: 'env/prod', proposed: {}, active: { dry: { sha: 'ccc' } } },
        ],
      },
    });
    const result = derivePipelineStatus(strategy);
    expect(result.gates[0].status).toBe('blocked');
    expect(result.gates[0].failedChecks).toEqual(['e2e']);
    expect(result.gates[0].passedChecks).toEqual(['security-scan']);
    expect(result.gates[0].sourceEnv).toBe('dev');
    expect(result.gates[0].targetEnv).toBe('staging');
  });

  it('handles strategy with no status', () => {
    const strategy = makeStrategy();
    const result = derivePipelineStatus(strategy);
    expect(result.stages).toHaveLength(3);
    expect(result.overallStatus).toBe('pending');
  });

  it('derives active SHA from status', () => {
    const strategy = makeStrategy({
      status: {
        environments: [
          { branch: 'env/dev', proposed: {}, active: { dry: { sha: 'abc1234567890' } } },
          { branch: 'env/staging', proposed: {}, active: { dry: { sha: 'def5678901234' } } },
          { branch: 'env/prod', proposed: {}, active: { dry: { sha: 'ghi9012345678' } } },
        ],
      },
    });
    const result = derivePipelineStatus(strategy);
    expect(result.stages[0].activeSha).toBe('abc1234567890');
    expect(result.stages[2].activeSha).toBe('ghi9012345678');
  });
});
