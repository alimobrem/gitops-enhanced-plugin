import React from 'react';
import type { FC } from 'react';
import { useK8sWatchResource, DocumentTitle } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection,
  Title,
  Bullseye,
  Spinner,
  Label,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { ApplicationGroupVersionKind } from '../../models';
import type { ApplicationResource } from '../../types';

interface SecretResource {
  metadata: { name: string; namespace: string; labels?: Record<string, string> };
  data?: Record<string, string>;
}

export const RepositoryListPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');

  const [secrets, secretsLoaded] = useK8sWatchResource<SecretResource[]>({
    groupVersionKind: { group: '', version: 'v1', kind: 'Secret' },
    namespace: 'openshift-gitops',
    isList: true,
  });

  const [apps, appsLoaded] = useK8sWatchResource<ApplicationResource[]>({
    groupVersionKind: ApplicationGroupVersionKind,
    isList: true,
  });

  const loaded = secretsLoaded && appsLoaded;

  const repoSecrets = (secrets ?? []).filter(
    (s) => s.metadata.labels?.['argocd.argoproj.io/secret-type'] === 'repository',
  );

  const decode = (val?: string) => {
    if (!val) return '';
    try { return atob(val); } catch { return val; }
  };

  const appRepos = new Map<string, { url: string; appCount: number; type: string }>();
  for (const app of apps ?? []) {
    const sources = app.spec.sources ?? (app.spec.source ? [app.spec.source] : []);
    for (const src of sources) {
      const existing = appRepos.get(src.repoURL);
      const type = src.chart ? 'helm' : 'git';
      if (existing) {
        existing.appCount++;
      } else {
        appRepos.set(src.repoURL, { url: src.repoURL, appCount: 1, type });
      }
    }
  }

  const configuredURLs = new Set(repoSecrets.map((s) => decode(s.data?.url)));

  const allRepos = [
    ...repoSecrets.map((s) => ({
      url: decode(s.data?.url),
      type: decode(s.data?.type) || 'git',
      name: decode(s.data?.name) || s.metadata.name,
      configured: true,
      appCount: appRepos.get(decode(s.data?.url))?.appCount ?? 0,
    })),
    ...[...appRepos.entries()]
      .filter(([url]) => !configuredURLs.has(url))
      .map(([url, info]) => ({
        url,
        type: info.type,
        name: '-',
        configured: false,
        appCount: info.appCount,
      })),
  ];

  return (
    <React.Fragment>
      <DocumentTitle>{t('Repositories')}</DocumentTitle>
      <PageSection>
        <Title headingLevel="h1" style={{ marginBottom: '1rem' }}>
          {t('Repositories')}
        </Title>
        {!loaded && <Bullseye><Spinner /></Bullseye>}
        {loaded && (
          <Table aria-label={t('Repositories')}>
            <Thead>
              <Tr>
                <Th>{t('URL')}</Th>
                <Th>{t('Type')}</Th>
                <Th>{t('Name')}</Th>
                <Th>{t('Applications')}</Th>
                <Th>{t('Status')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {allRepos.map((r) => (
                <Tr key={r.url}>
                  <Td>{r.url}</Td>
                  <Td><Label isCompact>{r.type}</Label></Td>
                  <Td>{r.name}</Td>
                  <Td>{r.appCount}</Td>
                  <Td>
                    <Label isCompact color={r.configured ? 'green' : 'grey'}>
                      {r.configured ? t('Configured') : t('Public')}
                    </Label>
                  </Td>
                </Tr>
              ))}
              {allRepos.length === 0 && (
                <Tr>
                  <Td colSpan={5} style={{ textAlign: 'center' }}>
                    {t('No repositories found.')}
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        )}
      </PageSection>
    </React.Fragment>
  );
};

export default RepositoryListPage;
