import type { K8sModel } from '@openshift-console/dynamic-plugin-sdk';

export type ProviderType = 'github' | 'gitlab' | 'gitea' | 'forgejo' | 'bitbucketCloud' | 'azureDevOps';

export const PROVIDER_OPTIONS: Array<{ value: ProviderType; label: string }> = [
  { value: 'github', label: 'GitHub' },
  { value: 'gitlab', label: 'GitLab' },
  { value: 'gitea', label: 'Gitea' },
  { value: 'forgejo', label: 'Forgejo' },
  { value: 'bitbucketCloud', label: 'Bitbucket Cloud' },
  { value: 'azureDevOps', label: 'Azure DevOps' },
];

export const SECRET_KEY: Record<ProviderType, string> = {
  github: 'githubAppPrivateKey',
  gitlab: 'token',
  gitea: 'token',
  forgejo: 'token',
  bitbucketCloud: 'token',
  azureDevOps: 'token',
};

export const SecretModel: K8sModel = {
  apiGroup: '',
  apiVersion: 'v1',
  kind: 'Secret',
  plural: 'secrets',
  abbr: 'S',
  namespaced: true,
  label: 'Secret',
  labelPlural: 'Secrets',
};

export function buildProviderSpec(
  type: ProviderType,
  form: { githubAppId: string; githubInstallationId: string; providerDomain: string; azureOrg: string },
): Record<string, unknown> {
  const specs: Record<ProviderType, () => Record<string, unknown>> = {
    github: () => ({
      github: {
        appID: parseInt(form.githubAppId, 10),
        ...(form.githubInstallationId ? { installationID: parseInt(form.githubInstallationId, 10) } : {}),
        ...(form.providerDomain ? { domain: form.providerDomain } : {}),
      },
    }),
    gitlab: () => ({ gitlab: form.providerDomain ? { domain: form.providerDomain } : {} }),
    gitea: () => ({ gitea: { domain: form.providerDomain } }),
    forgejo: () => ({ forgejo: { domain: form.providerDomain } }),
    bitbucketCloud: () => ({ bitbucketCloud: {} }),
    azureDevOps: () => ({
      azureDevOps: {
        organization: form.azureOrg,
        ...(form.providerDomain ? { domain: form.providerDomain } : {}),
      },
    }),
  };
  return specs[type]();
}

export function buildRepoSpec(
  type: ProviderType,
  providerName: string,
  form: { repoOwner: string; repoName: string; repoProjectName: string; gitlabNamespace: string },
): Record<string, unknown> {
  const base = { scmProviderRef: { name: providerName } };
  const specs: Record<ProviderType, () => Record<string, unknown>> = {
    gitlab: () => ({ gitlab: { name: form.repoProjectName || form.repoName, namespace: form.gitlabNamespace || form.repoOwner } }),
    azureDevOps: () => ({ azureDevOps: { name: form.repoName, project: form.repoProjectName || form.repoOwner } }),
    github: () => ({ github: { owner: form.repoOwner, name: form.repoName } }),
    gitea: () => ({ gitea: { owner: form.repoOwner, name: form.repoName } }),
    forgejo: () => ({ forgejo: { owner: form.repoOwner, name: form.repoName } }),
    bitbucketCloud: () => ({ bitbucketCloud: { owner: form.repoOwner, name: form.repoName } }),
  };
  return { ...base, ...specs[type]() };
}
