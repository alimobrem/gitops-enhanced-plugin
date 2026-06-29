import type { K8sModel } from '@openshift-console/dynamic-plugin-sdk';

export const ScmProviderModel: K8sModel = {
  apiGroup: 'promoter.argoproj.io',
  apiVersion: 'v1alpha1',
  kind: 'ScmProvider',
  plural: 'scmproviders',
  abbr: 'SCP',
  namespaced: true,
  label: 'ScmProvider',
  labelPlural: 'ScmProviders',
};

export const ScmProviderGroupVersionKind = {
  group: 'promoter.argoproj.io',
  version: 'v1alpha1',
  kind: 'ScmProvider',
};
