import React from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import type { ApplicationResource } from '../../types';

export const HistoryTab: FC<{ app: ApplicationResource }> = ({ app }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const history = app.status?.history ?? [];

  if (history.length === 0) {
    return (
      <EmptyState>
        <EmptyStateBody>
          {t('No deployment history available.')}
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Table aria-label={t('Deployment History')}>
      <Thead>
        <Tr>
          <Th>{t('ID')}</Th>
          <Th>{t('Revision')}</Th>
          <Th>{t('Deployed At')}</Th>
          <Th>{t('Source')}</Th>
        </Tr>
      </Thead>
      <Tbody>
        {[...history].reverse().map((entry) => (
          <Tr key={entry.id}>
            <Td>{entry.id}</Td>
            <Td>{entry.revision.substring(0, 7)}</Td>
            <Td>{new Date(entry.deployedAt).toLocaleString()}</Td>
            <Td>{entry.source?.repoURL ?? '-'}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};
