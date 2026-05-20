import type { K8sModel } from '@openshift-console/dynamic-plugin-sdk';

export const ImageUpdaterModel: K8sModel = {
  apiGroup: 'argocd-image-updater.argoproj.io',
  apiVersion: 'v1alpha1',
  kind: 'ImageUpdater',
  plural: 'imageupdaters',
  abbr: 'IU',
  namespaced: true,
  label: 'ImageUpdater',
  labelPlural: 'ImageUpdaters',
};

export const ImageUpdaterGroupVersionKind = {
  group: 'argocd-image-updater.argoproj.io',
  version: 'v1alpha1',
  kind: 'ImageUpdater',
};
