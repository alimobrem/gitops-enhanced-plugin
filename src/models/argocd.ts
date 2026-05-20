import type { K8sModel } from '@openshift-console/dynamic-plugin-sdk';

export const ArgoCDModel: K8sModel = {
  apiGroup: 'argoproj.io',
  apiVersion: 'v1beta1',
  kind: 'ArgoCD',
  plural: 'argocds',
  abbr: 'ACD',
  namespaced: true,
  label: 'ArgoCD',
  labelPlural: 'ArgoCDs',
};

export const ArgoCDGroupVersionKind = {
  group: 'argoproj.io',
  version: 'v1beta1',
  kind: 'ArgoCD',
};
