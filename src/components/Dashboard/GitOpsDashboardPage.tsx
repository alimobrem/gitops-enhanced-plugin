import React from 'react';
import { useMemo, type FC } from 'react';
import {
  useK8sWatchResource,
  DocumentTitle,
  ResourceLink,
  usePrometheusPoll,
  PrometheusEndpoint,
} from '@openshift-console/dynamic-plugin-sdk';
import type { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection,
  Title,
  Card,
  CardTitle,
  CardBody,
  Grid,
  GridItem,
  Flex,
  FlexItem,
  Spinner,
  Bullseye,
  Alert,
  Label,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Divider,
} from '@patternfly/react-core';
import { ChartDonutUtilization, ChartArea, Chart, ChartAxis, ChartGroup, ChartVoronoiContainer } from '@patternfly/react-charts/victory';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@patternfly/react-icons';
import {
  ApplicationGroupVersionKind,
  ApplicationSetGroupVersionKind,
  AppProjectGroupVersionKind,
  ArgoCDGroupVersionKind,
  RolloutGroupVersionKind,
  RolloutManagerGroupVersionKind,
} from '../../models';
import { SyncStatusIcon } from '../shared/SyncStatusIcon';
import { HealthStatusIcon } from '../shared/HealthStatusIcon';
import { InstancePicker } from '../shared/InstancePicker';
import { InstanceProvider } from '../shared/InstanceProvider';
import { DismissibleAlert } from '../shared/DismissibleAlert';
import { useCurrentInstance, watchNamespace } from '../../hooks/useArgoCDInstances';
import { isWindowActive } from '../../utils/sync-windows';
import { timeAgo } from '../../utils/time';
import { phaseColor } from '../../utils/status';
import { parsePrometheusScalar, parsePrometheusRange } from '../../utils/prometheus';
import type { ApplicationResource } from '../../types';
import {
  FLEX_SPACE_XS,
  FLEX_SPACE_SM,
  FLEX_SPACE_MD,
  FLEX_ALIGN_CENTER,
  FLEX_COLUMN,
  FLEX_JUSTIFY_BETWEEN,
  FLEX_JUSTIFY_EVENLY,
  DIVIDER_VERTICAL,
} from '../../utils/pf-constants';
import './GitOpsDashboardPage.css';
import './GitOpsDashboardCharts.css';

const SYNC_CHART_STYLE = { data: { fill: '#3e8635', fillOpacity: 0.15, stroke: '#3e8635' } };
const RECONCILE_CHART_STYLE = { data: { fill: '#06c', fillOpacity: 0.15, stroke: '#06c' } };
const CHART_PADDING = { top: 10, right: 10, bottom: 30, left: 40 };
const DONUT_THRESHOLDS = [{ value: 80, color: '#f0ab00' }, { value: 60, color: '#c9190b' }];
const formatTimeTick = (tick: unknown) =>
  tick instanceof Date ? tick.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : String(tick);

function donutColorScale(pct: number): string[] {
  if (pct === 100) return ['#3e8635', '#d2d2d2'];
  return pct > 80 ? ['#f0ab00', '#d2d2d2'] : ['#c9190b', '#d2d2d2'];
}

