import React from 'react';
import type { FC } from 'react';
import { useK8sWatchResource, DocumentTitle } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
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

export const RepositoryListPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');

  const [secrets, loaded] = useK8sWatchResource<SecretResource[]>({
    groupVersionKind: { group: '', version: 'v1', kind: 'Secret' },
    namespace: 'openshift-gitops',
    isList: true,
  });

  const repoSecrets = (secrets ?? []).filter(
    (s) => s.metadata.labels?.['argocd.argoproj.io/secret-type'] === 'repository',
  );

  const decode = (val?: string) => {
    if (!val) return '';
    try { return atob(val); } catch { return val; }
  };

  return (
    <>
      <DocumentTitle>{t('Repositories')}</DocumentTitle>
      <PageSection>
        <Title headingLevel="h1" style={{ marginBottom: '1rem' }}>
          {t('Repositories')}
        </Title>
        {!loaded && <Bullseye><Spinner /></Bullseye>}
        {loaded && repoSecrets.length === 0 && (
          <EmptyState>
            <EmptyStateBody>{t('No repositories configured.')}</EmptyStateBody>
          </EmptyState>
        )}
        {loaded && repoSecrets.length > 0 && (
          <Table aria-label={t('Repositories')}>
            <Thead>
              <Tr>
                <Th>{t('URL')}</Th>
                <Th>{t('Type')}</Th>
                <Th>{t('Name')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {repoSecrets.map((s) => (
                <Tr key={s.metadata.name}>
                  <Td>{decode(s.data?.url)}</Td>
                  <Td>
                    <Label>{decode(s.data?.type) || 'git'}</Label>
                  </Td>
                  <Td>{decode(s.data?.name) || s.metadata.name}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </PageSection>
    </>
  );
};

export default RepositoryListPage;
