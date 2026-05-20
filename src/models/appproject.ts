import type { K8sModel } from '@openshift-console/dynamic-plugin-sdk';

export const AppProjectModel: K8sModel = {
  apiGroup: 'argoproj.io',
  apiVersion: 'v1alpha1',
  kind: 'AppProject',
  plural: 'appprojects',
  abbr: 'APPPROJ',
  namespaced: true,
  label: 'AppProject',
  labelPlural: 'AppProjects',
};

export const AppProjectGroupVersionKind = {
  group: 'argoproj.io',
  version: 'v1alpha1',
  kind: 'AppProject',
};
