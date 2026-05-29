import React from 'react';
import type { FC } from 'react';
import { useK8sWatchResource, DocumentTitle, usePrometheusPoll, PrometheusEndpoint } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  PageSection,
  Title,
  Bullseye,
  Spinner,
  Label,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { ApplicationGroupVersionKind } from '../../models';
import { useCurrentInstance, watchNamespace } from '../../hooks/useArgoCDInstances';
import { decodeBase64 } from '../../utils/application';
import { parsePrometheusGauge } from '../../utils/prometheus';
import type { ApplicationResource } from '../../types';

interface SecretResource {
  metadata: { name: string; namespace: string; labels?: Record<string, string> };
  data?: Record<string, string>;
}

export const RepositoryListPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { instance } = useCurrentInstance();

  const ns = watchNamespace(instance);

  const [secrets, secretsLoaded, secretsError] = useK8sWatchResource<SecretResource[]>({
    groupVersionKind: { group: '', version: 'v1', kind: 'Secret' },
    namespace: ns,
    isList: true,
  });

  const [apps, appsLoaded, appsError] = useK8sWatchResource<ApplicationResource[]>({
    groupVersionKind: ApplicationGroupVersionKind,
    isList: true,
    namespace: ns,
  });

  const loaded = secretsLoaded && appsLoaded;
  const watchError = secretsError || appsError;

  const repoSecrets = (secrets ?? []).filter(
    (s) => s.metadata.labels?.['argocd.argoproj.io/secret-type'] === 'repository',
  );

  const appRepos = new Map<string, { url: string; appCount: number; type: string }>();
  for (const app of apps ?? []) {
    const sources = app.spec?.sources ?? (app.spec?.source ? [app.spec?.source] : []);
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

  const [fetchFailResp, fetchFailLoaded] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: 'sum(argocd_git_fetch_fail_total) by (repo)',
  });

  const fetchFailByRepo = React.useMemo(
    () => parsePrometheusGauge(fetchFailResp, fetchFailLoaded, 'repo'),
    [fetchFailResp, fetchFailLoaded],
  );

  const configuredURLs = new Set(repoSecrets.map((s) => decodeBase64(s.data?.url)));

  const allRepos = [
    ...repoSecrets.map((s) => ({
      url: decodeBase64(s.data?.url),
      type: decodeBase64(s.data?.type) || 'git',
      name: decodeBase64(s.data?.name) || s.metadata.name,
      configured: true,
      appCount: appRepos.get(decodeBase64(s.data?.url))?.appCount ?? 0,
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
        <Title headingLevel="h1" className="pf-v6-u-mb-md">
          {t('Repositories')}
        </Title>
        {watchError && <Alert variant="danger" isInline title={t('Error loading resources')} className="pf-v6-u-mb-md">{(watchError as Error).message}</Alert>}
        {!loaded && !watchError && <Bullseye><Spinner /></Bullseye>}
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
                  <Td><a href={r.url} target="_blank" rel="noopener noreferrer">{r.url}</a></Td>
                  <Td><Label isCompact>{r.type}</Label></Td>
                  <Td>{r.name}</Td>
                  <Td>{r.appCount}</Td>
                  <Td>
                    <Label isCompact color={r.configured ? 'green' : 'grey'}>
                      {r.configured ? t('Configured') : t('Public')}
                    </Label>
                    {fetchFailByRepo.has(r.url) && (
                      <>{' '}<Label isCompact color={fetchFailByRepo.get(r.url)! > 0 ? 'red' : 'green'}>
                        {fetchFailByRepo.get(r.url)! > 0 ? `${t('Fetch errors')} (${fetchFailByRepo.get(r.url)})` : t('Connected')}
                      </Label></>
                    )}
                  </Td>
                </Tr>
              ))}
              {allRepos.length === 0 && (
                <Tr>
                  <Td colSpan={5} className="pf-v6-u-text-align-center">
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
