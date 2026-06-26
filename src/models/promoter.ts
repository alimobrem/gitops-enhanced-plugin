import type { K8sModel } from '@openshift-console/dynamic-plugin-sdk';

export const PromotionStrategyModel: K8sModel = {
  apiGroup: 'promoter.argoproj.io',
  apiVersion: 'v1alpha1',
  kind: 'PromotionStrategy',
  plural: 'promotionstrategies',
  abbr: 'PS',
  namespaced: true,
  label: 'PromotionStrategy',
  labelPlural: 'PromotionStrategies',
};

export const PromotionStrategyGroupVersionKind = {
  group: 'promoter.argoproj.io',
  version: 'v1alpha1',
  kind: 'PromotionStrategy',
};

export const ChangeTransferPolicyModel: K8sModel = {
  apiGroup: 'promoter.argoproj.io',
  apiVersion: 'v1alpha1',
  kind: 'ChangeTransferPolicy',
  plural: 'changetransferpolicies',
  abbr: 'CTP',
  namespaced: true,
  label: 'ChangeTransferPolicy',
  labelPlural: 'ChangeTransferPolicies',
};

export const ChangeTransferPolicyGroupVersionKind = {
  group: 'promoter.argoproj.io',
  version: 'v1alpha1',
  kind: 'ChangeTransferPolicy',
};

export const PromoterCommitStatusModel: K8sModel = {
  apiGroup: 'promoter.argoproj.io',
  apiVersion: 'v1alpha1',
  kind: 'CommitStatus',
  plural: 'commitstatuses',
  abbr: 'CS',
  namespaced: true,
  label: 'CommitStatus',
  labelPlural: 'CommitStatuses',
};

export const PromoterCommitStatusGroupVersionKind = {
  group: 'promoter.argoproj.io',
  version: 'v1alpha1',
  kind: 'CommitStatus',
};

export const PromoterPullRequestModel: K8sModel = {
  apiGroup: 'promoter.argoproj.io',
  apiVersion: 'v1alpha1',
  kind: 'PullRequest',
  plural: 'pullrequests',
  abbr: 'PR',
  namespaced: true,
  label: 'PullRequest',
  labelPlural: 'PullRequests',
};

export const PromoterPullRequestGroupVersionKind = {
  group: 'promoter.argoproj.io',
  version: 'v1alpha1',
  kind: 'PullRequest',
};