export const GitOpsDashboardPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { instance } = useCurrentInstance();

  const ns = watchNamespace(instance);
  const [apps, appsLoaded, appsError] = useK8sWatchResource<ApplicationResource[]>({
    groupVersionKind: ApplicationGroupVersionKind,
    isList: true,
    ...(ns ? { namespace: ns } : {}),
  });
  const [appsets, , appsetsError] = useK8sWatchResource<Array<Record<string, unknown>>>({
    groupVersionKind: ApplicationSetGroupVersionKind,
    isList: true,
    ...(ns ? { namespace: ns } : {}),
  });
  const [projects, , projectsError] = useK8sWatchResource<Array<Record<string, unknown>>>({
    groupVersionKind: AppProjectGroupVersionKind,
    isList: true,
    ...(ns ? { namespace: ns } : {}),
  });
  const [instances, , instancesError] = useK8sWatchResource<Array<Record<string, unknown>>>({
    groupVersionKind: ArgoCDGroupVersionKind,
    isList: true,
  });

  const [rollouts, , _rolloutsError] = useK8sWatchResource<Array<Record<string, unknown>>>({
    groupVersionKind: RolloutGroupVersionKind,
    isList: true,
  });
  const [rolloutManagers, , _rmError] = useK8sWatchResource<Array<Record<string, unknown>>>({
    groupVersionKind: RolloutManagerGroupVersionKind,
    isList: true,
  });
  const [csvs, , _csvsError] = useK8sWatchResource<Array<Record<string, unknown>>>({
    groupVersionKind: { group: 'operators.coreos.com', version: 'v1alpha1', kind: 'ClusterServiceVersion' },
    isList: true,
    namespace: ns ?? 'openshift-gitops',
  });

  const csvKey = useMemo(() => (csvs ?? []).map((c) => (c.metadata as Record<string, string>)?.name).join(','), [csvs]);
  const gitopsOperator = useMemo(() => {
    const csv = (csvs ?? []).find((c) => {
      const name = (c.metadata as Record<string, string>)?.name ?? '';
      return name.startsWith('openshift-gitops-operator') || name.startsWith('gitops-operator');
    });
    if (!csv) return null;
    const meta = csv.metadata as Record<string, string>;
    const status = csv.status as Record<string, string> | undefined;
    return { name: meta.name, phase: status?.phase ?? 'Unknown', version: (csv.spec as Record<string, string>)?.version ?? '' };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csvKey]);

  const rolloutCount = (rollouts ?? []).length;
  const rmKey = useMemo(() => (rolloutManagers ?? []).map((r) => `${(r.metadata as Record<string, string>)?.uid}:${(r.status as Record<string, string>)?.phase}`).join(','), [rolloutManagers]);
  const stableRolloutManagers = useMemo(() => (rolloutManagers ?? []).map((rm) => {
    const meta = rm.metadata as Record<string, string>;
    const status = rm.status as Record<string, string> | undefined;
    return { uid: meta.uid, name: meta.name, namespace: meta.namespace, phase: status?.phase ?? 'Unknown' };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [rmKey]);
  const instancesKey = useMemo(() => (instances ?? []).map((i) => `${(i.metadata as Record<string, string>)?.uid}:${(i.status as Record<string, string>)?.phase}`).join(','), [instances]);
  const stableInstances = useMemo(() => (instances ?? []).map((inst) => {
    const meta = inst.metadata as Record<string, string>;
    const status = inst.status as Record<string, string> | undefined;
    return { uid: meta.uid, name: meta.name, namespace: meta.namespace, phase: status?.phase ?? 'Unknown' };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [instancesKey]);

  const errors = useMemo(
    () => [appsError, appsetsError, projectsError, instancesError].filter(Boolean) as Error[],
    [appsError, appsetsError, projectsError, instancesError],
  );

  const activeDenyProjects = useMemo(() => {
    return (projects ?? []).filter((p) => {
      const spec = p.spec as { syncWindows?: Array<{ kind: string; schedule: string; duration?: string }> } | undefined;
      const windows = spec?.syncWindows ?? [];
      return windows.some((w) => w.kind === 'deny' && isWindowActive(w));
    }).map((p) => (p.metadata as Record<string, string>)?.name);
  }, [projects]);

  const allApps = apps ?? [];
  const appsKey = allApps.map((a) => `${a.metadata.uid}:${a.status?.sync?.status}:${a.status?.health?.status}:${a.status?.operationState?.phase}`).join('|');

  const computed = useMemo(() => {
    const total = allApps.length;
    const synced = allApps.filter((a) => a.status?.sync?.status === 'Synced').length;
    const outOfSync = allApps.filter((a) => a.status?.sync?.status === 'OutOfSync').length;
    const healthy = allApps.filter((a) => a.status?.health?.status === 'Healthy').length;
    const degraded = allApps.filter((a) => a.status?.health?.status === 'Degraded').length;
    const progressing = allApps.filter((a) => a.status?.health?.status === 'Progressing').length;
    const suspended = allApps.filter((a) => a.status?.health?.status === 'Suspended').length;
    const missing = allApps.filter((a) => a.status?.health?.status === 'Missing').length;

    const needsAttention = allApps.filter((a) =>
      a.status?.health?.status === 'Degraded'
      || a.status?.health?.status === 'Missing'
      || a.status?.sync?.status === 'OutOfSync'
      || a.status?.operationState?.phase === 'Error'
      || a.status?.operationState?.phase === 'Failed'
      || (a.status?.conditions?.length ?? 0) > 0,
    );

    const recentOps = allApps
      .filter((a) => a.status?.operationState?.finishedAt)
      .sort((a, b) => (b.status?.operationState?.finishedAt ?? '').localeCompare(a.status?.operationState?.finishedAt ?? ''))
      .slice(0, 5);

    return { total, synced, outOfSync, healthy, degraded, progressing, suspended, missing, needsAttention, recentOps };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appsKey]);

  const { total, synced, outOfSync, healthy, degraded, progressing, suspended, missing, needsAttention, recentOps } = computed;

  const nsFilter = ns ? `namespace="${ns}"` : '';
  const nsComma = nsFilter ? `${nsFilter},` : '';

  const [syncSuccessResp, syncSuccessLoaded] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: `sum(argocd_app_sync_total{${nsComma}phase="Succeeded"}) / sum(argocd_app_sync_total{${nsFilter}}) * 100`,
  });
  const [failedSyncsResp, failedSyncsLoaded] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: `sum(increase(argocd_app_sync_total{${nsComma}phase=~"Error|Failed"}[24h]))`,
  });
  const [reconcileResp, reconcileLoaded] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: `sum(increase(argocd_app_reconcile_count{${nsFilter}}[1h]))`,
  });
  const [clusterConnResp, clusterConnLoaded] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: `sum(argocd_cluster_connection_status{${nsFilter}})`,
  });
  const [clusterTotalResp, clusterTotalLoaded] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: `count(argocd_cluster_connection_status{${nsFilter}})`,
  });
  const [pendingRepoResp, pendingRepoLoaded] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: `sum(argocd_repo_pending_request_total{${nsFilter}})`,
  });
  const [gitFetchFailResp, gitFetchFailLoaded] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: `sum(increase(argocd_git_fetch_fail_total{${nsFilter}}[24h]))`,
  });

  const [syncRangeResp] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY_RANGE,
    query: `sum(increase(argocd_app_sync_total{${nsFilter}}[1h]))`,
    timespan: 86400,
  });
  const [reconcileRangeResp] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY_RANGE,
    query: `sum(increase(argocd_app_reconcile_count{${nsFilter}}[1h]))`,
    timespan: 86400,
  });

  const syncChartData = useMemo(
    () => parsePrometheusRange(syncRangeResp as PrometheusResponse | undefined),
    [syncRangeResp],
  );

  const reconcileChartData = useMemo(
    () => parsePrometheusRange(reconcileRangeResp as PrometheusResponse | undefined),
    [reconcileRangeResp],
  );

  if (!appsLoaded && errors.length === 0) {
    return (
      <React.Fragment>
        <DocumentTitle>{t('GitOps Dashboard')}</DocumentTitle>
        <PageSection><Bullseye><Spinner /></Bullseye></PageSection>
      </React.Fragment>
    );
  }

  const syncPct = total > 0 ? Math.round((synced / total) * 100) : 0;
  const healthPct = total > 0 ? Math.round((healthy / total) * 100) : 0;
  const syncSuccess = parsePrometheusScalar(syncSuccessResp);
  const failedSyncs = parsePrometheusScalar(failedSyncsResp);
  const reconciliations = parsePrometheusScalar(reconcileResp);
  const clusterConn = parsePrometheusScalar(clusterConnResp);
  const clusterTotal = parsePrometheusScalar(clusterTotalResp);
  const pendingRepo = parsePrometheusScalar(pendingRepoResp);
  const gitFetchFail = parsePrometheusScalar(gitFetchFailResp);

  return (
    <React.Fragment>
      <DocumentTitle>{t('GitOps Dashboard')}</DocumentTitle>
      <PageSection>
        <Flex justifyContent={FLEX_JUSTIFY_BETWEEN} alignItems={FLEX_ALIGN_CENTER} className="pf-v6-u-mb-lg">
          <FlexItem><Title headingLevel="h1">{t('GitOps Overview')}</Title></FlexItem>
          <FlexItem><InstancePicker /></FlexItem>
        </Flex>

        {errors.length > 0 && errors.map((err, i) => (
          <Alert key={i} variant="danger" isInline title={t('Error loading resources')} className="pf-v6-u-mb-md">
            {err.message}
          </Alert>
        ))}

        {activeDenyProjects.length > 0 && (
          <DismissibleAlert variant="warning" title={t('Sync window active')}>
            {t('A deny sync window is currently active on project {{project}}', { project: activeDenyProjects.join(', ') })}
          </DismissibleAlert>
        )}

        <Grid hasGutter>
          {/* Row 1: Summary strip */}
          <GridItem span={12}>
            <Card>
              <CardBody>
                <Flex justifyContent={FLEX_JUSTIFY_EVENLY} alignItems={FLEX_ALIGN_CENTER}>
                  <FlexItem>
                    <div className="gitops-dashboard__stat">
                      <div className="gitops-dashboard__stat-value">{total}</div>
                      <div className="gitops-dashboard__stat-label">{t('Applications')}</div>
                    </div>
                  </FlexItem>
                  <Divider orientation={DIVIDER_VERTICAL} />
                  <FlexItem>
                    <div className="gitops-dashboard__stat">
                      <Flex alignItems={FLEX_ALIGN_CENTER} spaceItems={FLEX_SPACE_SM}>
                        <FlexItem><CheckCircleIcon className="gitops-dashboard__icon--success" /></FlexItem>
                        <FlexItem><span className="gitops-dashboard__stat-value">{syncPct}%</span></FlexItem>
                      </Flex>
                      <div className="gitops-dashboard__stat-label">{t('Synced')}</div>
                    </div>
                  </FlexItem>
                  <Divider orientation={DIVIDER_VERTICAL} />
                  <FlexItem>
                    <div className="gitops-dashboard__stat">
                      <Flex alignItems={FLEX_ALIGN_CENTER} spaceItems={FLEX_SPACE_SM}>
                        <FlexItem><CheckCircleIcon className="gitops-dashboard__icon--success" /></FlexItem>
                        <FlexItem><span className="gitops-dashboard__stat-value">{healthPct}%</span></FlexItem>
                      </Flex>
                      <div className="gitops-dashboard__stat-label">{t('Healthy')}</div>
                    </div>
                  </FlexItem>
                  <Divider orientation={DIVIDER_VERTICAL} />
                  <FlexItem>
                    <div className="gitops-dashboard__stat">
                      <div className="gitops-dashboard__stat-value">{needsAttention.length}</div>
                      <div className={`gitops-dashboard__stat-label${needsAttention.length > 0 ? ' gitops-dashboard__stat-label--danger' : ''}`}>{t('Needs Attention')}</div>
                    </div>
                  </FlexItem>
                  <Divider orientation={DIVIDER_VERTICAL} />
                  <FlexItem>
                    <div className="gitops-dashboard__stat">
                      <Flex spaceItems={FLEX_SPACE_MD}>
                        <FlexItem><span className="gitops-dashboard__stat-value-sm">{appsets?.length ?? 0}</span> <span className="gitops-dashboard__stat-label-inline">{t('AppSets')}</span></FlexItem>
                        <FlexItem><span className="gitops-dashboard__stat-value-sm">{projects?.length ?? 0}</span> <span className="gitops-dashboard__stat-label-inline">{t('Projects')}</span></FlexItem>
                        <FlexItem><span className="gitops-dashboard__stat-value-sm">{instances?.length ?? 0}</span> <span className="gitops-dashboard__stat-label-inline">{t('Instances')}</span></FlexItem>
                      </Flex>
                    </div>
                  </FlexItem>
                </Flex>
              </CardBody>
            </Card>
          </GridItem>

          {/* Row 2: Needs Attention (if any) */}
          {needsAttention.length > 0 && (
            <GridItem span={12}>
              <Card>
                <CardTitle>
                  <Flex alignItems={FLEX_ALIGN_CENTER} spaceItems={FLEX_SPACE_SM}>
                    <FlexItem><ExclamationTriangleIcon className="gitops-dashboard__icon--warning" /></FlexItem>
                    <FlexItem>{t('Needs Attention')} ({needsAttention.length})</FlexItem>
                  </Flex>
                </CardTitle>
                <CardBody>
                  <Table aria-label={t('Needs Attention')} isCompact isStriped>
                    <Thead><Tr>
                      <Th>{t('Name')}</Th>
                      <Th>{t('Sync Status')}</Th>
                      <Th>{t('Health')}</Th>
                      <Th>{t('Last Operation')}</Th>
                      <Th>{t('Issue')}</Th>
                    </Tr></Thead>
                    <Tbody>
                      {needsAttention.map((app) => {
                        const issues: string[] = [];
                        if (app.status?.health?.status === 'Degraded') issues.push(t('Degraded'));
                        if (app.status?.health?.status === 'Missing') issues.push(t('Missing'));
                        if (app.status?.sync?.status === 'OutOfSync') issues.push(t('OutOfSync'));
                        if (app.status?.operationState?.phase === 'Error' || app.status?.operationState?.phase === 'Failed') {
                          issues.push(app.status.operationState.message ?? t('Operation failed'));
                        }
                        if (app.status?.conditions?.length) {
                          issues.push(...app.status.conditions.map((c) => c.message).slice(0, 2));
                        }
                        return (
                          <Tr key={app.metadata.uid}>
                            <Td>
                              <ResourceLink groupVersionKind={ApplicationGroupVersionKind} name={app.metadata.name} namespace={app.metadata.namespace} />
                            </Td>
                            <Td><SyncStatusIcon status={app.status?.sync?.status ?? 'Unknown'} /></Td>
                            <Td><HealthStatusIcon status={app.status?.health?.status ?? 'Unknown'} /></Td>
                            <Td>
                              {app.status?.operationState?.phase && (
                                <Label isCompact color={phaseColor(app.status.operationState.phase)}>{app.status.operationState.phase}</Label>
                              )}
                            </Td>
                            <Td className="gitops-dashboard__issue-cell">{issues.join('; ') || '-'}</Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </CardBody>
              </Card>
            </GridItem>
          )}

          {/* Row 3: Donut charts + Operational Metrics */}
          <GridItem span={3}>
            <Card className="gitops-dashboard__chart-card">
              <CardTitle>{t('Sync Status')}</CardTitle>
              <CardBody>
                <div className="gitops-dashboard__donut-container">
                  <ChartDonutUtilization
                    data={{ x: t('Synced'), y: syncPct }}
                    title={`${syncPct}%`}
                    subTitle={t('Synced')}
                    height={150}
                    width={150}
                    thresholds={DONUT_THRESHOLDS}
                    colorScale={donutColorScale(syncPct)}
                  />
                  <div className="gitops-dashboard__donut-count">{synced}/{total} {t('Synced')}</div>
                </div>
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={3}>
            <Card className="gitops-dashboard__chart-card">
              <CardTitle>{t('Health Status')}</CardTitle>
              <CardBody>
                <div className="gitops-dashboard__donut-container">
                  <ChartDonutUtilization
                    data={{ x: t('Healthy'), y: healthPct }}
                    title={`${healthPct}%`}
                    subTitle={t('Healthy')}
                    height={150}
                    width={150}
                    thresholds={DONUT_THRESHOLDS}
                    colorScale={donutColorScale(healthPct)}
                  />
                  <div className="gitops-dashboard__donut-count">{healthy}/{total} {t('Healthy')}</div>
                </div>
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={6}>
            <Card className="gitops-dashboard__chart-card">
              <CardTitle>{t('Operational Metrics')}</CardTitle>
              <CardBody>
                <Grid hasGutter>
                  <GridItem span={6}>
                    <DescriptionList isCompact>
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Sync Success Rate')}</DescriptionListTerm>
                        <DescriptionListDescription>
                          {syncSuccessLoaded && syncSuccess !== null ? (
                            <Label isCompact color={syncSuccess >= 90 ? 'green' : syncSuccess >= 50 ? 'gold' : 'red'}>{Math.round(syncSuccess)}%</Label>
                          ) : syncSuccessLoaded ? (
                            <span className="gitops-dashboard__empty-text">{t('Metrics unavailable')}</span>
                          ) : <Spinner size="sm" />}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Failed Syncs (24h)')}</DescriptionListTerm>
                        <DescriptionListDescription>
                          {failedSyncsLoaded && failedSyncs !== null ? (
                            <Label isCompact color={failedSyncs > 0 ? 'red' : 'green'}>{Math.round(failedSyncs)}</Label>
                          ) : failedSyncsLoaded ? (
                            <span className="gitops-dashboard__empty-text">{t('Metrics unavailable')}</span>
                          ) : <Spinner size="sm" />}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Reconciliations (1h)')}</DescriptionListTerm>
                        <DescriptionListDescription>
                          {reconcileLoaded && reconciliations !== null ? (
                            <Label isCompact color="blue">{Math.round(reconciliations)}</Label>
                          ) : reconcileLoaded ? (
                            <span className="gitops-dashboard__empty-text">{t('Metrics unavailable')}</span>
                          ) : <Spinner size="sm" />}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </GridItem>
                  <GridItem span={6}>
                    <DescriptionList isCompact>
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Cluster Connectivity')}</DescriptionListTerm>
                        <DescriptionListDescription>
                          {clusterConnLoaded && clusterTotalLoaded && clusterConn !== null && clusterTotal !== null ? (
                            <Label isCompact color={clusterConn === clusterTotal ? 'green' : 'red'}>{Math.round(clusterConn)}/{Math.round(clusterTotal)}</Label>
                          ) : clusterConnLoaded && clusterTotalLoaded ? (
                            <span className="gitops-dashboard__empty-text">{t('Metrics unavailable')}</span>
                          ) : <Spinner size="sm" />}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Repo Queue')}</DescriptionListTerm>
                        <DescriptionListDescription>
                          {pendingRepoLoaded && pendingRepo !== null ? (
                            <Label isCompact color={pendingRepo > 5 ? 'gold' : 'green'}>{Math.round(pendingRepo)}</Label>
                          ) : pendingRepoLoaded ? (
                            <span className="gitops-dashboard__empty-text">{t('Metrics unavailable')}</span>
                          ) : <Spinner size="sm" />}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Git Fetch Failures (24h)')}</DescriptionListTerm>
                        <DescriptionListDescription>
                          {gitFetchFailLoaded && gitFetchFail !== null ? (
                            <Label isCompact color={gitFetchFail > 0 ? 'red' : 'green'}>{Math.round(gitFetchFail)}</Label>
                          ) : gitFetchFailLoaded ? (
                            <span className="gitops-dashboard__empty-text">{t('Metrics unavailable')}</span>
                          ) : <Spinner size="sm" />}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </GridItem>
                </Grid>
              </CardBody>
            </Card>
          </GridItem>

          {/* Row 4: Activity Charts */}
          <GridItem span={6}>
            <Card className="gitops-dashboard__chart-card">
              <CardTitle>{t('Sync Activity (24h)')}</CardTitle>
              <CardBody>
                {syncChartData.length > 0 ? (
                  <div className="gitops-dashboard__sparkline-container">
                    <Chart
                      ariaTitle={t('Sync Activity')}
                      containerComponent={<ChartVoronoiContainer />}
                      height={150}
                      padding={CHART_PADDING}
                    >
                      <ChartAxis tickFormat={formatTimeTick} tickCount={6} />
                      <ChartAxis dependentAxis tickCount={4} />
                      <ChartGroup>
                        <ChartArea data={syncChartData} style={SYNC_CHART_STYLE} />
                      </ChartGroup>
                    </Chart>
                  </div>
                ) : (
                  <div className="gitops-dashboard__sparkline-empty">{t('No data')}</div>
                )}
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={6}>
            <Card className="gitops-dashboard__chart-card">
              <CardTitle>{t('Reconciliation Activity (24h)')}</CardTitle>
              <CardBody>
                {reconcileChartData.length > 0 ? (
                  <div className="gitops-dashboard__sparkline-container">
                    <Chart
                      ariaTitle={t('Reconciliation Activity')}
                      containerComponent={<ChartVoronoiContainer />}
                      height={150}
                      padding={CHART_PADDING}
                    >
                      <ChartAxis tickFormat={formatTimeTick} tickCount={6} />
                      <ChartAxis dependentAxis tickCount={4} />
                      <ChartGroup>
                        <ChartArea data={reconcileChartData} style={RECONCILE_CHART_STYLE} />
                      </ChartGroup>
                    </Chart>
                  </div>
                ) : (
                  <div className="gitops-dashboard__sparkline-empty">{t('No data')}</div>
                )}
              </CardBody>
            </Card>
          </GridItem>

          {/* Row 5: Recent Operations */}
          <GridItem span={12}>
            <Card>
              <CardTitle>{t('Recent Operations')}</CardTitle>
              <CardBody>
                {recentOps.length === 0 ? (
                  <div className="gitops-dashboard__empty-text">{t('No recent operations.')}</div>
                ) : (
                  <Table aria-label={t('Recent Operations')} isCompact>
                    <Thead><Tr>
                      <Th>{t('Name')}</Th>
                      <Th>{t('Phase')}</Th>
                      <Th>{t('Message')}</Th>
                      <Th>{t('Finished')}</Th>
                    </Tr></Thead>
                    <Tbody>
                      {recentOps.map((app) => {
                        const msg = app.status?.operationState?.message ?? '-';
                        const shortMsg = msg.length > 80 ? `${msg.slice(0, 80)}...` : msg;
                        return (
                        <Tr key={app.metadata.uid}>
                          <Td className="gitops-dashboard__name-cell">
                            <ResourceLink groupVersionKind={ApplicationGroupVersionKind} name={app.metadata.name} namespace={app.metadata.namespace} />
                          </Td>
                          <Td>
                            <Label isCompact color={phaseColor(app.status?.operationState?.phase)}>
                              {app.status?.operationState?.phase ?? '-'}
                            </Label>
                          </Td>
                          <Td className="gitops-dashboard__message-cell" title={msg}>
                            {shortMsg}
                          </Td>
                          <Td className="gitops-dashboard__finished-cell">
                            {app.status?.operationState?.finishedAt
                              ? timeAgo(app.status.operationState.finishedAt)
                              : '-'}
                          </Td>
                        </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </GridItem>

          {/* Row 6: All applications */}
          <GridItem span={12}>
            <Card>
              <CardTitle>{t('Applications')}</CardTitle>
              <CardBody>
                {allApps.length === 0 ? (
                  <div className="gitops-dashboard__empty-text">{t('No applications found.')}</div>
                ) : (
                  <Table aria-label={t('Applications')} isCompact isStriped>
                    <Thead><Tr>
                      <Th>{t('Name')}</Th>
                      <Th>{t('Project')}</Th>
                      <Th>{t('Sync Status')}</Th>
                      <Th>{t('Health')}</Th>
                      <Th>{t('Destination')}</Th>
                      <Th>{t('Last Reconciled')}</Th>
                    </Tr></Thead>
                    <Tbody>
                      {allApps.map((app) => (
                        <Tr key={app.metadata.uid}>
                          <Td>
                            <ResourceLink groupVersionKind={ApplicationGroupVersionKind} name={app.metadata.name} namespace={app.metadata.namespace} />
                          </Td>
                          <Td>{app.spec?.project}</Td>
                          <Td><SyncStatusIcon status={app.status?.sync?.status ?? 'Unknown'} /></Td>
                          <Td><HealthStatusIcon status={app.status?.health?.status ?? 'Unknown'} /></Td>
                          <Td>{app.spec?.destination?.namespace ?? '-'}</Td>
                          <Td>{app.status?.reconciledAt ? timeAgo(app.status.reconciledAt) : '-'}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </GridItem>

          {/* Row 6: Infrastructure */}
          <GridItem span={12}>
            <Card>
              <CardTitle>{t('Infrastructure')}</CardTitle>
              <CardBody>
                <Grid hasGutter>
                  <GridItem span={4}>
                    <DescriptionList isCompact>
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('GitOps Operator')}</DescriptionListTerm>
                        <DescriptionListDescription>
                          {gitopsOperator ? (
                            <Flex spaceItems={FLEX_SPACE_SM} alignItems={FLEX_ALIGN_CENTER}>
                              <FlexItem><Label isCompact color={gitopsOperator.phase === 'Succeeded' ? 'green' : 'red'}>{gitopsOperator.phase}</Label></FlexItem>
                              <FlexItem><span className="gitops-dashboard__version-text">v{gitopsOperator.version}</span></FlexItem>
                            </Flex>
                          ) : <span className="gitops-dashboard__empty-text">{t('Not installed')}</span>}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('ArgoCD Instances')}</DescriptionListTerm>
                        <DescriptionListDescription>
                          {stableInstances.map((inst) => (
                              <div key={inst.uid} className="pf-v6-u-mb-xs">
                                <Flex spaceItems={FLEX_SPACE_SM} alignItems={FLEX_ALIGN_CENTER}>
                                  <FlexItem><Label isCompact color={inst.phase === 'Available' ? 'green' : 'gold'}>{inst.phase}</Label></FlexItem>
                                  <FlexItem>{inst.name}</FlexItem>
                                  <FlexItem><span className="gitops-dashboard__version-text">{inst.namespace}</span></FlexItem>
                                </Flex>
                              </div>
                          ))}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </GridItem>
                  <GridItem span={4}>
                    <DescriptionList isCompact>
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Rollout Managers')}</DescriptionListTerm>
                        <DescriptionListDescription>
                          {stableRolloutManagers.length === 0 ? (
                            <span className="gitops-dashboard__empty-text">{t('None')}</span>
                          ) : stableRolloutManagers.map((rm) => (
                              <div key={rm.uid} className="pf-v6-u-mb-xs">
                                <Flex spaceItems={FLEX_SPACE_SM} alignItems={FLEX_ALIGN_CENTER}>
                                  <FlexItem><Label isCompact color={rm.phase === 'Available' ? 'green' : 'red'}>{rm.phase}</Label></FlexItem>
                                  <FlexItem>{rm.name}</FlexItem>
                                  <FlexItem><span className="gitops-dashboard__version-text">{rm.namespace}</span></FlexItem>
                                </Flex>
                              </div>
                          ))}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Rollouts')}</DescriptionListTerm>
                        <DescriptionListDescription>
                          <Label isCompact>{rolloutCount}</Label>
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </GridItem>
                  <GridItem span={4}>
                    <DescriptionList isCompact>
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('ApplicationSets')}</DescriptionListTerm>
                        <DescriptionListDescription><Label isCompact>{appsets?.length ?? 0}</Label></DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('AppProjects')}</DescriptionListTerm>
                        <DescriptionListDescription><Label isCompact>{projects?.length ?? 0}</Label></DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Console Plugin')}</DescriptionListTerm>
                        <DescriptionListDescription>
                          <Flex spaceItems={FLEX_SPACE_SM} alignItems={FLEX_ALIGN_CENTER}>
                            <FlexItem><Label isCompact color="blue">v0.1.0</Label></FlexItem>
                            <FlexItem><span className="gitops-dashboard__version-text">SDK 4.21</span></FlexItem>
                          </Flex>
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Extensions')}</DescriptionListTerm>
                        <DescriptionListDescription>
                          <span className="gitops-dashboard__version-text">20 tabs · 2 actions · 6 pages · 4 flags</span>
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </GridItem>
                </Grid>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    </React.Fragment>
  );
};

const GitOpsDashboardPageWithProvider = () => (<InstanceProvider><GitOpsDashboardPage /></InstanceProvider>);
export default GitOpsDashboardPageWithProvider;
