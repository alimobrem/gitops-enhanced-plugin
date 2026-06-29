import type { K8sModel } from '@openshift-console/dynamic-plugin-sdk';

export const GitRepositoryModel: K8sModel = {
  apiGroup: 'promoter.argoproj.io',
  apiVersion: 'v1alpha1',
  kind: 'GitRepository',
  plural: 'gitrepositories',
  abbr: 'GR',
  namespaced: true,
  label: 'GitRepository',
  labelPlural: 'GitRepositories',
};

export const GitRepositoryGroupVersionKind = {
  group: 'promoter.argoproj.io',
  version: 'v1alpha1',
  kind: 'GitRepository',
};
