import React from 'react';
import { useState, useMemo, type FC } from 'react';
import {
  DocumentTitle,
  ListPageHeader,
  ResourceLink,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection,
  Bullseye,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Alert,
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
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { useApplications } from '../../hooks/useApplications';
import { useCurrentInstance } from '../../hooks/useArgoCDInstances';
import { InstanceProvider } from '../shared/InstanceProvider';
import { CreateResourceButton } from '../shared/CreateResourceButton';
import { SyncStatusIcon } from '../shared/SyncStatusIcon';
import { HealthStatusIcon } from '../shared/HealthStatusIcon';
import { ApplicationGroupVersionKind } from '../../models';
import type { ApplicationResource, SyncStatusCode, HealthStatusCode } from '../../types';

const SYNC_OPTIONS: SyncStatusCode[] = ['Synced', 'OutOfSync', 'Unknown'];
const HEALTH_OPTIONS: HealthStatusCode[] = ['Healthy', 'Degraded', 'Progressing', 'Suspended', 'Missing', 'Unknown'];

export const ApplicationListPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { instance } = useCurrentInstance();
  const [applications, loaded, error] = useApplications();

  const [nameFilter, setNameFilter] = useState('');
  const [syncFilter, setSyncFilter] = useState<string>('');
  const [healthFilter, setHealthFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [syncOpen, setSyncOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  const projects = useMemo(() => {
    const set = new Set(applications.map((a) => a.spec.project));
    return [...set].sort();
  }, [applications]);

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      if (nameFilter && !app.metadata.name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
      if (syncFilter && (app.status?.sync?.status ?? 'Unknown') !== syncFilter) return false;
      if (healthFilter && (app.status?.health?.status ?? 'Unknown') !== healthFilter) return false;
      if (projectFilter && app.spec.project !== projectFilter) return false;
      return true;
    });
  }, [applications, nameFilter, syncFilter, healthFilter, projectFilter]);

  const activeFilterCount = [syncFilter, healthFilter, projectFilter, nameFilter].filter(Boolean).length;

  return (
    <React.Fragment>
      <DocumentTitle>{t('Applications')}</DocumentTitle>
      <ListPageHeader title={t('Applications')}>
        <CreateResourceButton group="argoproj.io" version="v1alpha1" kind="Application" namespace={instance.namespace} />
      </ListPageHeader>
      <PageSection>
        {error && (
          <Alert variant="danger" isInline title={t('Error loading applications')}>
            {error.message}
          </Alert>
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
                        {SYNC_OPTIONS.map((s) => <SelectOption key={s} value={s}>{s}</SelectOption>)}
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
                        {HEALTH_OPTIONS.map((h) => <SelectOption key={h} value={h}>{h}</SelectOption>)}
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
                          {projects.map((p) => <SelectOption key={p} value={p}>{p}</SelectOption>)}
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
              <Table aria-label={t('Applications')}>
                <Thead>
                  <Tr>
                    <Th>{t('Name')}</Th>
                    <Th>{t('Project')}</Th>
                    <Th>{t('Sync Status')}</Th>
                    <Th>{t('Health')}</Th>
                    <Th>{t('Repository')}</Th>
                    <Th>{t('Destination')}</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filtered.map((app: ApplicationResource) => (
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
                      <Td>{app.spec.source?.repoURL ?? app.spec.sources?.[0]?.repoURL ?? '-'}</Td>
                      <Td>{`${app.spec.destination.name ?? app.spec.destination.server ?? ''} / ${app.spec.destination.namespace ?? ''}`}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
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
