import type { FC } from 'react';
import {
  DocumentTitle,
  ListPageHeader,
  ResourceLink,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection,
  Bullseye,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Alert,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { useApplications } from '../../hooks/useApplications';
import { SyncStatusIcon } from '../shared/SyncStatusIcon';
import { HealthStatusIcon } from '../shared/HealthStatusIcon';
import { ApplicationGroupVersionKind } from '../../models';
import type { ApplicationResource } from '../../types';

export const ApplicationListPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [applications, loaded, error] = useApplications();

  return (
    <>
      <DocumentTitle>{t('Applications')}</DocumentTitle>
      <ListPageHeader title={t('Applications')} />
      <PageSection>
        {error && (
          <Alert variant="danger" isInline title={t('Error loading applications')}>
            {error.message}
          </Alert>
        )}
        {!loaded && !error && (
          <Bullseye>
            <Spinner />
          </Bullseye>
        )}
        {loaded && applications.length === 0 && !error && (
          <EmptyState>
            <EmptyStateBody>
              {t('No Argo CD applications found.')}
            </EmptyStateBody>
          </EmptyState>
        )}
        {loaded && applications.length > 0 && (
          <Table aria-label={t('Applications')}>
            <Thead>
              <Tr>
                <Th>{t('Name')}</Th>
                <Th>{t('Project')}</Th>
                <Th>{t('Sync Status')}</Th>
                <Th>{t('Health')}</Th>
                <Th>{t('Repository')}</Th>
                <Th>{t('Destination')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {applications.map((app: ApplicationResource) => (
                <Tr key={app.metadata.uid}>
                  <Td>
                    <ResourceLink
                      groupVersionKind={ApplicationGroupVersionKind}
                      name={app.metadata.name}
                      namespace={app.metadata.namespace}
                    />
                  </Td>
                  <Td>{app.spec.project}</Td>
                  <Td>
                    <SyncStatusIcon
                      status={app.status?.sync?.status ?? 'Unknown'}
                    />
                  </Td>
                  <Td>
                    <HealthStatusIcon
                      status={app.status?.health?.status ?? 'Unknown'}
                    />
                  </Td>
                  <Td>
                    {app.spec.source?.repoURL ??
                      app.spec.sources?.[0]?.repoURL ??
                      '-'}
                  </Td>
                  <Td>{`${app.spec.destination.name ?? app.spec.destination.server ?? ''} / ${app.spec.destination.namespace ?? ''}`}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </PageSection>
    </>
  );
};

export default ApplicationListPage;
