import React from 'react';
import type { FC } from 'react';
import { useK8sWatchResource, DocumentTitle, usePrometheusPoll, PrometheusEndpoint } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { useCurrentInstance, watchNamespace } from '../../hooks/useArgoCDInstances';
import { decodeBase64 } from '../../utils/application';
import { parsePrometheusGauge } from '../../utils/prometheus';
import {
  PageSection,
  Title,
  Alert,
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

  const ns = watchNamespace(instance);

  const [secrets, loaded, watchError] = useK8sWatchResource<SecretResource[]>({
    groupVersionKind: { group: '', version: 'v1', kind: 'Secret' },
    namespace: ns,
    isList: true,
  });

  const clusterSecrets = (secrets ?? []).filter(
    (s) => s.metadata.labels?.['argocd.argoproj.io/secret-type'] === 'cluster',
  );

  const [clusterStatusResp, clusterStatusLoaded] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: 'argocd_cluster_connection_status',
  });

  const clusterStatusByServer = React.useMemo(
    () => parsePrometheusGauge(clusterStatusResp, clusterStatusLoaded, 'server'),
    [clusterStatusResp, clusterStatusLoaded],
  );

  const clusterStatusLabel = (server: string) => {
    if (!clusterStatusByServer.has(server)) return <Label isCompact color="grey">{t('Unknown')}</Label>;
    return clusterStatusByServer.get(server) === 1
      ? <Label isCompact color="green">{t('Connected')}</Label>
      : <Label isCompact color="red">{t('Disconnected')}</Label>;
  };

  return (
    <>
      <DocumentTitle>{t('Clusters')}</DocumentTitle>
      <PageSection>
        <Title headingLevel="h1" className="pf-v6-u-mb-md">
          {t('Clusters')}
        </Title>
        {watchError && <Alert variant="danger" isInline title={t('Error loading resources')} className="pf-v6-u-mb-md">{(watchError as Error).message}</Alert>}
        {!loaded && !watchError && <Bullseye><Spinner /></Bullseye>}
        {loaded && clusterSecrets.length === 0 && (
          <>
            <EmptyState>
              <EmptyStateBody>
                {t('No external clusters configured. The in-cluster server is always available.')}
              </EmptyStateBody>
            </EmptyState>
            <Alert variant="info" isInline isPlain title={t('Adding clusters')} className="pf-v6-u-mt-md">
              {t('To register an external cluster, use the Argo CD CLI:')}
              <pre className="pf-v6-u-mt-sm pf-v6-u-font-size-sm">argocd cluster add CONTEXT_NAME --name my-cluster</pre>
              {t('This creates a ServiceAccount on the remote cluster and registers it with Argo CD.')}
            </Alert>
          </>
        )}
        {loaded && clusterSecrets.length > 0 && (
          <Table aria-label={t('Clusters')}>
            <Thead>
              <Tr>
                <Th>{t('Name')}</Th>
                <Th>{t('Server')}</Th>
                <Th>{t('Status')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {clusterSecrets.map((s) => {
                const server = decodeBase64(s.data?.server);
                return (
                  <Tr key={s.metadata.name}>
                    <Td>
                      <Label>{decodeBase64(s.data?.name) || s.metadata.name}</Label>
                    </Td>
                    <Td>{server}</Td>
                    <Td>{clusterStatusLabel(server)}</Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </PageSection>
    </>
  );
};

export default ClusterListPage;
