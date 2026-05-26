import React from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bullseye, Spinner,
  EmptyState, EmptyStateBody,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import type { AppProjectResource } from '../../types';

export const DestsTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const resource = obj as AppProjectResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');
  if (!resource?.metadata) return <Bullseye><Spinner /></Bullseye>;

  const dests = resource?.spec?.destinations ?? [];

  if (dests.length === 0) {
    return <EmptyState className="pf-v6-u-mt-md"><EmptyStateBody>{t('No destinations configured.')}</EmptyStateBody></EmptyState>;
  }

  return (
    <Table aria-label={t('Destinations')} className="pf-v6-u-mt-md">
      <Thead><Tr><Th>{t('Server')}</Th><Th>{t('Namespace')}</Th><Th>{t('Name')}</Th></Tr></Thead>
      <Tbody>{dests.map((d, i) => <Tr key={i}><Td>{d.server ?? '*'}</Td><Td>{d.namespace ?? '*'}</Td><Td>{d.name ?? '-'}</Td></Tr>)}</Tbody>
    </Table>
  );
};

export default DestsTab;
