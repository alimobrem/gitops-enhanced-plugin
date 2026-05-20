import type { K8sModel } from '@openshift-console/dynamic-plugin-sdk';

export const AnalysisTemplateModel: K8sModel = {
  apiGroup: 'argoproj.io',
  apiVersion: 'v1alpha1',
  kind: 'AnalysisTemplate',
  plural: 'analysistemplates',
  abbr: 'AT',
  namespaced: true,
  label: 'AnalysisTemplate',
  labelPlural: 'AnalysisTemplates',
};

export const AnalysisTemplateGroupVersionKind = {
  group: 'argoproj.io',
  version: 'v1alpha1',
  kind: 'AnalysisTemplate',
};

export const ClusterAnalysisTemplateModel: K8sModel = {
  apiGroup: 'argoproj.io',
  apiVersion: 'v1alpha1',
  kind: 'ClusterAnalysisTemplate',
  plural: 'clusteranalysistemplates',
  abbr: 'CAT',
  namespaced: false,
  label: 'ClusterAnalysisTemplate',
  labelPlural: 'ClusterAnalysisTemplates',
};

export const ClusterAnalysisTemplateGroupVersionKind = {
  group: 'argoproj.io',
  version: 'v1alpha1',
  kind: 'ClusterAnalysisTemplate',
};

export const AnalysisRunModel: K8sModel = {
  apiGroup: 'argoproj.io',
  apiVersion: 'v1alpha1',
  kind: 'AnalysisRun',
  plural: 'analysisruns',
  abbr: 'AR',
  namespaced: true,
  label: 'AnalysisRun',
  labelPlural: 'AnalysisRuns',
};

export const AnalysisRunGroupVersionKind = {
  group: 'argoproj.io',
  version: 'v1alpha1',
  kind: 'AnalysisRun',
};
