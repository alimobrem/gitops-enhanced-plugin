import React from 'react';
import { useMemo, type FC } from 'react';
import { Link } from 'react-router-dom';
import {
  DocumentTitle,
  ListPageHeader,
  ResourceLink,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection,
  Alert,
  Label,
  Pagination,
  EmptyState,
  EmptyStateBody,
  Title,
  Bullseye,
  Spinner,
} from '@patternfly/react-core';
import {
  DataView,
  DataViewState,
  DataViewTable,
  DataViewToolbar,
  DataViewFilters,
  DataViewTextFilter,
  DataViewCheckboxFilter,
  useDataViewFilters,
  useDataViewPagination,
  useDataViewSort,
} from '@patternfly/react-data-view';
import { usePromotionStrategies } from '../../hooks/usePromotionStrategies';
import { useActiveNamespace } from '@openshift-console/dynamic-plugin-sdk';
import { PromotionStrategyGroupVersionKind } from '../../models';
import { derivePipelineStatus, deriveEnvLabel, statusLabelColor } from '../../utils/promotion';
import type { PromotionStrategyResource } from '../../types';
import type { PipelineStageStatus } from '../../utils/promotion';

const STATUS_OPTIONS: PipelineStageStatus[] = ['healthy', 'promoting', 'blocked', 'pending'];
const COLUMN_KEYS = ['name', 'repository', 'environments', 'status', 'activeEnv'] as const;

interface FilterValues {
  name: string;
  status: string[];
}

const INITIAL_FILTERS: FilterValues = { name: '', status: [] };

export const PromotionListPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [activeNamespace] = useActiveNamespace();
  const ns = activeNamespace === '#ALL_NS#' ? undefined : activeNamespace;
  const [strategies, loaded, error] = usePromotionStrategies(ns);

  const { filters, onSetFilters, clearAllFilters } = useDataViewFilters<FilterValues>({
    initialFilters: INITIAL_FILTERS,
  });

  const { sortBy, direction, onSort } = useDataViewSort({
    initialSort: { sortBy: COLUMN_KEYS[0], direction: 'asc' },
  });

  const { page, perPage, onSetPage, onPerPageSelect } = useDataViewPagination({
    perPage: 20,
  });

  const derived = useMemo(
    () => strategies.map((s) => ({ strategy: s, ...derivePipelineStatus(s) })),
    [strategies],
  );

  const filtered = useMemo(() => {
    let items = derived;
    if (filters.name) {
      const lower = filters.name.toLowerCase();
      items = items.filter((d) => d.strategy.metadata.name.toLowerCase().includes(lower));
    }
    if (filters.status.length > 0) {
      items = items.filter((d) => filters.status.includes(d.overallStatus));
    }
    return items;
  }, [derived, filters]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const dir = direction === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return dir * a.strategy.metadata.name.localeCompare(b.strategy.metadata.name);
        case 'status':
          return dir * a.overallStatus.localeCompare(b.overallStatus);
        default:
          return 0;
      }
    });
    return copy;
  }, [filtered, sortBy, direction]);

  const paginatedItems = useMemo(
    () => sorted.slice((page - 1) * perPage, page * perPage),
    [sorted, page, perPage],
  );

  const makeSortProps = (key: string) => ({
    sort: {
      sortBy: { index: COLUMN_KEYS.indexOf(key as typeof COLUMN_KEYS[number]), direction },
      onSort: (_e: unknown, _idx: number, dir: 'asc' | 'desc') => onSort(key, dir),
      columnIndex: COLUMN_KEYS.indexOf(key as typeof COLUMN_KEYS[number]),
    },
  });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    derived.forEach((d) => { counts[d.overallStatus] = (counts[d.overallStatus] ?? 0) + 1; });
    return counts;
  }, [derived]);

  const activeEnvLabel = (stages: typeof derived[0]['stages']): string => {
    for (let i = stages.length - 1; i >= 0; i--) {
      if (stages[i].activeSha) return stages[i].label;
    }
    return stages[0]?.label ?? '-';
  };

  if (!loaded && !error) {
    return (
      <PageSection>
        <Bullseye><Spinner /></Bullseye>
      </PageSection>
    );
  }

  const columns = [
    { cell: t('Name'), props: makeSortProps('name') },
    { cell: t('Repository') },
    { cell: t('Environments') },
    { cell: t('Status'), props: makeSortProps('status') },
    { cell: t('Active Environment') },
  ];

  const rows = paginatedItems.map((d) => ({
    id: d.strategy.metadata.uid,
    row: [
      <ResourceLink
        key="name"
        groupVersionKind={PromotionStrategyGroupVersionKind}
        name={d.strategy.metadata.name}
        namespace={d.strategy.metadata.namespace}
      />,
      d.strategy.spec.gitRepositoryRef.name,
      d.stages.map((s) => s.label).join(' → '),
      <Label key="status" isCompact color={statusLabelColor[d.overallStatus]}>
        {d.overallStatus}
      </Label>,
      activeEnvLabel(d.stages),
    ],
  }));

  const pagination = (
    <Pagination
      itemCount={filtered.length}
      perPage={perPage}
      page={page}
      onSetPage={(_e, p) => onSetPage(p)}
      onPerPageSelect={(_e, pp) => onPerPageSelect(pp)}
      isCompact
    />
  );

  return (
    <React.Fragment>
      <DocumentTitle>{t('Promotion Pipelines')}</DocumentTitle>
      <ListPageHeader title={t('Promotion Pipelines')}>
        <Link to="/gitops/create-promotion" className="pf-v6-c-button pf-m-primary">
          {t('Create Pipeline')}
        </Link>
      </ListPageHeader>
      <PageSection>
        {error && (
          <Alert variant="danger" isInline title={t('Error loading PromotionStrategies')} className="pf-v6-u-mb-md">
            {error.message}
          </Alert>
        )}

        {loaded && strategies.length === 0 ? (
          <EmptyState>
            <Title headingLevel="h4" size="lg">{t('No promotion pipelines')}</Title>
            <EmptyStateBody>
              {t('Create a PromotionStrategy to enable automated environment promotion.')}
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <DataView activeState={!loaded ? DataViewState.loading : undefined}>
            <DataViewToolbar
              clearAllFilters={clearAllFilters}
              pagination={pagination}
            >
              <DataViewFilters>
                <DataViewTextFilter
                  filterId="name"
                  title={t('Name')}
                  value={filters.name}
                  onChange={(_e, val) => onSetFilters({ name: val })}
                />
                <DataViewCheckboxFilter
                  filterId="status"
                  title={t('Status')}
                  value={filters.status}
                  onChange={(_e, vals) => onSetFilters({ status: vals })}
                  options={STATUS_OPTIONS.map((s) => ({
                    label: `${s} (${statusCounts[s] ?? 0})`,
                    value: s,
                  }))}
                />
              </DataViewFilters>
            </DataViewToolbar>
            <DataViewTable
              aria-label={t('Promotion Pipelines')}
              columns={columns}
              rows={rows}
            />
            <DataViewToolbar pagination={pagination} />
          </DataView>
        )}
      </PageSection>
    </React.Fragment>
  );
};

export default PromotionListPage;
