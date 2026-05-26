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
  Progress,
  ProgressMeasureLocation,
  ProgressVariant,
  Label,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Divider,
} from '@patternfly/react-core';
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
} from '../../models';
import { SyncStatusIcon } from '../shared/SyncStatusIcon';
import { HealthStatusIcon } from '../shared/HealthStatusIcon';
import { InstancePicker } from '../shared/InstancePicker';
import { InstanceProvider } from '../shared/InstanceProvider';
import { useCurrentInstance } from '../../hooks/useArgoCDInstances';
import type { ApplicationResource } from '../../types';
import './GitOpsDashboardPage.css';

function parsePrometheusScalar(response: PrometheusResponse | undefined): number | null {
  if (!response?.data?.result?.[0]?.value) return null;
  const val = parseFloat(response.data.result[0].value[1]);
  return isNaN(val) ? null : val;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const GitOpsDashboardPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { instance } = useCurrentInstance();

  const [apps, appsLoaded, appsError] = useK8sWatchResource<ApplicationResource[]>({
    groupVersionKind: ApplicationGroupVersionKind,
    isList: true,
    namespace: instance.namespace,
  });
  const [appsets, , appsetsError] = useK8sWatchResource<Array<Record<string, unknown>>>({
    groupVersionKind: ApplicationSetGroupVersionKind,
    isList: true,
    namespace: instance.namespace,
  });
  const [projects, , projectsError] = useK8sWatchResource<Array<Record<string, unknown>>>({
    groupVersionKind: AppProjectGroupVersionKind,
    isList: true,
    namespace: instance.namespace,
  });
  const [instances, , instancesError] = useK8sWatchResource<Array<Record<string, unknown>>>({
    groupVersionKind: ArgoCDGroupVersionKind,
    isList: true,
  });

  const errors = useMemo(
    () => [appsError, appsetsError, projectsError, instancesError].filter(Boolean) as Error[],
    [appsError, appsetsError, projectsError, instancesError],
  );

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

  const [syncSuccessResp, syncSuccessLoaded] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: 'sum(argocd_app_sync_total{phase="Succeeded"}) / sum(argocd_app_sync_total) * 100',
  });
  const [failedSyncsResp, failedSyncsLoaded] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: 'sum(increase(argocd_app_sync_total{phase=~"Error|Failed"}[24h]))',
  });
  const [reconcileResp, reconcileLoaded] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: 'sum(increase(argocd_app_reconcile_count[1h]))',
  });

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

  const opPhaseColor = (phase?: string): 'green' | 'red' | 'blue' | 'grey' => {
    switch (phase) {
      case 'Succeeded': return 'green';
      case 'Failed': case 'Error': return 'red';
      case 'Running': case 'Terminating': return 'blue';
      default: return 'grey';
    }
  };

  return (
    <React.Fragment>
      <DocumentTitle>{t('GitOps Dashboard')}</DocumentTitle>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }} className="pf-v6-u-mb-lg">
          <FlexItem><Title headingLevel="h1">{t('GitOps Overview')}</Title></FlexItem>
          <FlexItem><InstancePicker /></FlexItem>
        </Flex>

        {errors.length > 0 && errors.map((err, i) => (
          <Alert key={i} variant="danger" isInline title={t('Error loading resources')} className="pf-v6-u-mb-md">
            {err.message}
          </Alert>
        ))}

        <Grid hasGutter>
          {/* Row 1: Summary strip */}
          <GridItem span={12}>
            <Card>
              <CardBody>
                <Flex justifyContent={{ default: 'justifyContentSpaceEvenly' }} alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>
                    <div className="gitops-dashboard__stat">
                      <div className="gitops-dashboard__stat-value">{total}</div>
                      <div className="gitops-dashboard__stat-label">{t('Applications')}</div>
                    </div>
                  </FlexItem>
                  <Divider orientation={{ default: 'vertical' }} />
                  <FlexItem>
                    <div className="gitops-dashboard__stat">
                      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                        <FlexItem><CheckCircleIcon className="gitops-dashboard__icon--success" /></FlexItem>
                        <FlexItem><span className="gitops-dashboard__stat-value">{syncPct}%</span></FlexItem>
                      </Flex>
                      <div className="gitops-dashboard__stat-label">{t('Synced')}</div>
                    </div>
                  </FlexItem>
                  <Divider orientation={{ default: 'vertical' }} />
                  <FlexItem>
                    <div className="gitops-dashboard__stat">
                      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                        <FlexItem><CheckCircleIcon className="gitops-dashboard__icon--success" /></FlexItem>
                        <FlexItem><span className="gitops-dashboard__stat-value">{healthPct}%</span></FlexItem>
                      </Flex>
                      <div className="gitops-dashboard__stat-label">{t('Healthy')}</div>
                    </div>
                  </FlexItem>
                  <Divider orientation={{ default: 'vertical' }} />
                  <FlexItem>
                    <div className="gitops-dashboard__stat">
                      <div className="gitops-dashboard__stat-value">{needsAttention.length}</div>
                      <div className={`gitops-dashboard__stat-label${needsAttention.length > 0 ? ' gitops-dashboard__stat-label--danger' : ''}`}>{t('Needs Attention')}</div>
                    </div>
                  </FlexItem>
                  <Divider orientation={{ default: 'vertical' }} />
                  <FlexItem>
                    <div className="gitops-dashboard__stat">
                      <Flex spaceItems={{ default: 'spaceItemsMd' }}>
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
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
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
                                <Label isCompact color={opPhaseColor(app.status.operationState.phase)}>{app.status.operationState.phase}</Label>
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

          {/* Row 3: Status breakdown + Metrics */}
          <GridItem span={4}>
            <Card className="gitops-dashboard__card-equal">
              <CardTitle>{t('Sync Status')}</CardTitle>
              <CardBody>
                <div className="pf-v6-u-mb-md">
                  <Progress value={syncPct} title={`${synced} ${t('Synced')}`} variant={ProgressVariant.success} measureLocation={ProgressMeasureLocation.outside} />
                </div>
                {outOfSync > 0 && (
                  <div className="pf-v6-u-mb-md">
                    <Progress value={total > 0 ? Math.round((outOfSync / total) * 100) : 0} title={`${outOfSync} ${t('OutOfSync')}`} variant={ProgressVariant.warning} measureLocation={ProgressMeasureLocation.outside} />
                  </div>
                )}
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={4}>
            <Card className="gitops-dashboard__card-equal">
              <CardTitle>{t('Health Status')}</CardTitle>
              <CardBody>
                {[
                  { count: healthy, label: t('Healthy'), variant: ProgressVariant.success },
                  { count: progressing, label: t('Progressing'), variant: undefined },
                  { count: degraded, label: t('Degraded'), variant: ProgressVariant.danger },
                  { count: suspended, label: t('Suspended'), variant: undefined },
                  { count: missing, label: t('Missing'), variant: ProgressVariant.warning },
                ].filter((s) => s.count > 0).map((s) => (
                  <div key={s.label} className="pf-v6-u-mb-md">
                    <Progress value={total > 0 ? Math.round((s.count / total) * 100) : 0} title={`${s.count} ${s.label}`} variant={s.variant} measureLocation={ProgressMeasureLocation.outside} />
                  </div>
                ))}
                {total === 0 && <div className="gitops-dashboard__empty-text">{t('No applications found.')}</div>}
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={4}>
            <Card className="gitops-dashboard__card-equal">
              <CardTitle>{t('Metrics')}</CardTitle>
              <CardBody>
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
              </CardBody>
            </Card>
          </GridItem>

          {/* Row 4: Recent Operations */}
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
                            <Label isCompact color={opPhaseColor(app.status?.operationState?.phase)}>
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

          {/* Row 5: All applications */}
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
                          <Td>{app.spec.project}</Td>
                          <Td><SyncStatusIcon status={app.status?.sync?.status ?? 'Unknown'} /></Td>
                          <Td><HealthStatusIcon status={app.status?.health?.status ?? 'Unknown'} /></Td>
                          <Td>{app.spec.destination.namespace ?? '-'}</Td>
                          <Td>{app.status?.reconciledAt ? timeAgo(app.status.reconciledAt) : '-'}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
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
