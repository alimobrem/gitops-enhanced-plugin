import React from 'react';
import { useMemo, type FC } from 'react';
import { useK8sWatchResource, ResourceLink } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Bullseye, Spinner, EmptyState, EmptyStateBody, Label,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import type { RolloutResource } from '../../types';

interface PodResource {
  metadata: { name: string; namespace: string; uid: string; creationTimestamp?: string; labels?: Record<string, string>; ownerReferences?: Array<{ name: string; kind: string }> };
  status?: { phase?: string; containerStatuses?: Array<{ name: string; ready: boolean; restartCount: number; state?: Record<string, unknown> }> };
}

export const PodsTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const rollout = obj as RolloutResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');
  const ns = rollout?.metadata?.namespace ?? '';
  const selectorKey = JSON.stringify(rollout?.spec?.selector?.matchLabels ?? {});

  const [pods, loaded] = useK8sWatchResource<PodResource[]>({
    groupVersionKind: { group: '', version: 'v1', kind: 'Pod' },
    namespace: ns,
    isList: true,
  });

  const podsKey = useMemo(() => (pods ?? []).map((p) => `${p.metadata.uid}:${p.status?.phase}`).join(','), [pods]);

  const matchedPods = useMemo(() => {
    const selector = JSON.parse(selectorKey) as Record<string, string>;
    if (!Object.keys(selector).length || !pods) return [];
    return pods.filter((p) => {
      const labels = p.metadata.labels ?? {};
      return Object.entries(selector).every(([k, v]) => labels[k] === v);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podsKey, selectorKey]);

  if (!rollout?.metadata || !loaded) return <Bullseye><Spinner /></Bullseye>;

  if (matchedPods.length === 0) {
    return <EmptyState className="pf-v6-u-mt-md"><EmptyStateBody>{t('No pods found for this rollout.')}</EmptyStateBody></EmptyState>;
  }

  const phaseColor = (phase?: string): 'green' | 'red' | 'blue' | 'grey' => {
    switch (phase) {
      case 'Running': return 'green';
      case 'Succeeded': return 'green';
      case 'Failed': case 'Error': return 'red';
      case 'Pending': return 'blue';
      default: return 'grey';
    }
  };

  return (
    <Table aria-label={t('Pods')} isCompact isStriped className="pf-v6-u-mt-md">
      <Thead><Tr>
        <Th>{t('Name')}</Th>
        <Th>{t('Status')}</Th>
        <Th>{t('Ready')}</Th>
        <Th>{t('Restarts')}</Th>
        <Th>{t('Created')}</Th>
      </Tr></Thead>
      <Tbody>
        {matchedPods.map((pod) => {
          const containers = pod.status?.containerStatuses ?? [];
          const readyCount = containers.filter((c) => c.ready).length;
          const restarts = containers.reduce((sum, c) => sum + c.restartCount, 0);
          return (
            <Tr key={pod.metadata.uid}>
              <Td>
                <ResourceLink groupVersionKind={{ group: '', version: 'v1', kind: 'Pod' }} name={pod.metadata.name} namespace={pod.metadata.namespace} />
              </Td>
              <Td><Label isCompact color={phaseColor(pod.status?.phase)}>{pod.status?.phase ?? t('Unknown')}</Label></Td>
              <Td>{readyCount}/{containers.length}</Td>
              <Td>{restarts}</Td>
              <Td>{pod.metadata.creationTimestamp ? new Date(pod.metadata.creationTimestamp).toLocaleString() : '-'}</Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
};

export default PodsTab;
