import React from 'react';
import { useState, useMemo, type FC } from 'react';
import {
  DocumentTitle,
  ListPageHeader,
  ResourceLink,
  k8sPatch,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection,
  Bullseye,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Alert,
  AlertActionCloseButton,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarFilter,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  TextInput,
  Badge,
  Button,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { useApplications } from '../../hooks/useApplications';
import { useCurrentInstance } from '../../hooks/useArgoCDInstances';
import { usePagination } from '../../hooks/usePagination';
import { useSortableData } from '../../hooks/useSortableData';
import { TablePagination } from '../shared/TablePagination';
import { InstanceProvider } from '../shared/InstanceProvider';
import { SyncStatusIcon } from '../shared/SyncStatusIcon';
import { RowActions } from './RowActions';
import { HealthStatusIcon } from '../shared/HealthStatusIcon';
import { ApplicationModel, ApplicationGroupVersionKind } from '../../models';
import { getApplicationSource } from '../../utils/application';
import type { ApplicationResource, SyncStatusCode, HealthStatusCode } from '../../types';

const SYNC_OPTIONS: SyncStatusCode[] = ['Synced', 'OutOfSync', 'Unknown'];
const HEALTH_OPTIONS: HealthStatusCode[] = ['Healthy', 'Degraded', 'Progressing', 'Suspended', 'Missing', 'Unknown'];

export const ApplicationListPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { instance } = useCurrentInstance();
  const [applications, loaded, error] = useApplications(instance.namespace);

  const [nameFilter, setNameFilter] = useState('');
  const [syncFilter, setSyncFilter] = useState<string>('');
  const [healthFilter, setHealthFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [syncOpen, setSyncOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkError, setBulkError] = useState('');

  const projects = useMemo(() => {
    const set = new Set(applications.map((a) => a.spec?.project));
    return [...set].sort();
  }, [applications]);

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      if (nameFilter && !app.metadata.name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
      if (syncFilter && (app.status?.sync?.status ?? 'Unknown') !== syncFilter) return false;
      if (healthFilter && (app.status?.health?.status ?? 'Unknown') !== healthFilter) return false;
      if (projectFilter && app.spec?.project !== projectFilter) return false;
      return true;
    });
  }, [applications, nameFilter, syncFilter, healthFilter, projectFilter]);

  const activeFilterCount = [syncFilter, healthFilter, projectFilter, nameFilter].filter(Boolean).length;

  const toggleSelect = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((a) => a.metadata.uid)));
    }
  };

  const bulkSyncSelected = async () => {
    setBulkRunning(true);
    setBulkError('');
    try {
      const selectedApps = applications.filter((a) => selected.has(a.metadata.uid));
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
      setSelected(new Set());
    } catch (e) {
      setBulkError((e as Error).message);
    } finally {
      setBulkRunning(false);
    }
  };

  const bulkRefreshSelected = async () => {
    setBulkRunning(true);
    setBulkError('');
    try {
      const selectedApps = applications.filter((a) => selected.has(a.metadata.uid));
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
      setSelected(new Set());
    } catch (e) {
      setBulkError((e as Error).message);
    } finally {
      setBulkRunning(false);
    }
  };

  const sortGetters = useMemo(() => [
    (app: ApplicationResource) => app.metadata.name,
    (app: ApplicationResource) => app.spec?.project,
    (app: ApplicationResource) => app.status?.sync?.status ?? 'Unknown',
    (app: ApplicationResource) => app.status?.health?.status ?? 'Unknown',
    (app: ApplicationResource) => getApplicationSource(app)?.repoURL ?? '',
    (app: ApplicationResource) => `${app.spec?.destination?.server ?? ''} / ${app.spec?.destination?.namespace ?? ''}`,
  ], []);
  const { sortedItems, getSortParams } = useSortableData(filtered, sortGetters);
  const { paginatedItems, page, perPage, totalItems, setPage, setPerPage } = usePagination(sortedItems);

  return (
    <React.Fragment>
      <DocumentTitle>{t('Applications')}</DocumentTitle>
      <ListPageHeader title={t('Applications')}>
        <Button variant="primary" component="a" href="/gitops/create">{t('Create Application')}</Button>
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
        {!loaded && !error && (
          <Bullseye><Spinner /></Bullseye>
        )}
        {loaded && (
          <React.Fragment>
            <Toolbar clearAllFilters={() => { setNameFilter(''); setSyncFilter(''); setHealthFilter(''); setProjectFilter(''); }}>
              <ToolbarContent>
                <ToolbarItem>
                  <TextInput
                    type="search"
                    placeholder={t('Filter by name...')}
                    value={nameFilter}
                    onChange={(_e, val) => setNameFilter(val)}
                   
                  />
                </ToolbarItem>
                <ToolbarItem>
                  <ToolbarFilter
                    chips={syncFilter ? [syncFilter] : []}
                    deleteChip={() => setSyncFilter('')}
                    categoryName={t('Sync Status')}
                  >
                    <Select
                      isOpen={syncOpen}
                      onOpenChange={setSyncOpen}
                      onSelect={(_e, val) => { setSyncFilter(val === syncFilter ? '' : val as string); setSyncOpen(false); }}
                      toggle={(ref) => (
                        <MenuToggle ref={ref} onClick={() => setSyncOpen(!syncOpen)}>
                          {syncFilter || t('Sync Status')}
                        </MenuToggle>
                      )}
                      selected={syncFilter}
                    >
                      <SelectList>
                        {SYNC_OPTIONS.map((s) => <SelectOption key={s} value={s}>{s} ({applications.filter((a) => (a.status?.sync?.status ?? 'Unknown') === s).length})</SelectOption>)}
                      </SelectList>
                    </Select>
                  </ToolbarFilter>
                </ToolbarItem>
                <ToolbarItem>
                  <ToolbarFilter
                    chips={healthFilter ? [healthFilter] : []}
                    deleteChip={() => setHealthFilter('')}
                    categoryName={t('Health')}
                  >
                    <Select
                      isOpen={healthOpen}
                      onOpenChange={setHealthOpen}
                      onSelect={(_e, val) => { setHealthFilter(val === healthFilter ? '' : val as string); setHealthOpen(false); }}
                      toggle={(ref) => (
                        <MenuToggle ref={ref} onClick={() => setHealthOpen(!healthOpen)}>
                          {healthFilter || t('Health')}
                        </MenuToggle>
                      )}
                      selected={healthFilter}
                    >
                      <SelectList>
                        {HEALTH_OPTIONS.map((h) => <SelectOption key={h} value={h}>{h} ({applications.filter((a) => (a.status?.health?.status ?? 'Unknown') === h).length})</SelectOption>)}
                      </SelectList>
                    </Select>
                  </ToolbarFilter>
                </ToolbarItem>
                {projects.length > 1 && (
                  <ToolbarItem>
                    <ToolbarFilter
                      chips={projectFilter ? [projectFilter] : []}
                      deleteChip={() => setProjectFilter('')}
                      categoryName={t('Project')}
                    >
                      <Select
                        isOpen={projectOpen}
                        onOpenChange={setProjectOpen}
                        onSelect={(_e, val) => { setProjectFilter(val === projectFilter ? '' : val as string); setProjectOpen(false); }}
                        toggle={(ref) => (
                          <MenuToggle ref={ref} onClick={() => setProjectOpen(!projectOpen)}>
                            {projectFilter || t('Project')}
                          </MenuToggle>
                        )}
                        selected={projectFilter}
                      >
                        <SelectList>
                          {projects.map((p) => <SelectOption key={p} value={p}>{p} ({applications.filter((a) => a.spec?.project === p).length})</SelectOption>)}
                        </SelectList>
                      </Select>
                    </ToolbarFilter>
                  </ToolbarItem>
                )}
                {activeFilterCount > 0 && (
                  <ToolbarItem>
                    <Badge isRead>{filtered.length} / {applications.length}</Badge>
                  </ToolbarItem>
                )}
                {selected.size > 0 && (
                  <>
                    <ToolbarItem>
                      <Button variant="primary" onClick={bulkSyncSelected}
                        isDisabled={bulkRunning} isLoading={bulkRunning}
                      >
                        {t('Sync Selected')} ({selected.size})
                      </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                      <Button variant="secondary" onClick={bulkRefreshSelected}
                        isDisabled={bulkRunning} isLoading={bulkRunning}
                      >
                        {t('Refresh Selected')} ({selected.size})
                      </Button>
                    </ToolbarItem>
                  </>
                )}
              </ToolbarContent>
            </Toolbar>

            {filtered.length === 0 ? (
              <EmptyState>
                <EmptyStateBody>
                  {activeFilterCount > 0
                    ? t('No applications match the current filters.')
                    : t('No Argo CD applications found.')}
                </EmptyStateBody>
              </EmptyState>
            ) : (
              <>
              <Table aria-label={t('Applications')}>
                <Thead>
                  <Tr>
                    <Th select={{ onSelect: toggleAllFiltered, isSelected: selected.size === filtered.length && filtered.length > 0 }} />
                    <Th {...getSortParams(0)}>{t('Name')}</Th>
                    <Th {...getSortParams(1)}>{t('Project')}</Th>
                    <Th {...getSortParams(2)}>{t('Sync Status')}</Th>
                    <Th {...getSortParams(3)}>{t('Health')}</Th>
                    <Th {...getSortParams(4)}>{t('Repository')}</Th>
                    <Th {...getSortParams(5)}>{t('Destination')}</Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {paginatedItems.map((app: ApplicationResource) => (
                    <Tr key={app.metadata.uid}>
                      <Td select={{ rowIndex: 0, onSelect: () => toggleSelect(app.metadata.uid), isSelected: selected.has(app.metadata.uid) }} />
                      <Td>
                        <ResourceLink
                          groupVersionKind={ApplicationGroupVersionKind}
                          name={app.metadata.name}
                          namespace={app.metadata.namespace}
                        />
                      </Td>
                      <Td>{app.spec?.project}</Td>
                      <Td><SyncStatusIcon status={app.status?.sync?.status ?? 'Unknown'} /></Td>
                      <Td><HealthStatusIcon status={app.status?.health?.status ?? 'Unknown'} /></Td>
                      <Td>{getApplicationSource(app)?.repoURL ? <a href={getApplicationSource(app)!.repoURL} target="_blank" rel="noopener noreferrer">{getApplicationSource(app)!.repoURL}</a> : '-'}</Td>
                      <Td>
                        {app.spec?.destination?.namespace
                          ? <a href={`/k8s/cluster/namespaces/${app.spec?.destination?.namespace}`}>{app.spec?.destination?.name ?? app.spec?.destination?.server ?? ''} / {app.spec?.destination?.namespace}</a>
                          : `${app.spec?.destination?.name ?? app.spec?.destination?.server ?? ''}`}
                      </Td>
                      <Td isActionCell><RowActions app={app} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              <TablePagination page={page} perPage={perPage} totalItems={totalItems} onSetPage={setPage} onPerPageSelect={setPerPage} />
              </>
            )}
          </React.Fragment>
        )}
      </PageSection>
    </React.Fragment>
  );
};

const ApplicationListPageWithProvider = () => (
  <InstanceProvider><ApplicationListPage /></InstanceProvider>
);
export default ApplicationListPageWithProvider;
