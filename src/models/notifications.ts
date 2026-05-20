import type { K8sModel } from '@openshift-console/dynamic-plugin-sdk';

export const NotificationsConfigurationModel: K8sModel = {
  apiGroup: 'argoproj.io',
  apiVersion: 'v1alpha1',
  kind: 'NotificationsConfiguration',
  plural: 'notificationsconfigurations',
  abbr: 'NC',
  namespaced: true,
  label: 'NotificationsConfiguration',
  labelPlural: 'NotificationsConfigurations',
};

export const NotificationsConfigurationGroupVersionKind = {
  group: 'argoproj.io',
  version: 'v1alpha1',
  kind: 'NotificationsConfiguration',
};
