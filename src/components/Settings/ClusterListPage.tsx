import React from 'react';
import type { FC } from 'react';
import { useK8sWatchResource, DocumentTitle } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { useCurrentInstance } from '../../hooks/useArgoCDInstances';
import {
  PageSection,
  Title,
  Bullseye,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Label,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';

interface SecretResource {
  metadata: { name: string; namespace: string; labels?: Record<string, string> };
  data?: Record<string, string>;
}

export const ClusterListPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { instance } = useCurrentInstance();

  const [secrets, loaded] = useK8sWatchResource<SecretResource[]>({
    groupVersionKind: { group: '', version: 'v1', kind: 'Secret' },
    namespace: instance.namespace,
    isList: true,
  });

  const clusterSecrets = (secrets ?? []).filter(
    (s) => s.metadata.labels?.['argocd.argoproj.io/secret-type'] === 'cluster',
  );

  const decode = (val?: string) => {
    if (!val) return '';
    try { return atob(val); } catch { return val; }
  };

  return (
    <>
      <DocumentTitle>{t('Clusters')}</DocumentTitle>
      <PageSection>
        <Title headingLevel="h1" style={{ marginBottom: '1rem' }}>
          {t('Clusters')}
        </Title>
        {!loaded && <Bullseye><Spinner /></Bullseye>}
        {loaded && clusterSecrets.length === 0 && (
          <EmptyState>
            <EmptyStateBody>
              {t('No external clusters configured. The in-cluster server is always available.')}
            </EmptyStateBody>
          </EmptyState>
        )}
        {loaded && clusterSecrets.length > 0 && (
          <Table aria-label={t('Clusters')}>
            <Thead>
              <Tr>
                <Th>{t('Name')}</Th>
                <Th>{t('Server')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {clusterSecrets.map((s) => (
                <Tr key={s.metadata.name}>
                  <Td>
                    <Label>{decode(s.data?.name) || s.metadata.name}</Label>
                  </Td>
                  <Td>{decode(s.data?.server)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </PageSection>
    </>
  );
};

export default ClusterListPage;
