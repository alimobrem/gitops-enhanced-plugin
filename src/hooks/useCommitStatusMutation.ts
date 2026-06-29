import { useCallback } from 'react';
import { k8sPatch, k8sCreate } from '@openshift-console/dynamic-plugin-sdk';
import { PromoterCommitStatusModel } from '../models';
import { useCommitStatuses } from './useCommitStatuses';
import type { CommitStatusResource } from '../types';

export function useCommitStatusMutation(namespace: string, gitRepositoryRefName: string) {
  const [commitStatuses] = useCommitStatuses(namespace);

  const setPhase = useCallback(
    async (key: string, sha: string, phase: 'pending' | 'success') => {
      const match = (commitStatuses ?? []).find(
        (cs: CommitStatusResource) => cs.spec.name === key && cs.spec.sha === sha,
      );
      if (match) {
        await k8sPatch({
          model: PromoterCommitStatusModel,
          resource: match,
          data: [{ op: 'replace', path: '/spec/phase', value: phase }],
        });
      } else {
        await k8sCreate({
          model: PromoterCommitStatusModel,
          data: {
            apiVersion: 'promoter.argoproj.io/v1alpha1',
            kind: 'CommitStatus',
            metadata: {
              generateName: `${key}-`,
              namespace,
              labels: { 'promoter.argoproj.io/commit-status': key },
            },
            spec: {
              gitRepositoryRef: { name: gitRepositoryRefName },
              sha,
              name: key,
              description: phase === 'success' ? 'Manually approved via console' : 'Retried via console',
              phase,
            },
          },
        });
      }
    },
    [commitStatuses, namespace, gitRepositoryRefName],
  );

  return { setPhase };
}
