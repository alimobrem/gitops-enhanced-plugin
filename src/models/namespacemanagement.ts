import type { K8sModel } from '@openshift-console/dynamic-plugin-sdk';

export const NamespaceManagementModel: K8sModel = {
  apiGroup: 'argoproj.io',
  apiVersion: 'v1alpha1',
  kind: 'NamespaceManagement',
  plural: 'namespacemanagements',
  abbr: 'NM',
  namespaced: true,
  label: 'NamespaceManagement',
  labelPlural: 'NamespaceManagements',
};

export const NamespaceManagementGroupVersionKind = {
  group: 'argoproj.io',
  version: 'v1alpha1',
  kind: 'NamespaceManagement',
};
