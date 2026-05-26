import React from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bullseye, Spinner,
  EmptyState, EmptyStateBody,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import type { AppProjectResource } from '../../types';

export const ReposTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const resource = obj as AppProjectResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');
  if (!resource?.metadata) return <Bullseye><Spinner /></Bullseye>;

  const repos = resource?.spec?.sourceRepos ?? [];

  if (repos.length === 0) {
    return <EmptyState className="pf-v6-u-mt-md"><EmptyStateBody>{t('No source repositories configured.')}</EmptyStateBody></EmptyState>;
  }

  return (
    <Table aria-label={t('Source Repos')} className="pf-v6-u-mt-md">
      <Thead><Tr><Th>{t('Repository Pattern')}</Th></Tr></Thead>
      <Tbody>{repos.map((r, i) => <Tr key={i}><Td>{r}</Td></Tr>)}</Tbody>
    </Table>
  );
};

export default ReposTab;
