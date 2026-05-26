import React from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bullseye, Spinner, Label,
  EmptyState, EmptyStateBody,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import type { AppProjectResource } from '../../types';

export const WindowsTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const resource = obj as AppProjectResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');
  if (!resource?.metadata) return <Bullseye><Spinner /></Bullseye>;

  const windows = resource?.spec?.syncWindows ?? [];

  if (windows.length === 0) {
    return <EmptyState className="pf-v6-u-mt-md"><EmptyStateBody>{t('No sync windows configured.')}</EmptyStateBody></EmptyState>;
  }

  return (
    <Table aria-label={t('Sync Windows')} className="pf-v6-u-mt-md">
      <Thead><Tr><Th>{t('Kind')}</Th><Th>{t('Schedule')}</Th><Th>{t('Duration')}</Th><Th>{t('Namespaces')}</Th></Tr></Thead>
      <Tbody>{windows.map((w, i) => (
        <Tr key={i}>
          <Td><Label isCompact color={w.kind === 'allow' ? 'green' : 'red'}>{w.kind}</Label></Td>
          <Td>{w.schedule}</Td>
          <Td>{w.duration ?? '-'}</Td>
          <Td>{w.namespaces?.join(', ') ?? '*'}</Td>
        </Tr>
      ))}</Tbody>
    </Table>
  );
};

export default WindowsTab;
