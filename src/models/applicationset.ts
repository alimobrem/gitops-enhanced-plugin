import type { K8sModel } from '@openshift-console/dynamic-plugin-sdk';

export const ApplicationSetModel: K8sModel = {
  apiGroup: 'argoproj.io',
  apiVersion: 'v1alpha1',
  kind: 'ApplicationSet',
  plural: 'applicationsets',
  abbr: 'APPSET',
  namespaced: true,
  label: 'ApplicationSet',
  labelPlural: 'ApplicationSets',
};

export const ApplicationSetGroupVersionKind = {
  group: 'argoproj.io',
  version: 'v1alpha1',
  kind: 'ApplicationSet',
};
