import React from 'react';
import { useState, useMemo, useCallback, type FC } from 'react';
import { useHistory } from 'react-router-dom';
import {
  useK8sWatchResource,
  usePrometheusPoll,
  PrometheusEndpoint,
  k8sDelete,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Bullseye, Spinner, Alert,
  Card, CardHeader, CardBody, CardFooter,
  DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
  Grid, GridItem, Label, Flex, FlexItem,
  Toolbar, ToolbarContent, ToolbarItem, ToolbarFilter,
  SearchInput,
  MenuToggle,
  Select, SelectOption, SelectList,
  Dropdown, DropdownList, DropdownItem,
  Drawer, DrawerContent, DrawerContentBody, DrawerPanelContent, DrawerHead, DrawerActions, DrawerCloseButton, DrawerPanelBody,
  EmptyState, EmptyStateBody, EmptyStateActions, EmptyStateFooter,
  Title,
  PageSection,
} from '@patternfly/react-core';
import {
  EllipsisVIcon,
  SearchIcon,
} from '@patternfly/react-icons';
import yaml from 'js-yaml';
import { ArgoCDModel, ArgoCDGroupVersionKind, ApplicationGroupVersionKind } from '../../models';
import { ConfirmModal } from '../shared/ConfirmModal';
import { timeAgo } from '../../utils/time';
import { phaseColor } from '../../utils/status';
import type { ApplicationResource } from '../../types';
import { FLEX_SPACE_SM, FLEX_ALIGN_CENTER, FLEX_WRAP } from '../../utils/pf-constants';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ArgoCDResource {
  apiVersion?: string;
  kind?: string;
  metadata: {
    name: string;
    namespace: string;
    uid: string;
    creationTimestamp?: string;
  };
  spec?: {
    server?: { route?: { enabled?: boolean }; image?: string; version?: string };
    repo?: { image?: string };
    redis?: { image?: string };
    controller?: { image?: string };
  };
  status?: {
    phase?: string;
    host?: string;
    applicationController?: string;
    redis?: string;
    repo?: string;
    server?: string;
    sso?: string;
  };
}

interface PodResource {
  metadata: { name: string; namespace: string; uid: string };
  spec?: {
    containers?: Array<{
      resources?: {
        requests?: { cpu?: string; memory?: string };
      };
    }>;
  };
}

type SortField = 'name' | 'namespace' | 'phase' | 'appCount';
type PhaseFilter = 'Available' | 'Pending' | 'Failed';

const PodGroupVersionKind = { group: '', version: 'v1', kind: 'Pod' };

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const componentColor = (status?: string): 'green' | 'red' | 'grey' => {
  if (status === 'Running' || status === 'Available') return 'green';
  if (status === 'Failed' || status === 'Error') return 'red';
  return 'grey';
};

const extractVersion = (inst: ArgoCDResource): string | undefined =>
  inst.spec?.server?.version ?? inst.spec?.server?.image?.split(':')[1];

