import React from 'react';
import { useMemo, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrometheusPoll, PrometheusEndpoint } from '@openshift-console/dynamic-plugin-sdk';
import type { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import {
  Bullseye,
  Spinner,
  PageSection,
  Card,
  CardTitle,
  CardBody,
  Grid,
  GridItem,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Label,
  EmptyState,
  EmptyStateBody,
} from '@patternfly/react-core';
import type { ApplicationResource } from '../../types';

function parseScalar(response: PrometheusResponse | undefined): string | null {
  return response?.data?.result?.[0]?.value?.[1] ?? null;
}

const useAppMetric = (appName: string, query: string): [string | null, boolean] => {
  const fullQuery = query.replace(/APPNAME/g, appName);
  const [resp, loaded] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: fullQuery,
  });
  if (!loaded) return [null, false];
  return [parseScalar(resp), true];
};

export const MetricsTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');

  const app = obj as ApplicationResource | undefined;
  const appName = app?.metadata?.name ?? '';
  const appNs = app?.metadata?.namespace ?? '';
  const resources = app?.status?.resources ?? [];

  const [totalSyncs, totalSyncsLoaded] = useAppMetric(
    appName,
    `sum(argocd_app_sync_total{namespace="${appNs}",name="APPNAME"})`,
  );
  const [successSyncs, successSyncsLoaded] = useAppMetric(
    appName,
    `sum(argocd_app_sync_total{namespace="${appNs}",name="APPNAME",phase="Succeeded"})`,
  );
  const [failedSyncs, failedSyncsLoaded] = useAppMetric(
    appName,
    `sum(argocd_app_sync_total{namespace="${appNs}",name="APPNAME",phase=~"Error|Failed"})`,
  );
  const [reconcileCount, reconcileCountLoaded] = useAppMetric(
    appName,
    `sum(increase(argocd_app_reconcile_count{namespace="${appNs}",name="APPNAME"}[1h]))`,
  );
  const [avgReconcile, avgReconcileLoaded] = useAppMetric(
    appName,
    `avg(argocd_app_reconcile_bucket{namespace="${appNs}",name="APPNAME",le="10"})`,
  );

  const allLoaded = totalSyncsLoaded && successSyncsLoaded && failedSyncsLoaded && reconcileCountLoaded && avgReconcileLoaded;
  const allNull = totalSyncs === null && successSyncs === null && failedSyncs === null && reconcileCount === null && avgReconcile === null;

  const syncRate = useMemo(() => {
    if (totalSyncs === null || successSyncs === null) return null;
    const total = parseFloat(totalSyncs);
    const success = parseFloat(successSyncs);
    if (isNaN(total) || isNaN(success) || total === 0) return null;
    return Math.round((success / total) * 100);
  }, [totalSyncs, successSyncs]);

  const outOfSyncCount = useMemo(
    () => resources.filter((r) => r.status === 'OutOfSync').length,
    [resources],
  );

  if (!allLoaded) {
    return (
      <PageSection>
        <Bullseye><Spinner /></Bullseye>
      </PageSection>
    );
  }

  if (allNull) {
    return (
      <PageSection>
        <EmptyState>
          <EmptyStateBody>{t('Metrics unavailable')}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  const formatVal = (val: string | null): string => {
    if (val === null) return '-';
    const n = parseFloat(val);
    return isNaN(n) ? '-' : String(Math.round(n));
  };

  return (
    <PageSection>
      <Grid hasGutter>
        <GridItem span={4}>
          <Card>
            <CardTitle>{t('Sync Activity')}</CardTitle>
            <CardBody>
              <DescriptionList isCompact>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Total Syncs')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label isCompact color="blue">{formatVal(totalSyncs)}</Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Successful Syncs')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label isCompact color="green">{formatVal(successSyncs)}</Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Failed Syncs')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label isCompact color={failedSyncs !== null && parseFloat(failedSyncs) > 0 ? 'red' : 'green'}>{formatVal(failedSyncs)}</Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Sync Success Rate')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    {syncRate !== null ? (
                      <Label isCompact color={syncRate >= 90 ? 'green' : syncRate >= 50 ? 'gold' : 'red'}>{syncRate}%</Label>
                    ) : (
                      <span>-</span>
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem span={4}>
          <Card>
            <CardTitle>{t('Reconciliation')}</CardTitle>
            <CardBody>
              <DescriptionList isCompact>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Reconciliations (1h)')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label isCompact color="blue">{formatVal(reconcileCount)}</Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Avg Duration')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label isCompact color="blue">{formatVal(avgReconcile)}</Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem span={4}>
          <Card>
            <CardTitle>{t('Resource Health')}</CardTitle>
            <CardBody>
              <DescriptionList isCompact>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Health')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label isCompact color={app?.status?.health?.status === 'Healthy' ? 'green' : app?.status?.health?.status === 'Degraded' ? 'red' : 'gold'}>
                      {app?.status?.health?.status ?? t('Unknown')}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Sync Status')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label isCompact color={app?.status?.sync?.status === 'Synced' ? 'green' : 'gold'}>
                      {app?.status?.sync?.status ?? t('Unknown')}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Managed Resources')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label isCompact color="blue">{resources.length}</Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('OutOfSync Resources')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label isCompact color={outOfSyncCount > 0 ? 'gold' : 'green'}>{outOfSyncCount}</Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </PageSection>
  );
};

export default MetricsTab;
