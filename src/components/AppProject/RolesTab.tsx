import React from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bullseye, Spinner,
  EmptyState, EmptyStateBody,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import type { AppProjectResource } from '../../types';

export const RolesTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const resource = obj as AppProjectResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');
  if (!resource?.metadata) return <Bullseye><Spinner /></Bullseye>;

  const roles = resource?.spec?.roles ?? [];

  if (roles.length === 0) {
    return <EmptyState className="pf-v6-u-mt-md"><EmptyStateBody>{t('No roles configured.')}</EmptyStateBody></EmptyState>;
  }

  return (
    <Table aria-label={t('Roles')} className="pf-v6-u-mt-md">
      <Thead><Tr><Th>{t('Name')}</Th><Th>{t('Groups')}</Th><Th>{t('Policies')}</Th></Tr></Thead>
      <Tbody>{roles.map((r, i) => (
        <Tr key={i}>
          <Td>{r.name}</Td>
          <Td>{r.groups?.join(', ') ?? '-'}</Td>
          <Td>{r.policies?.length ?? 0} policies</Td>
        </Tr>
      ))}</Tbody>
    </Table>
  );
};

export default RolesTab;
