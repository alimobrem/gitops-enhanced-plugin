import React from 'react';
import { useState, useMemo, useCallback, type FC } from 'react';
import { Link } from 'react-router-dom';
import {
  DocumentTitle,
  ListPageHeader,
  ResourceLink,
  k8sPatch,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection,
  Alert,
  AlertActionCloseButton,
  Badge,
  Button,
  Pagination,
} from '@patternfly/react-core';
import {
  DataView,
  DataViewState,
  DataViewTable,
  DataViewToolbar,
  DataViewFilters,
  DataViewTextFilter,
  DataViewCheckboxFilter,
  useDataViewSelection,
  useDataViewFilters,
  useDataViewPagination,
  useDataViewSort,
} from '@patternfly/react-data-view';
import { useApplications } from '../../hooks/useApplications';
import { useCurrentInstance, watchNamespace } from '../../hooks/useArgoCDInstances';
import { InstanceProvider } from '../shared/InstanceProvider';
import { ConfirmModal } from '../shared/ConfirmModal';
import { SyncStatusIcon } from '../shared/SyncStatusIcon';
import { RowActions } from './RowActions';
import { HealthStatusIcon } from '../shared/HealthStatusIcon';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { ApplicationModel, ApplicationGroupVersionKind } from '../../models';
import { getApplicationSource } from '../../utils/application';
import type { ApplicationResource, SyncStatusCode, HealthStatusCode } from '../../types';

const SYNC_OPTIONS: SyncStatusCode[] = ['Synced', 'OutOfSync', 'Unknown'];
const HEALTH_OPTIONS: HealthStatusCode[] = ['Healthy', 'Degraded', 'Progressing', 'Suspended', 'Missing', 'Unknown'];

const COLUMN_KEYS = ['name', 'project', 'sync', 'health', 'repo', 'destination'] as const;

interface FilterValues {
  name: string;
  sync: string[];
  health: string[];
  project: string[];
}

const INITIAL_FILTERS: FilterValues = {
  name: '',
  sync: [],
  health: [],
  project: [],
};

