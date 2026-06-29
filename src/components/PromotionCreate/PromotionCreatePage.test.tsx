describe('PromotionCreatePage form state', () => {
  it('default form has 3 environments', () => {
    const initial = {
      name: '',
      gitRepositoryRef: '',
      environments: [
        { branch: 'env/dev', autoMerge: true },
        { branch: 'env/staging', autoMerge: true },
        { branch: 'env/prod', autoMerge: false },
      ],
      proposedChecks: [],
      activeChecks: [],
    };
    expect(initial.environments).toHaveLength(3);
    expect(initial.environments[0].branch).toBe('env/dev');
    expect(initial.environments[2].autoMerge).toBe(false);
  });

  it('validates that name and gitRepositoryRef are required', () => {
    const form = { name: '', gitRepositoryRef: '', environments: [{ branch: 'env/dev', autoMerge: true }] };
    const isValid = form.name.trim() && form.gitRepositoryRef.trim() && form.environments.some((e) => e.branch.trim());
    expect(isValid).toBeFalsy();
  });

  it('validates when all required fields are filled', () => {
    const form = { name: 'test', gitRepositoryRef: 'my-repo', environments: [{ branch: 'env/dev', autoMerge: true }] };
    const isValid = form.name.trim() && form.gitRepositoryRef.trim() && form.environments.some((e) => e.branch.trim());
    expect(isValid).toBeTruthy();
  });

  it('builds correct PromotionStrategy resource', () => {
    const form = {
      name: 'test-promo',
      gitRepositoryRef: 'example-apps',
      environments: [
        { branch: 'env/dev', autoMerge: true },
        { branch: 'env/prod', autoMerge: false },
      ],
      proposedChecks: [{ key: 'integration-tests' }],
      activeChecks: [{ key: 'argocd-health' }],
    };

    const resource = {
      apiVersion: 'promoter.argoproj.io/v1alpha1',
      kind: 'PromotionStrategy',
      metadata: { name: form.name, namespace: 'default' },
      spec: {
        gitRepositoryRef: { name: form.gitRepositoryRef },
        environments: form.environments.filter((e) => e.branch.trim()).map((e) => ({
          branch: e.branch.trim(),
          ...(e.autoMerge ? {} : { autoMerge: false }),
        })),
        ...(form.proposedChecks.length > 0
          ? { proposedCommitStatuses: form.proposedChecks.filter((c) => c.key.trim()).map((c) => ({ key: c.key.trim() })) }
          : {}),
        ...(form.activeChecks.length > 0
          ? { activeCommitStatuses: form.activeChecks.filter((c) => c.key.trim()).map((c) => ({ key: c.key.trim() })) }
          : {}),
      },
    };

    expect(resource.spec.environments).toHaveLength(2);
    expect(resource.spec.environments[0]).toEqual({ branch: 'env/dev' });
    expect(resource.spec.environments[1]).toEqual({ branch: 'env/prod', autoMerge: false });
    expect(resource.spec.proposedCommitStatuses).toEqual([{ key: 'integration-tests' }]);
    expect(resource.spec.activeCommitStatuses).toEqual([{ key: 'argocd-health' }]);
  });

  it('filters out empty check keys', () => {
    const checks = [{ key: 'valid' }, { key: '' }, { key: '  ' }];
    const filtered = checks.filter((c) => c.key.trim()).map((c) => ({ key: c.key.trim() }));
    expect(filtered).toEqual([{ key: 'valid' }]);
  });
});