const sumPodRequests = (pods: PodResource[]): { cpu: string; memory: string } => {
  let cpuMillis = 0;
  let memMi = 0;
  for (const pod of pods) {
    for (const c of pod.spec?.containers ?? []) {
      const cpuReq = c.resources?.requests?.cpu;
      if (cpuReq) {
        cpuMillis += cpuReq.endsWith('m')
          ? parseInt(cpuReq, 10)
          : parseFloat(cpuReq) * 1000;
      }
      const memReq = c.resources?.requests?.memory;
      if (memReq) {
        if (memReq.endsWith('Gi')) memMi += parseFloat(memReq) * 1024;
        else if (memReq.endsWith('Mi')) memMi += parseFloat(memReq);
        else if (memReq.endsWith('Ki')) memMi += parseFloat(memReq) / 1024;
      }
    }
  }
  const cpuStr = cpuMillis >= 1000 ? `${(cpuMillis / 1000).toFixed(1)} cores` : `${cpuMillis}m`;
  const memStr = memMi >= 1024 ? `${(memMi / 1024).toFixed(1)} Gi` : `${Math.round(memMi)} Mi`;
  return { cpu: cpuStr, memory: memStr };
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

const InstanceCardActions: FC<{
  instance: ArgoCDResource;
  onViewYaml: (inst: ArgoCDResource) => void;
}> = ({ instance, onViewYaml }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const history = useHistory();
  const [isOpen, setIsOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDelete = useCallback(async () => {
    setDeleteError('');
    try {
      await k8sDelete({ model: ArgoCDModel, resource: instance });
      setShowDelete(false);
    } catch (e) {
      setDeleteError((e as Error).message);
    }
  }, [instance]);

  const ns = instance.metadata?.namespace;
  const name = instance.metadata?.name;

  return (
    <>
      {deleteError && <Alert variant="danger" isInline isPlain title={deleteError} className="pf-v6-u-mb-sm" />}
      <Dropdown
        isOpen={isOpen}
        onSelect={() => setIsOpen(false)}
        onOpenChange={setIsOpen}
        popperProps={{ position: 'right' }}
        toggle={(ref) => (
          <MenuToggle ref={ref} variant="plain" onClick={() => setIsOpen(!isOpen)} aria-label={t('Actions')}>
            <EllipsisVIcon />
          </MenuToggle>
        )}
      >
        <DropdownList>
          <DropdownItem key="view-yaml" onClick={() => { setIsOpen(false); onViewYaml(instance); }}>
            {t('View YAML')}
          </DropdownItem>
          <DropdownItem
            key="edit-yaml"
            onClick={() => {
              setIsOpen(false);
              history.push(`/k8s/ns/${ns}/argoproj.io~v1beta1~ArgoCD/${name}/yaml`);
            }}
          >
            {t('Edit YAML')}
          </DropdownItem>
          <DropdownItem key="delete" isDanger onClick={() => { setIsOpen(false); setShowDelete(true); }}>
            {t('Delete')}
          </DropdownItem>
        </DropdownList>
      </Dropdown>
      <ConfirmModal
        title={t('Delete')}
        isOpen={showDelete}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        confirmLabel={t('Delete')}
        confirmVariant="danger"
      >
        {t('Are you sure you want to delete {{name}} ({{namespace}})?', { name, namespace: ns })}
      </ConfirmModal>
    </>
  );
};

const useMetric = (query: string): string | null => {
  const [resp, loaded] = usePrometheusPoll({ endpoint: PrometheusEndpoint.QUERY, query });
  if (!loaded) return null;
  const val = resp?.data?.result?.[0]?.value?.[1];
  return val ?? null;
};

const InstanceMetrics: FC<{ namespace: string }> = ({ namespace }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const successfulSyncs = useMetric(`sum(argocd_app_sync_total{namespace="${namespace}",phase="Succeeded"})`);
  const failedSyncs = useMetric(`sum(increase(argocd_app_sync_total{namespace="${namespace}",phase=~"Error|Failed"}[24h]))`);
  const clusterConn = useMetric(`sum(argocd_cluster_connection_status{namespace="${namespace}"})`);
  const clusterTotal = useMetric(`count(argocd_cluster_connection_status{namespace="${namespace}"})`);
  const repoPending = useMetric(`sum(argocd_repo_pending_request_total{namespace="${namespace}"})`);
  const gitFetchFails = useMetric(`sum(increase(argocd_git_fetch_fail_total{namespace="${namespace}"}[24h]))`);

  const hasAny = successfulSyncs || failedSyncs || clusterConn || repoPending || gitFetchFails;
  if (!hasAny) return null;

  const failedCount = failedSyncs ? Math.round(parseFloat(failedSyncs)) : 0;
  const gitFailCount = gitFetchFails ? Math.round(parseFloat(gitFetchFails)) : 0;
  const connectedClusters = clusterConn ? Math.round(parseFloat(clusterConn)) : 0;
  const totalClusters = clusterTotal ? Math.round(parseFloat(clusterTotal)) : 0;
  const pendingRepos = repoPending ? Math.round(parseFloat(repoPending)) : 0;

  return (
    <>
      {successfulSyncs && (
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Successful Syncs')}</DescriptionListTerm>
          <DescriptionListDescription><Label isCompact color="green">{successfulSyncs}</Label></DescriptionListDescription>
        </DescriptionListGroup>
      )}
      {failedSyncs && (
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Failed Syncs (24h)')}</DescriptionListTerm>
          <DescriptionListDescription><Label isCompact color={failedCount > 0 ? 'red' : 'green'}>{failedCount}</Label></DescriptionListDescription>
        </DescriptionListGroup>
      )}
      {clusterConn && (
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Cluster Connectivity')}</DescriptionListTerm>
          <DescriptionListDescription><Label isCompact color={connectedClusters === totalClusters ? 'green' : 'red'}>{connectedClusters}/{totalClusters}</Label></DescriptionListDescription>
        </DescriptionListGroup>
      )}
      {repoPending !== null && (
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Repo Pending Requests')}</DescriptionListTerm>
          <DescriptionListDescription><Label isCompact color={pendingRepos > 5 ? 'gold' : 'green'}>{pendingRepos}</Label></DescriptionListDescription>
        </DescriptionListGroup>
      )}
      {gitFetchFails && (
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Git Fetch Failures (24h)')}</DescriptionListTerm>
          <DescriptionListDescription><Label isCompact color={gitFailCount > 0 ? 'red' : 'green'}>{gitFailCount}</Label></DescriptionListDescription>
        </DescriptionListGroup>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export const ArgoCDListPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');

  /* K8s watches */
  const [instances, loaded, watchError] = useK8sWatchResource<ArgoCDResource[]>({
    groupVersionKind: ArgoCDGroupVersionKind,
    isList: true,
  });

  const [apps] = useK8sWatchResource<ApplicationResource[]>({
    groupVersionKind: ApplicationGroupVersionKind,
    isList: true,
  });

  const [pods] = useK8sWatchResource<PodResource[]>({
    groupVersionKind: PodGroupVersionKind,
    isList: true,
  });

  /* Filter / sort state */
  const [nameFilter, setNameFilter] = useState('');
  const [phaseFilters, setPhaseFilters] = useState<PhaseFilter[]>([]);
  const [sortField, setSortField] = useState<SortField>('name');
  const [phaseSelectOpen, setPhaseSelectOpen] = useState(false);
  const [sortSelectOpen, setSortSelectOpen] = useState(false);

  /* YAML drawer */
  const [drawerInstance, setDrawerInstance] = useState<ArgoCDResource | null>(null);

  /* Derived data */
  const items = useMemo(() => instances ?? [], [instances]);
  const appCountByNs = useCallback(
    (ns: string) => (apps ?? []).filter((a) => a.metadata?.namespace === ns).length,
    [apps],
  );
  const podsByNs = useCallback(
    (ns: string) => (pods ?? []).filter((p) => p.metadata?.namespace === ns),
    [pods],
  );

  const filtered = useMemo(() => {
    let result = items;
    if (nameFilter) {
      const lower = nameFilter.toLowerCase();
      result = result.filter((i) => i.metadata?.name?.toLowerCase().includes(lower));
    }
    if (phaseFilters.length > 0) {
      result = result.filter((i) => phaseFilters.includes((i.status?.phase ?? 'Unknown') as PhaseFilter));
    }
    /* sort */
    const sortFn = (a: ArgoCDResource, b: ArgoCDResource): number => {
      switch (sortField) {
        case 'name':
          return (a.metadata?.name ?? '').localeCompare(b.metadata?.name ?? '');
        case 'namespace':
          return (a.metadata?.namespace ?? '').localeCompare(b.metadata?.namespace ?? '');
        case 'phase':
          return (a.status?.phase ?? '').localeCompare(b.status?.phase ?? '');
        case 'appCount':
          return appCountByNs(b.metadata?.namespace ?? '') - appCountByNs(a.metadata?.namespace ?? '');
        default:
          return 0;
      }
    };
    return [...result].sort(sortFn);
  }, [items, nameFilter, phaseFilters, sortField, appCountByNs]);

  const handlePhaseSelect = (_e: unknown, value: string | number | undefined) => {
    const v = value as PhaseFilter;
    setPhaseFilters((prev) =>
      prev.includes(v) ? prev.filter((f) => f !== v) : [...prev, v],
    );
  };

  const sortLabelMap: Record<SortField, string> = {
    name: t('Name'),
    namespace: t('Namespace'),
    phase: t('Phase'),
    appCount: t('App Count'),
  };

  /* Loading / error */
  if (!loaded) return <Bullseye><Spinner /></Bullseye>;
  if (watchError) {
    return <Alert variant="danger" isInline title={t('Error loading resources')}>{(watchError as Error).message}</Alert>;
  }

  /* YAML drawer content */
  const drawerPanel = drawerInstance ? (
    <DrawerPanelContent isResizable defaultSize="50%" minSize="300px">
      <DrawerHead>
        <Title headingLevel="h2" size="lg">{drawerInstance.metadata?.name} {t('YAML')}</Title>
        <DrawerActions><DrawerCloseButton onClick={() => setDrawerInstance(null)} /></DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <pre className="pf-v6-u-font-size-sm">{yaml.dump(drawerInstance, { lineWidth: 120, noRefs: true })}</pre>
      </DrawerPanelBody>
    </DrawerPanelContent>
  ) : undefined;

  /* Toolbar */
  const toolbar = (
    <Toolbar clearAllFilters={() => { setNameFilter(''); setPhaseFilters([]); }}>
      <ToolbarContent>
        <ToolbarItem>
          <SearchInput
            placeholder={t('Filter instances...')}
            value={nameFilter}
            onChange={(_e, val) => setNameFilter(val)}
            onClear={() => setNameFilter('')}
            aria-label={t('Filter instances...')}
          />
        </ToolbarItem>
        <ToolbarItem>
          <ToolbarFilter
            chips={phaseFilters}
            deleteChip={(_cat, chip) => setPhaseFilters((prev) => prev.filter((f) => f !== chip))}
            deleteChipGroup={() => setPhaseFilters([])}
            categoryName={t('Phase')}
          >
            <Select
              aria-label={t('Phase')}
              toggle={(ref) => (
                <MenuToggle ref={ref} onClick={() => setPhaseSelectOpen(!phaseSelectOpen)} isExpanded={phaseSelectOpen}>
                  {t('Phase')}
                </MenuToggle>
              )}
              isOpen={phaseSelectOpen}
              onSelect={handlePhaseSelect}
              onOpenChange={setPhaseSelectOpen}
            >
              <SelectList>
                {(['Available', 'Pending', 'Failed'] as const).map((p) => (
                  <SelectOption key={p} value={p} hasCheckbox isSelected={phaseFilters.includes(p)}>
                    {t(p)}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </ToolbarFilter>
        </ToolbarItem>
        <ToolbarItem>
          <Select
            aria-label={t('Sort by')}
            toggle={(ref) => (
              <MenuToggle ref={ref} onClick={() => setSortSelectOpen(!sortSelectOpen)} isExpanded={sortSelectOpen}>
                {t('Sort by')}: {sortLabelMap[sortField]}
              </MenuToggle>
            )}
            isOpen={sortSelectOpen}
            onSelect={(_e, value) => { setSortField(value as SortField); setSortSelectOpen(false); }}
            onOpenChange={setSortSelectOpen}
            selected={sortField}
          >
            <SelectList>
              {(Object.keys(sortLabelMap) as SortField[]).map((key) => (
                <SelectOption key={key} value={key}>{sortLabelMap[key]}</SelectOption>
              ))}
            </SelectList>
          </Select>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );

  /* Empty states */
  if (items.length === 0) {
    return (
      <PageSection>
        <EmptyState headingLevel="h2" icon={SearchIcon}>
          <EmptyStateBody>{t('No ArgoCD instances found.')}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  const noFilterMatch = filtered.length === 0 && items.length > 0;

  return (
    <Drawer isExpanded={!!drawerInstance} onExpand={() => {}}>
      <DrawerContent panelContent={drawerPanel}>
        <DrawerContentBody>
          <PageSection>
            {toolbar}
            {noFilterMatch ? (
              <EmptyState headingLevel="h3" icon={SearchIcon}>
                <EmptyStateBody>{t('No instances match filters.')}</EmptyStateBody>
                <EmptyStateFooter>
                  <EmptyStateActions>
                    <button className="pf-v6-c-button pf-m-link" type="button" onClick={() => { setNameFilter(''); setPhaseFilters([]); }}>
                      {t('Clear filters')}
                    </button>
                  </EmptyStateActions>
                </EmptyStateFooter>
              </EmptyState>
            ) : (
              <Grid hasGutter>
                {filtered.map((inst) => {
                  const ns = inst.metadata?.namespace ?? '';
                  const name = inst.metadata?.name ?? '';
                  const argoUrl = inst.status?.host ? `https://${inst.status.host}` : null;
                  const appCount = appCountByNs(ns);
                  const nsPods = podsByNs(ns);
                  const resources = sumPodRequests(nsPods);
                  const version = extractVersion(inst);
                  const created = inst.metadata?.creationTimestamp;

                  return (
                    <GridItem span={6} key={inst.metadata?.uid}>
                      <Card isFullHeight>
                        <CardHeader
                          actions={{ actions: <InstanceCardActions instance={inst} onViewYaml={setDrawerInstance} /> }}
                        >
                          <Flex spaceItems={FLEX_SPACE_SM} alignItems={FLEX_ALIGN_CENTER}>
                            <FlexItem>
                              <Title headingLevel="h3" size="md">{name}</Title>
                            </FlexItem>
                            <FlexItem>
                              <Label isCompact color={inst.status?.phase === 'Pending' ? 'gold' : phaseColor(inst.status?.phase)}>{inst.status?.phase ?? t('Unknown')}</Label>
                            </FlexItem>
                          </Flex>
                        </CardHeader>
                        <CardBody>
                          <DescriptionList isHorizontal isCompact>
                            <DescriptionListGroup>
                              <DescriptionListTerm>{t('Namespace')}</DescriptionListTerm>
                              <DescriptionListDescription>
                                <a href={`/k8s/cluster/namespaces/${ns}`}>{ns}</a>
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                            <DescriptionListGroup>
                              <DescriptionListTerm>{t('App Count')}</DescriptionListTerm>
                              <DescriptionListDescription>
                                <Label isCompact color="blue">{appCount}</Label>
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                            <DescriptionListGroup>
                              <DescriptionListTerm>{t('Resource Requests')}</DescriptionListTerm>
                              <DescriptionListDescription>
                                {t('CPU')}: {resources.cpu}, {t('Memory')}: {resources.memory}
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                            {argoUrl && (
                              <DescriptionListGroup>
                                <DescriptionListTerm>{t('URL')}</DescriptionListTerm>
                                <DescriptionListDescription>
                                  <a href={argoUrl} target="_blank" rel="noopener noreferrer">
                                    {inst.status?.host}
                                  </a>
                                </DescriptionListDescription>
                              </DescriptionListGroup>
                            )}
                            {version && (
                              <DescriptionListGroup>
                                <DescriptionListTerm>{t('Version')}</DescriptionListTerm>
                                <DescriptionListDescription>{version}</DescriptionListDescription>
                              </DescriptionListGroup>
                            )}
                            {created && (
                              <DescriptionListGroup>
                                <DescriptionListTerm>{t('Created')}</DescriptionListTerm>
                                <DescriptionListDescription>{timeAgo(created)}</DescriptionListDescription>
                              </DescriptionListGroup>
                            )}
                            <InstanceMetrics namespace={ns} />
                          </DescriptionList>
                        </CardBody>
                        <CardFooter>
                          <Flex spaceItems={FLEX_SPACE_SM} wrap={FLEX_WRAP}>
                            <FlexItem><Label isCompact color={componentColor(inst.status?.server)}>server</Label></FlexItem>
                            <FlexItem><Label isCompact color={componentColor(inst.status?.repo)}>repo</Label></FlexItem>
                            <FlexItem><Label isCompact color={componentColor(inst.status?.redis)}>redis</Label></FlexItem>
                            <FlexItem><Label isCompact color={componentColor(inst.status?.applicationController)}>controller</Label></FlexItem>
                            {inst.status?.sso && (
                              <FlexItem><Label isCompact color={componentColor(inst.status.sso)}>sso</Label></FlexItem>
                            )}
                          </Flex>
                        </CardFooter>
                      </Card>
                    </GridItem>
                  );
                })}
              </Grid>
            )}
          </PageSection>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export default ArgoCDListPage;
