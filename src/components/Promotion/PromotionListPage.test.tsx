import { derivePipelineStatus, deriveEnvLabel } from '../../utils/promotion';
import type { PromotionStrategyResource } from '../../types';

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

describe('PromotionListPage data derivation', () => {
  it('derives environment labels from branches', () => {
    const strategy = makeStrategy();
    const { stages } = derivePipelineStatus(strategy);
    expect(stages.map((s) => s.label)).toEqual(['dev', 'staging', 'prod']);
  });

  it('computes overall status from environments', () => {
    const healthy = makeStrategy({
      status: {
        environments: [
          { branch: 'env/dev', proposed: {}, active: { dry: { sha: 'aaa' } } },
          { branch: 'env/staging', proposed: {}, active: { dry: { sha: 'aaa' } } },
          { branch: 'env/prod', proposed: {}, active: { dry: { sha: 'aaa' } } },
        ],
      },
    });
    expect(derivePipelineStatus(healthy).overallStatus).toBe('healthy');
  });

  it('formats environment chain as arrow-separated labels', () => {
    const strategy = makeStrategy();
    const { stages } = derivePipelineStatus(strategy);
    const chain = stages.map((s) => s.label).join(' → ');
    expect(chain).toBe('dev → staging → prod');
  });

  it('identifies blocked pipelines for list filtering', () => {
    const blocked = makeStrategy({
      status: {
        environments: [
          { branch: 'env/dev', proposed: {}, active: { dry: { sha: 'a' } } },
          { branch: 'env/staging', proposed: { commitStatuses: [{ key: 'scan', phase: 'failure' }] }, active: { dry: { sha: 'b' } } },
          { branch: 'env/prod', proposed: {}, active: { dry: { sha: 'c' } } },
        ],
      },
    });
    expect(derivePipelineStatus(blocked).overallStatus).toBe('blocked');
  });

  it('identifies promoting pipelines for list filtering', () => {
    const promoting = makeStrategy({
      status: {
        environments: [
          { branch: 'env/dev', proposed: {}, active: { dry: { sha: 'a' } } },
          { branch: 'env/staging', proposed: {}, active: { dry: { sha: 'a' } }, pullRequest: { state: 'open', id: '1' } },
          { branch: 'env/prod', proposed: {}, active: { dry: { sha: 'b' } } },
        ],
      },
    });
    expect(derivePipelineStatus(promoting).overallStatus).toBe('promoting');
  });

  it('finds furthest active environment', () => {
    const strategy = makeStrategy({
      status: {
        environments: [
          { branch: 'env/dev', proposed: {}, active: { dry: { sha: 'aaa' } } },
          { branch: 'env/staging', proposed: {}, active: { dry: { sha: 'aaa' } } },
          { branch: 'env/prod', proposed: {}, active: {} },
        ],
      },
    });
    const { stages } = derivePipelineStatus(strategy);
    const activeEnvs = stages.filter((s) => s.activeSha);
    expect(activeEnvs[activeEnvs.length - 1].label).toBe('staging');
  });
});
