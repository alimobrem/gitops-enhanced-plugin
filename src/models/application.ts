import type { K8sModel } from '@openshift-console/dynamic-plugin-sdk';

export const ApplicationModel: K8sModel = {
  apiGroup: 'argoproj.io',
  apiVersion: 'v1alpha1',
  kind: 'Application',
  plural: 'applications',
  abbr: 'APP',
  namespaced: true,
  label: 'Application',
  labelPlural: 'Applications',
};

export const ApplicationGroupVersionKind = {
  group: 'argoproj.io',
  version: 'v1alpha1',
  kind: 'Application',
};
