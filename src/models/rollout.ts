import type { K8sModel } from '@openshift-console/dynamic-plugin-sdk';

export const RolloutModel: K8sModel = {
  apiGroup: 'argoproj.io',
  apiVersion: 'v1alpha1',
  kind: 'Rollout',
  plural: 'rollouts',
  abbr: 'RO',
  namespaced: true,
  label: 'Rollout',
  labelPlural: 'Rollouts',
};

export const RolloutGroupVersionKind = {
  group: 'argoproj.io',
  version: 'v1alpha1',
  kind: 'Rollout',
};

export const RolloutManagerModel: K8sModel = {
  apiGroup: 'argoproj.io',
  apiVersion: 'v1alpha1',
  kind: 'RolloutManager',
  plural: 'rolloutmanagers',
  abbr: 'RM',
  namespaced: true,
  label: 'RolloutManager',
  labelPlural: 'RolloutManagers',
};

export const RolloutManagerGroupVersionKind = {
  group: 'argoproj.io',
  version: 'v1alpha1',
  kind: 'RolloutManager',
};
