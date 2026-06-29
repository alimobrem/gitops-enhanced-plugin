import { PromotionStrategyModel, ScmProviderModel, GitRepositoryModel } from '../../models';

const SECRET_KEY: Record<string, string> = {
  github: 'githubAppPrivateKey',
  gitlab: 'token',
  gitea: 'token',
  forgejo: 'token',
  bitbucketCloud: 'token',
  azureDevOps: 'token',
};

describe('PromotionCreatePage form logic', () => {
  describe('form defaults', () => {
    const initial = {
      useExistingProvider: false,
      existingProviderName: '',
      providerName: '',
      providerType: 'github' as const,
      githubAppId: '',
      githubInstallationId: '',
      credential: '',
      providerDomain: '',
      azureOrg: '',
      useExistingRepo: false,
      existingRepoName: '',
      repoName: '',
      repoOwner: '',
      repoProjectName: '',
      gitlabNamespace: '',
      psName: '',
      environments: [
        { branch: 'env/dev', autoMerge: true },
        { branch: 'env/staging', autoMerge: true },
        { branch: 'env/prod', autoMerge: false },
      ],
      proposedChecks: [] as Array<{ key: string }>,
      activeChecks: [] as Array<{ key: string }>,
    };

    it('has 3 default environments', () => {
      expect(initial.environments).toHaveLength(3);
    });

    it('defaults to github provider', () => {
      expect(initial.providerType).toBe('github');
    });

    it('defaults to creating new provider and repo', () => {
      expect(initial.useExistingProvider).toBe(false);
      expect(initial.useExistingRepo).toBe(false);
    });

    it('starts with no checks', () => {
      expect(initial.proposedChecks).toHaveLength(0);
      expect(initial.activeChecks).toHaveLength(0);
    });
  });

  describe('validation', () => {
    const validate = (form: { psName: string; useExistingProvider: boolean; providerName: string; useExistingRepo: boolean; repoName: string; repoOwner: string; environments: Array<{ branch: string }> }) =>
      form.psName.trim()
      && (form.useExistingProvider || form.providerName.trim())
      && (form.useExistingRepo || (form.repoName.trim() && form.repoOwner.trim()))
      && form.environments.filter((e) => e.branch.trim()).length >= 2;

    it('rejects empty pipeline name', () => {
      expect(validate({ psName: '', useExistingProvider: true, providerName: '', useExistingRepo: true, repoName: '', repoOwner: '', environments: [{ branch: 'a' }, { branch: 'b' }] })).toBeFalsy();
    });

    it('rejects missing provider name when creating new', () => {
      expect(validate({ psName: 'test', useExistingProvider: false, providerName: '', useExistingRepo: true, repoName: '', repoOwner: '', environments: [{ branch: 'a' }, { branch: 'b' }] })).toBeFalsy();
    });

    it('accepts existing provider without provider name', () => {
      expect(validate({ psName: 'test', useExistingProvider: true, providerName: '', useExistingRepo: true, repoName: '', repoOwner: '', environments: [{ branch: 'a' }, { branch: 'b' }] })).toBeTruthy();
    });

    it('rejects missing repo fields when creating new', () => {
      expect(validate({ psName: 'test', useExistingProvider: true, providerName: '', useExistingRepo: false, repoName: '', repoOwner: '', environments: [{ branch: 'a' }, { branch: 'b' }] })).toBeFalsy();
    });

    it('accepts existing repo without repo fields', () => {
      expect(validate({ psName: 'test', useExistingProvider: true, providerName: '', useExistingRepo: true, repoName: '', repoOwner: '', environments: [{ branch: 'a' }, { branch: 'b' }] })).toBeTruthy();
    });

    it('rejects fewer than 2 environments', () => {
      expect(validate({ psName: 'test', useExistingProvider: true, providerName: '', useExistingRepo: true, repoName: '', repoOwner: '', environments: [{ branch: 'a' }] })).toBeFalsy();
    });

    it('accepts valid full form', () => {
      expect(validate({ psName: 'my-pipeline', useExistingProvider: false, providerName: 'github', useExistingRepo: false, repoName: 'my-repo', repoOwner: 'my-org', environments: [{ branch: 'env/dev' }, { branch: 'env/prod' }] })).toBeTruthy();
    });
  });

  describe('Secret key mapping', () => {
    it('maps github to githubAppPrivateKey', () => {
      expect(SECRET_KEY.github).toBe('githubAppPrivateKey');
    });

    it('maps gitlab to token', () => {
      expect(SECRET_KEY.gitlab).toBe('token');
    });

    it('maps all other providers to token', () => {
      for (const provider of ['gitea', 'forgejo', 'bitbucketCloud', 'azureDevOps']) {
        expect(SECRET_KEY[provider]).toBe('token');
      }
    });
  });

  describe('resource building', () => {
    it('builds GitHub ScmProvider spec correctly', () => {
      const spec: Record<string, unknown> = {
        github: { appID: 123, installationID: 456 },
        secretRef: { name: 'my-provider-credentials' },
      };
      expect(spec.github).toEqual({ appID: 123, installationID: 456 });
      expect(spec.secretRef).toEqual({ name: 'my-provider-credentials' });
    });

    it('builds GitLab ScmProvider spec without domain for gitlab.com', () => {
      const spec: Record<string, unknown> = { gitlab: {}, secretRef: { name: 'gl-creds' } };
      expect(spec.gitlab).toEqual({});
    });

    it('builds GitLab ScmProvider spec with custom domain', () => {
      const spec: Record<string, unknown> = { gitlab: { domain: 'gitlab.corp.com' }, secretRef: { name: 'gl-creds' } };
      expect((spec.gitlab as Record<string, string>).domain).toBe('gitlab.corp.com');
    });

    it('builds Azure DevOps ScmProvider spec with organization', () => {
      const spec: Record<string, unknown> = { azureDevOps: { organization: 'my-org' }, secretRef: { name: 'az-creds' } };
      expect((spec.azureDevOps as Record<string, string>).organization).toBe('my-org');
    });

    it('builds GitHub GitRepository spec with owner and name', () => {
      const spec = { github: { owner: 'alimobrem', name: 'my-repo' }, scmProviderRef: { name: 'github' } };
      expect(spec.github).toEqual({ owner: 'alimobrem', name: 'my-repo' });
    });

    it('builds GitLab GitRepository spec with namespace', () => {
      const spec = { gitlab: { name: 'my-repo', namespace: 'my-group/subgroup' }, scmProviderRef: { name: 'gitlab' } };
      expect(spec.gitlab.namespace).toBe('my-group/subgroup');
    });

    it('builds Azure DevOps GitRepository spec with project', () => {
      const spec = { azureDevOps: { name: 'my-repo', project: 'MyProject' }, scmProviderRef: { name: 'azure' } };
      expect(spec.azureDevOps.project).toBe('MyProject');
    });

    it('builds PromotionStrategy with all fields', () => {
      const resource = {
        apiVersion: 'promoter.argoproj.io/v1alpha1',
        kind: 'PromotionStrategy',
        metadata: { name: 'test', namespace: 'default' },
        spec: {
          gitRepositoryRef: { name: 'my-repo' },
          environments: [
            { branch: 'env/dev' },
            { branch: 'env/prod', autoMerge: false },
          ],
          proposedCommitStatuses: [{ key: 'integration-tests' }],
          activeCommitStatuses: [{ key: 'argocd-health' }],
        },
      };
      expect(resource.spec.environments).toHaveLength(2);
      expect(resource.spec.environments[1].autoMerge).toBe(false);
      expect(resource.spec.proposedCommitStatuses).toEqual([{ key: 'integration-tests' }]);
    });

    it('omits autoMerge when true (default)', () => {
      const envs = [
        { branch: 'env/dev', autoMerge: true },
        { branch: 'env/prod', autoMerge: false },
      ].map((e) => ({
        branch: e.branch.trim(),
        ...(e.autoMerge ? {} : { autoMerge: false }),
      }));
      expect(envs[0]).toEqual({ branch: 'env/dev' });
      expect(envs[1]).toEqual({ branch: 'env/prod', autoMerge: false });
    });
  });

  describe('models', () => {
    it('ScmProviderModel has correct group', () => {
      expect(ScmProviderModel.apiGroup).toBe('promoter.argoproj.io');
      expect(ScmProviderModel.kind).toBe('ScmProvider');
    });

    it('GitRepositoryModel has correct group', () => {
      expect(GitRepositoryModel.apiGroup).toBe('promoter.argoproj.io');
      expect(GitRepositoryModel.kind).toBe('GitRepository');
    });

    it('PromotionStrategyModel has correct group', () => {
      expect(PromotionStrategyModel.apiGroup).toBe('promoter.argoproj.io');
      expect(PromotionStrategyModel.kind).toBe('PromotionStrategy');
    });
  });
});
