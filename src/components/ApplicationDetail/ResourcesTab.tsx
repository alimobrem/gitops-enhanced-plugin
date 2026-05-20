import type { FC } from 'react';
import { ResourceLink } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { SyncStatusIcon } from '../shared/SyncStatusIcon';
import { HealthStatusIcon } from '../shared/HealthStatusIcon';
import type { ApplicationResource } from '../../types';

export const ResourcesTab: FC<{ app: ApplicationResource }> = ({ app }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const resources = app.status?.resources ?? [];

  if (resources.length === 0) {
    return (
      <EmptyState>
        <EmptyStateBody>{t('No managed resources found.')}</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Table aria-label={t('Managed Resources')}>
      <Thead>
        <Tr>
          <Th>{t('Name')}</Th>
          <Th>{t('Kind')}</Th>
          <Th>{t('Namespace')}</Th>
          <Th>{t('Sync Status')}</Th>
          <Th>{t('Health')}</Th>
        </Tr>
      </Thead>
      <Tbody>
        {resources.map((res) => {
          const gvk = {
            group: res.group ?? '',
            version: res.version,
            kind: res.kind,
          };
          return (
            <Tr key={`${res.kind}-${res.namespace}-${res.name}`}>
              <Td>
                <ResourceLink
                  groupVersionKind={gvk}
                  name={res.name}
                  namespace={res.namespace}
                />
              </Td>
              <Td>{res.kind}</Td>
              <Td>{res.namespace ?? '-'}</Td>
              <Td>
                <SyncStatusIcon status={res.status ?? 'Unknown'} />
              </Td>
              <Td>
                {res.health ? (
                  <HealthStatusIcon status={res.health.status} />
                ) : (
                  '-'
                )}
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
};

export default ResourcesTab;
