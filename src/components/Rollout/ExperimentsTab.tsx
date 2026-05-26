import React from 'react';
import { useMemo, type FC } from 'react';
import { useK8sWatchResource, ResourceLink } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Bullseye, Spinner, EmptyState, EmptyStateBody, Label,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { ExperimentGroupVersionKind } from '../../models';
import type { RolloutResource } from '../../types';

interface ExperimentResource {
  metadata: { name: string; namespace: string; uid: string; creationTimestamp?: string; ownerReferences?: Array<{ name: string; kind: string }> };
  status?: { phase?: string; message?: string };
}

export const ExperimentsTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const rollout = obj as RolloutResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');

  const [experiments, loaded] = useK8sWatchResource<ExperimentResource[]>({
    groupVersionKind: ExperimentGroupVersionKind,
    namespace: rollout?.metadata?.namespace ?? '',
    isList: true,
  });

  const rolloutName = rollout?.metadata?.name ?? '';
  const rolloutExperiments = useMemo(() =>
    (experiments ?? []).filter((e) =>
      e.metadata.ownerReferences?.some((ref) => ref.kind === 'Rollout' && ref.name === rolloutName),
    ).sort((a, b) => (b.metadata.creationTimestamp ?? '').localeCompare(a.metadata.creationTimestamp ?? '')),
  [experiments, rolloutName]);

  if (!rollout?.metadata || !loaded) return <Bullseye><Spinner /></Bullseye>;

  if (rolloutExperiments.length === 0) {
    return <EmptyState className="pf-v6-u-mt-md"><EmptyStateBody>{t('No experiments found for this rollout.')}</EmptyStateBody></EmptyState>;
  }

  const phaseColor = (phase?: string): 'green' | 'red' | 'blue' | 'grey' => {
    switch (phase) {
      case 'Successful': return 'green';
      case 'Failed': case 'Error': return 'red';
      case 'Running': case 'Pending': return 'blue';
      default: return 'grey';
    }
  };

  return (
    <Table aria-label={t('Experiments')} isCompact isStriped className="pf-v6-u-mt-md">
      <Thead><Tr>
        <Th>{t('Name')}</Th>
        <Th>{t('Phase')}</Th>
        <Th>{t('Message')}</Th>
        <Th>{t('Created')}</Th>
      </Tr></Thead>
      <Tbody>
        {rolloutExperiments.map((exp) => (
          <Tr key={exp.metadata.uid}>
            <Td>
              <ResourceLink groupVersionKind={ExperimentGroupVersionKind} name={exp.metadata.name} namespace={exp.metadata.namespace} />
            </Td>
            <Td><Label isCompact color={phaseColor(exp.status?.phase)}>{exp.status?.phase ?? t('Unknown')}</Label></Td>
            <Td>{exp.status?.message ?? '-'}</Td>
            <Td>{exp.metadata.creationTimestamp ? new Date(exp.metadata.creationTimestamp).toLocaleString() : '-'}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default ExperimentsTab;
