import React from 'react';
import type { FC } from 'react';
import { useK8sWatchResource, ResourceLink } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection,
  EmptyState,
  EmptyStateBody,
  Bullseye,
  Spinner,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { SyncStatusIcon } from '../shared/SyncStatusIcon';
import { HealthStatusIcon } from '../shared/HealthStatusIcon';
import { ApplicationGroupVersionKind } from '../../models';
import type { ApplicationResource } from '../../types';

interface NamespaceGitOpsTabProps {
  obj: { metadata: { name: string } };
}

export const NamespaceGitOpsTab: FC<NamespaceGitOpsTabProps> = ({ obj }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const namespaceName = obj.metadata.name;

  const [apps, loaded] = useK8sWatchResource<ApplicationResource[]>({
    groupVersionKind: ApplicationGroupVersionKind,
    isList: true,
  });

  const nsApps = (apps ?? []).filter(
    (a) => a.spec.destination.namespace === namespaceName,
  );

  if (!loaded) {
    return (
      <PageSection>
        <Bullseye><Spinner /></Bullseye>
      </PageSection>
    );
  }

  if (nsApps.length === 0) {
    return (
      <PageSection>
        <EmptyState>
          <EmptyStateBody>
            {t('No Argo CD applications target this namespace.')}
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <PageSection>
      <Table aria-label={t('GitOps Applications')}>
        <Thead>
          <Tr>
            <Th>{t('Name')}</Th>
            <Th>{t('Project')}</Th>
            <Th>{t('Sync Status')}</Th>
            <Th>{t('Health')}</Th>
            <Th>{t('Repository')}</Th>
          </Tr>
        </Thead>
        <Tbody>
          {nsApps.map((app) => (
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
                <SyncStatusIcon status={app.status?.sync?.status ?? 'Unknown'} />
              </Td>
              <Td>
                <HealthStatusIcon status={app.status?.health?.status ?? 'Unknown'} />
              </Td>
              <Td>{app.spec.source?.repoURL ?? '-'}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </PageSection>
  );
};

export default NamespaceGitOpsTab;
