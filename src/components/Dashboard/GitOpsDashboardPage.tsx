import React from 'react';
import { useMemo, type FC } from 'react';
import {
  useK8sWatchResource,
  DocumentTitle,
  ResourceLink,
} from '@openshift-console/dynamic-plugin-sdk';
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
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CubesIcon,
  LayerGroupIcon,
  FolderOpenIcon,
  ServerIcon,
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
import type { ApplicationResource } from '../../types';
import './GitOpsDashboardPage.css';

interface StatusCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  color?: string;
}

const StatusCard: FC<StatusCardProps> = ({ title, count, icon, color }) => (
  <Card isCompact>
    <CardBody>
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
        <FlexItem className="gitops-dashboard__status-icon" style={color ? { color } : undefined}>{icon}</FlexItem>
        <FlexItem>
          <div className="gitops-dashboard__status-count">{count}</div>
          <div className="gitops-dashboard__status-label">{title}</div>
        </FlexItem>
      </Flex>
    </CardBody>
  </Card>
);

export const GitOpsDashboardPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');

  const [apps, appsLoaded, appsError] = useK8sWatchResource<ApplicationResource[]>({
    groupVersionKind: ApplicationGroupVersionKind,
    isList: true,
  });
  const [appsets, , appsetsError] = useK8sWatchResource<Array<Record<string, unknown>>>({
    groupVersionKind: ApplicationSetGroupVersionKind,
    isList: true,
  });
  const [projects, , projectsError] = useK8sWatchResource<Array<Record<string, unknown>>>({
    groupVersionKind: AppProjectGroupVersionKind,
    isList: true,
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

  const { total, synced, outOfSync, unknown, healthy, degraded, progressing, recentApps } = useMemo(() => {
    const t = allApps.length;
    const s = allApps.filter((a) => a.status?.sync?.status === 'Synced').length;
    const o = allApps.filter((a) => a.status?.sync?.status === 'OutOfSync').length;
    const h = allApps.filter((a) => a.status?.health?.status === 'Healthy').length;
    const d = allApps.filter((a) => a.status?.health?.status === 'Degraded').length;
    const p = allApps.filter((a) => a.status?.health?.status === 'Progressing').length;
    const recent = [...allApps]
      .sort((a, b) => {
        const aTime = a.status?.reconciledAt ?? a.metadata.creationTimestamp ?? '';
        const bTime = b.status?.reconciledAt ?? b.metadata.creationTimestamp ?? '';
        return bTime.localeCompare(aTime);
      })
      .slice(0, 10);
    return { total: t, synced: s, outOfSync: o, unknown: t - s - o, healthy: h, degraded: d, progressing: p, recentApps: recent };
  }, [allApps]);

  const syncedPct = total > 0 ? Math.round((synced / total) * 100) : 0;
  const oosPct = total > 0 ? Math.round((outOfSync / total) * 100) : 0;

  if (!appsLoaded && errors.length === 0) {
    return (
      <React.Fragment>
        <DocumentTitle>{t('GitOps Dashboard')}</DocumentTitle>
        <PageSection><Bullseye><Spinner /></Bullseye></PageSection>
      </React.Fragment>
    );
  }

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
          <GridItem span={3}>
            <StatusCard title={t('Total Applications')} count={total} icon={<CubesIcon />} color="var(--pf-t--global--color--brand--default)" />
          </GridItem>
          <GridItem span={3}>
            <StatusCard title={t('Synced')} count={synced} icon={<CheckCircleIcon />} color="var(--pf-t--global--color--status--success--default)" />
          </GridItem>
          <GridItem span={3}>
            <StatusCard title={t('OutOfSync')} count={outOfSync} icon={<ExclamationTriangleIcon />} color="var(--pf-t--global--color--status--warning--default)" />
          </GridItem>
          <GridItem span={3}>
            <StatusCard title={t('Degraded')} count={degraded} icon={<ExclamationCircleIcon />} color="var(--pf-t--global--color--status--danger--default)" />
          </GridItem>

          <GridItem span={6}>
            <Card>
              <CardTitle>{t('Sync Status')}</CardTitle>
              <CardBody>
                <div className="pf-v6-u-mb-sm">
                  <Progress
                    value={syncedPct}
                    title={`${t('Synced')}: ${synced}`}
                    variant={ProgressVariant.success}
                    measureLocation={ProgressMeasureLocation.outside}
                  />
                </div>
                <div className="pf-v6-u-mb-sm">
                  <Progress
                    value={oosPct}
                    title={`${t('OutOfSync')}: ${outOfSync}`}
                    variant={ProgressVariant.warning}
                    measureLocation={ProgressMeasureLocation.outside}
                  />
                </div>
                {unknown > 0 && (
                  <Progress
                    value={total > 0 ? Math.round((unknown / total) * 100) : 0}
                    title={`${t('Unknown')}: ${unknown}`}
                    measureLocation={ProgressMeasureLocation.outside}
                  />
                )}
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={6}>
            <Card>
              <CardTitle>{t('Health Status')}</CardTitle>
              <CardBody>
                <div className="pf-v6-u-mb-sm">
                  <Progress
                    value={total > 0 ? Math.round((healthy / total) * 100) : 0}
                    title={`${t('Healthy')}: ${healthy}`}
                    variant={ProgressVariant.success}
                    measureLocation={ProgressMeasureLocation.outside}
                  />
                </div>
                <div className="pf-v6-u-mb-sm">
                  <Progress
                    value={total > 0 ? Math.round((progressing / total) * 100) : 0}
                    title={`${t('Progressing')}: ${progressing}`}
                    measureLocation={ProgressMeasureLocation.outside}
                  />
                </div>
                {degraded > 0 && (
                  <Progress
                    value={total > 0 ? Math.round((degraded / total) * 100) : 0}
                    title={`${t('Degraded')}: ${degraded}`}
                    variant={ProgressVariant.danger}
                    measureLocation={ProgressMeasureLocation.outside}
                  />
                )}
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={12}>
            <Card>
              <CardTitle>{t('Recent Applications')}</CardTitle>
              <CardBody>
                {recentApps.length === 0 ? (
                  <div>{t('No applications found.')}</div>
                ) : (
                  <Table aria-label={t('Recent Applications')} isCompact>
                    <Thead>
                      <Tr>
                        <Th>{t('Name')}</Th>
                        <Th>{t('Project')}</Th>
                        <Th>{t('Sync Status')}</Th>
                        <Th>{t('Health')}</Th>
                        <Th>{t('Last Reconciled')}</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {recentApps.map((app) => (
                        <Tr key={app.metadata.uid}>
                          <Td>
                            <ResourceLink
                              groupVersionKind={ApplicationGroupVersionKind}
                              name={app.metadata.name}
                              namespace={app.metadata.namespace}
                            />
                          </Td>
                          <Td>{app.spec.project}</Td>
                          <Td><SyncStatusIcon status={app.status?.sync?.status ?? 'Unknown'} /></Td>
                          <Td><HealthStatusIcon status={app.status?.health?.status ?? 'Unknown'} /></Td>
                          <Td>{app.status?.reconciledAt ? new Date(app.status.reconciledAt).toLocaleString() : '-'}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={4}>
            <Card isCompact>
              <CardBody>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
                  <FlexItem className="gitops-dashboard__resource-icon"><LayerGroupIcon /></FlexItem>
                  <FlexItem>
                    <strong>{appsets?.length ?? 0}</strong> {t('ApplicationSets')}
                  </FlexItem>
                </Flex>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem span={4}>
            <Card isCompact>
              <CardBody>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
                  <FlexItem className="gitops-dashboard__resource-icon"><FolderOpenIcon /></FlexItem>
                  <FlexItem>
                    <strong>{projects?.length ?? 0}</strong> {t('AppProjects')}
                  </FlexItem>
                </Flex>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem span={4}>
            <Card isCompact>
              <CardBody>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
                  <FlexItem className="gitops-dashboard__resource-icon"><ServerIcon /></FlexItem>
                  <FlexItem>
                    <strong>{instances?.length ?? 0}</strong> {t('ArgoCD Instances')}
                  </FlexItem>
                </Flex>
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
