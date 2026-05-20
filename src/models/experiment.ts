import type { K8sModel } from '@openshift-console/dynamic-plugin-sdk';

export const ExperimentModel: K8sModel = {
  apiGroup: 'argoproj.io',
  apiVersion: 'v1alpha1',
  kind: 'Experiment',
  plural: 'experiments',
  abbr: 'EXP',
  namespaced: true,
  label: 'Experiment',
  labelPlural: 'Experiments',
};

export const ExperimentGroupVersionKind = {
  group: 'argoproj.io',
  version: 'v1alpha1',
  kind: 'Experiment',
};
