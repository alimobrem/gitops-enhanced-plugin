import React from 'react';
import { useState, useMemo, type FC } from 'react';
import { ResourceLink } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  EmptyState, EmptyStateBody, Button, Alert, AlertActionCloseButton,
  Toolbar, ToolbarContent, ToolbarItem,
  Select, SelectOption, SelectList, MenuToggle, Label,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { SyncStatusIcon } from '../shared/SyncStatusIcon';
import { HealthStatusIcon } from '../shared/HealthStatusIcon';
import { useApplicationActions } from '../../hooks/useApplicationActions';
import type { ApplicationResource, SyncStatusCode } from '../../types';

interface ManagedResource {
  group?: string;
  version: string;
  kind: string;
  namespace?: string;
  name: string;
  status: SyncStatusCode;
  health?: { status: string };
}

export const ResourcesTab: FC<{ app: ApplicationResource }> = ({ app }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { sync } = useApplicationActions(app);
  const resources = useMemo(() => app.status?.resources ?? [], [app.status?.resources]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [kindOpen, setKindOpen] = useState(false);

  const resourceKey = (r: ManagedResource) => `${r.group ?? ''}/${r.kind}/${r.namespace ?? ''}/${r.name}`;

  const kinds = useMemo(() => [...new Set(resources.map((r) => r.kind))].sort(), [resources]);

  const filtered = useMemo(() =>
    kindFilter ? resources.filter((r) => r.kind === kindFilter) : resources,
  [resources, kindFilter]);

  const toggleSelect = (r: ManagedResource) => {
    const key = resourceKey(r);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(resourceKey)));
    }
  };

  const syncSelected = async () => {
    setSyncing(true);
    setSyncError('');
    try {
      const items = resources
        .filter((r) => selected.has(resourceKey(r)))
        .map((r) => ({ group: r.group ?? '', kind: r.kind, name: r.name, namespace: r.namespace }));
      await sync(undefined, items);
      setSelected(new Set());
    } catch (e) {
      setSyncError((e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  if (resources.length === 0) {
    return <EmptyState><EmptyStateBody>{t('No managed resources found.')}</EmptyStateBody></EmptyState>;
  }

  const outOfSyncCount = resources.filter((r) => r.status !== 'Synced').length;

  return (
    <div className="pf-v6-u-mt-md">
      {syncError && (
        <Alert variant="danger" isInline title={t('Sync failed')}
          actionClose={<AlertActionCloseButton onClose={() => setSyncError('')} />}
          className="pf-v6-u-mb-md"
        >{syncError}</Alert>
      )}
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <Button variant="primary" onClick={syncSelected}
              isDisabled={selected.size === 0 || syncing}
              isLoading={syncing}
            >
              {t('Sync Selected')} ({selected.size})
            </Button>
          </ToolbarItem>
          {outOfSyncCount > 0 && (
            <ToolbarItem>
              <Button variant="secondary" onClick={() => {
                const oos = resources.filter((r) => r.status !== 'Synced');
                setSelected(new Set(oos.map(resourceKey)));
              }}>
                {t('Select OutOfSync')} ({outOfSyncCount})
              </Button>
            </ToolbarItem>
          )}
          <ToolbarItem>
            <Select
              isOpen={kindOpen}
              onOpenChange={setKindOpen}
              onSelect={(_e, val) => { setKindFilter(val === 'all' ? '' : val as string); setKindOpen(false); }}
              toggle={(ref) => (
                <MenuToggle ref={ref} onClick={() => setKindOpen(!kindOpen)}>
                  {kindFilter || t('All Kinds')} ({kindFilter ? filtered.length : resources.length})
                </MenuToggle>
              )}
              selected={kindFilter || 'all'}
              aria-label={t('Filter by kind')}
            >
              <SelectList>
                <SelectOption value="all">{t('All Kinds')} ({resources.length})</SelectOption>
                {kinds.map((k) => {
                  const count = resources.filter((r) => r.kind === k).length;
                  return <SelectOption key={k} value={k}>{k} ({count})</SelectOption>;
                })}
              </SelectList>
            </Select>
          </ToolbarItem>
          <ToolbarItem>
            <Label isCompact>{filtered.length} {t('resources')}</Label>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <Table aria-label={t('Managed Resources')} isStriped isCompact>
        <Thead>
          <Tr>
            <Th select={{ onSelect: toggleAll, isSelected: selected.size === filtered.length && filtered.length > 0 }} />
            <Th>{t('Name')}</Th>
            <Th>{t('Kind')}</Th>
            <Th>{t('Namespace')}</Th>
            <Th>{t('Sync Status')}</Th>
            <Th>{t('Health')}</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filtered.map((res) => {
            const key = resourceKey(res);
            const gvk = { group: res.group ?? '', version: res.version, kind: res.kind };
            return (
              <Tr key={key}>
                <Td select={{ rowIndex: 0, onSelect: () => toggleSelect(res), isSelected: selected.has(key) }} />
                <Td><ResourceLink groupVersionKind={gvk} name={res.name} namespace={res.namespace} /></Td>
                <Td><Label isCompact>{res.kind}</Label></Td>
                <Td>{res.namespace ?? '-'}</Td>
                <Td><SyncStatusIcon status={res.status ?? 'Unknown'} /></Td>
                <Td>{res.health ? <HealthStatusIcon status={res.health.status as never} /> : '-'}</Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </div>
  );
};

export default ResourcesTab;