export const ApplicationListPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { instance } = useCurrentInstance();
  const [applications, loaded, error] = useApplications(watchNamespace(instance));

  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkConfirmAction, setBulkConfirmAction] = useState<'sync' | 'refresh' | null>(null);

  const { filters, onSetFilters, clearAllFilters } = useDataViewFilters<FilterValues>({
    initialFilters: INITIAL_FILTERS,
  });

  const { sortBy, direction, onSort } = useDataViewSort({
    initialSort: { sortBy: COLUMN_KEYS[0], direction: 'asc' },
  });

  const selection = useDataViewSelection<string>({
    matchOption: (a, b) => a === b,
  });

  const projects = useMemo(() => {
    const set = new Set(applications.map((a) => a.spec?.project));
    return [...set].sort();
  }, [applications]);

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      if (filters.name && !app.metadata.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
      if (filters.sync.length > 0 && !filters.sync.includes(app.status?.sync?.status ?? 'Unknown')) return false;
      if (filters.health.length > 0 && !filters.health.includes(app.status?.health?.status ?? 'Unknown')) return false;
      if (filters.project.length > 0 && !filters.project.includes(app.spec?.project ?? '')) return false;
      return true;
    });
  }, [applications, filters]);

  const activeFilterCount = [
    filters.name,
    ...filters.sync,
    ...filters.health,
    ...filters.project,
  ].filter(Boolean).length;

  const sortedItems = useMemo(() => {
    if (!sortBy) return filtered;
    const getVal = (app: ApplicationResource): string => {
      switch (sortBy) {
        case 'name': return app.metadata.name;
        case 'project': return app.spec?.project ?? '';
        case 'sync': return app.status?.sync?.status ?? 'Unknown';
        case 'health': return app.status?.health?.status ?? 'Unknown';
        case 'repo': return getApplicationSource(app)?.repoURL ?? '';
        case 'destination': return `${app.spec?.destination?.server ?? ''} / ${app.spec?.destination?.namespace ?? ''}`;
        default: return '';
      }
    };
    return [...filtered].sort((a, b) => {
      const cmp = getVal(a).localeCompare(getVal(b));
      return direction === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortBy, direction]);

  const pagination = useDataViewPagination({ perPage: 20 });
  const { page, perPage, onSetPage, onPerPageSelect } = pagination;

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * perPage;
    return sortedItems.slice(start, start + perPage);
  }, [sortedItems, page, perPage]);

  const bulkSyncSelected = useCallback(async () => {
    setBulkRunning(true);
    setBulkError('');
    try {
      const selectedApps = applications.filter((a) => selection.isSelected(a.metadata.uid));
      await Promise.all(selectedApps.map((app) =>
        k8sPatch({
          model: ApplicationModel,
          resource: app,
          data: [{
            op: 'add',
            path: '/operation',
            value: { sync: { revision: getApplicationSource(app)?.targetRevision ?? 'HEAD' } },
          }],
        }),
      ));
      selection.setSelected([]);
    } catch (e) {
      setBulkError((e as Error).message);
    } finally {
      setBulkRunning(false);
    }
  }, [applications, selection]);

  const bulkRefreshSelected = useCallback(async () => {
    setBulkRunning(true);
    setBulkError('');
    try {
      const selectedApps = applications.filter((a) => selection.isSelected(a.metadata.uid));
      await Promise.all(selectedApps.map((app) =>
        k8sPatch({
          model: ApplicationModel,
          resource: app,
          data: [{
            op: 'replace',
            path: '/metadata/annotations/argocd.argoproj.io~1refresh',
            value: 'normal',
          }],
        }),
      ));
      selection.setSelected([]);
    } catch (e) {
      setBulkError((e as Error).message);
    } finally {
      setBulkRunning(false);
    }
  }, [applications, selection]);

  const makeSortProps = (key: string) => ({
    sort: {
      sortBy: { index: COLUMN_KEYS.indexOf(key as typeof COLUMN_KEYS[number]), direction: sortBy === key ? direction : undefined },
      onSort: (_e: unknown, _idx: number, dir: 'asc' | 'desc') => onSort(undefined as unknown as React.MouseEvent, key, dir),
      columnIndex: COLUMN_KEYS.indexOf(key as typeof COLUMN_KEYS[number]),
    },
  });

  const columns = [
    { cell: t('Name'), props: makeSortProps('name') },
    { cell: t('Project'), props: makeSortProps('project') },
    { cell: t('Sync Status'), props: makeSortProps('sync') },
    { cell: t('Health'), props: makeSortProps('health') },
    { cell: t('Repository'), props: makeSortProps('repo') },
    { cell: t('Destination'), props: makeSortProps('destination') },
    { cell: '' },
  ];

  const rows = paginatedItems.map((app: ApplicationResource) => ({
    id: app.metadata.uid,
    row: [
      <ResourceLink
        key="name"
        groupVersionKind={ApplicationGroupVersionKind}
        name={app.metadata.name}
        namespace={app.metadata.namespace}
      />,
      app.spec?.project ?? '-',
      <SyncStatusIcon key="sync" status={app.status?.sync?.status ?? 'Unknown'} />,
      <HealthStatusIcon key="health" status={app.status?.health?.status ?? 'Unknown'} />,
      getApplicationSource(app)?.repoURL
        ? <a key="repo" href={getApplicationSource(app)!.repoURL} target="_blank" rel="noopener noreferrer">{getApplicationSource(app)!.repoURL} <ExternalLinkAltIcon /></a>
        : '-',
      app.spec?.destination?.namespace
        ? <a key="dest" href={`/k8s/cluster/namespaces/${app.spec?.destination?.namespace}`}>{app.spec?.destination?.name ?? app.spec?.destination?.server ?? ''} / {app.spec?.destination?.namespace}</a>
        : `${app.spec?.destination?.name ?? app.spec?.destination?.server ?? ''}`,
      <RowActions key="actions" app={app} />,
    ],
  }));

  const syncFilterOptions = SYNC_OPTIONS.map((s) => ({
    label: `${s} (${applications.filter((a) => (a.status?.sync?.status ?? 'Unknown') === s).length})`,
    value: s,
  }));

  const healthFilterOptions = HEALTH_OPTIONS.map((h) => ({
    label: `${h} (${applications.filter((a) => (a.status?.health?.status ?? 'Unknown') === h).length})`,
    value: h,
  }));

  const projectFilterOptions = projects.map((p) => ({
    label: `${p} (${applications.filter((a) => a.spec?.project === p).length})`,
    value: p ?? '',
  }));

  const bulkActions = selection.selected.length > 0 ? (
    <>
      <Button variant="primary" onClick={() => setBulkConfirmAction('sync')}
        isDisabled={bulkRunning} isLoading={bulkRunning}
      >
        {t('Sync Selected')} ({selection.selected.length})
      </Button>
      <Button variant="secondary" onClick={() => setBulkConfirmAction('refresh')}
        isDisabled={bulkRunning} isLoading={bulkRunning}
        className="pf-v6-u-ml-sm"
      >
        {t('Refresh Selected')} ({selection.selected.length})
      </Button>
    </>
  ) : undefined;

  const paginationNode = sortedItems.length > 20 ? (
    <Pagination
      itemCount={sortedItems.length}
      perPage={perPage}
      page={page}
      onSetPage={onSetPage}
      onPerPageSelect={onPerPageSelect}
      perPageOptions={[
        { title: '10', value: 10 },
        { title: '20', value: 20 },
        { title: '50', value: 50 },
        { title: '100', value: 100 },
      ]}
    />
  ) : undefined;

  return (
    <React.Fragment>
      <DocumentTitle>{t('Applications')}</DocumentTitle>
      <ListPageHeader title={t('Applications')}>
        <Link to="/gitops/create"><Button variant="primary">{t('Create Application')}</Button></Link>
      </ListPageHeader>
      <PageSection>
        {error && (
          <Alert variant="danger" isInline title={t('Error loading applications')}>
            {error.message}
          </Alert>
        )}
        {bulkError && (
          <Alert variant="danger" isInline title={t('Bulk action failed')}
            actionClose={<AlertActionCloseButton onClose={() => setBulkError('')} />}
            className="pf-v6-u-mb-md"
          >{bulkError}</Alert>
        )}

        <DataView
          selection={{
            onSelect: selection.onSelect,
            isSelected: selection.isSelected,
          }}
          activeState={
            !loaded && !error ? DataViewState.loading
            : loaded && filtered.length === 0 ? DataViewState.empty
            : undefined
          }
        >
          <DataViewToolbar
            clearAllFilters={clearAllFilters}
            actions={bulkActions}
            pagination={paginationNode}
          >
            <DataViewFilters
              onChange={(_key, newVals) => onSetFilters(newVals)}
              values={filters}
            >
              <DataViewTextFilter
                filterId="name"
                title={t('Name')}
                placeholder={t('Filter by name...')}
                value={filters.name}
                onChange={(_e, value) => onSetFilters({ name: value })}
              />
              <DataViewCheckboxFilter
                filterId="sync"
                title={t('Sync Status')}
                value={filters.sync}
                options={syncFilterOptions}
                onChange={(_e, values) => onSetFilters({ sync: values ?? [] })}
              />
              <DataViewCheckboxFilter
                filterId="health"
                title={t('Health')}
                value={filters.health}
                options={healthFilterOptions}
                onChange={(_e, values) => onSetFilters({ health: values ?? [] })}
              />
              {projects.length > 1 && (
                <DataViewCheckboxFilter
                  filterId="project"
                  title={t('Project')}
                  value={filters.project}
                  options={projectFilterOptions}
                  onChange={(_e, values) => onSetFilters({ project: values ?? [] })}
                />
              )}
            </DataViewFilters>
            {activeFilterCount > 0 && (
              <Badge isRead>{filtered.length} / {applications.length}</Badge>
            )}
          </DataViewToolbar>
          <DataViewTable
            aria-label={t('Applications')}
            columns={columns}
            rows={rows}
          />
        </DataView>

        {loaded && paginationNode && filtered.length > 0 && (
          <Pagination
            itemCount={sortedItems.length}
            perPage={perPage}
            page={page}
            onSetPage={onSetPage}
            onPerPageSelect={onPerPageSelect}
            variant="bottom"
            perPageOptions={[
              { title: '10', value: 10 },
              { title: '20', value: 20 },
              { title: '50', value: 50 },
              { title: '100', value: 100 },
            ]}
          />
        )}
      </PageSection>
      <ConfirmModal
        title={bulkConfirmAction === 'sync' ? t('Confirm Bulk Sync') : t('Confirm Bulk Refresh')}
        isOpen={!!bulkConfirmAction}
        onConfirm={() => { bulkConfirmAction === 'sync' ? bulkSyncSelected() : bulkRefreshSelected(); setBulkConfirmAction(null); }}
        onCancel={() => setBulkConfirmAction(null)}
        confirmLabel={bulkConfirmAction === 'sync' ? t('Sync') : t('Refresh')}
      >
        {bulkConfirmAction === 'sync'
          ? t('Are you sure you want to sync {{count}} selected applications?', { count: selection.selected.length })
          : t('Are you sure you want to refresh {{count}} selected applications?', { count: selection.selected.length })}
      </ConfirmModal>
    </React.Fragment>
  );
};

const ApplicationListPageWithProvider = () => (
  <InstanceProvider><ApplicationListPage /></InstanceProvider>
);
export default ApplicationListPageWithProvider;
