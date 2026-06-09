import React from 'react';
import { useMemo, type FC } from 'react';
import { useK8sWatchResource, ResourceLink } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Bullseye, Spinner, EmptyState, EmptyStateBody, Label,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { AnalysisRunGroupVersionKind } from '../../models';
import { phaseColor } from '../../utils/status';
import type { RolloutResource } from '../../types';

interface AnalysisRunResource {
  metadata: { name: string; namespace: string; uid: string; creationTimestamp?: string; ownerReferences?: Array<{ name: string; kind: string }> };
  status?: { phase?: string; message?: string };
}

export const AnalysisRunsTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const rollout = obj as RolloutResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');

  const [runs, loaded] = useK8sWatchResource<AnalysisRunResource[]>({
    groupVersionKind: AnalysisRunGroupVersionKind,
    namespace: rollout?.metadata?.namespace ?? '',
    isList: true,
  });

  const rolloutName = rollout?.metadata?.name ?? '';
  const rolloutRuns = useMemo(() =>
    (runs ?? []).filter((r) =>
      r.metadata.ownerReferences?.some((ref) => ref.kind === 'Rollout' && ref.name === rolloutName),
    ).sort((a, b) => (b.metadata.creationTimestamp ?? '').localeCompare(a.metadata.creationTimestamp ?? '')),
  [runs, rolloutName]);

  if (!rollout?.metadata || !loaded) return <Bullseye><Spinner /></Bullseye>;

  if (rolloutRuns.length === 0) {
    return <EmptyState className="pf-v6-u-mt-md"><EmptyStateBody>{t('No analysis runs found for this rollout.')}</EmptyStateBody></EmptyState>;
  }

  return (
    <Table aria-label={t('AnalysisRuns')} isCompact isStriped className="pf-v6-u-mt-md">
      <Thead><Tr>
        <Th>{t('Name')}</Th>
        <Th>{t('Phase')}</Th>
        <Th>{t('Message')}</Th>
        <Th>{t('Created')}</Th>
      </Tr></Thead>
      <Tbody>
        {rolloutRuns.map((run) => (
          <Tr key={run.metadata.uid}>
            <Td>
              <ResourceLink groupVersionKind={AnalysisRunGroupVersionKind} name={run.metadata.name} namespace={run.metadata.namespace} />
            </Td>
            <Td><Label isCompact color={phaseColor(run.status?.phase)}>{run.status?.phase ?? t('Unknown')}</Label></Td>
            <Td>{run.status?.message ?? '-'}</Td>
            <Td>{run.metadata.creationTimestamp ? new Date(run.metadata.creationTimestamp).toLocaleString() : '-'}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default AnalysisRunsTab;
