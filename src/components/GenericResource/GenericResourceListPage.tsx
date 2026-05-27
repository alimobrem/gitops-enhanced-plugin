import React from 'react';
import { useMemo, type FC } from 'react';
import { Link } from 'react-router-dom';
import {
  useK8sWatchResource,
  DocumentTitle,
  ListPageHeader,
  ResourceLink,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection,
  Alert,
  Button,
  Pagination,
} from '@patternfly/react-core';
import {
  DataView,
  DataViewState,
  DataViewTable,
  DataViewToolbar,
  useDataViewPagination,
} from '@patternfly/react-data-view';
import { CreateResourceButton } from '../shared/CreateResourceButton';

interface ColumnDef {
  title: string;
  field: string;
}

interface GenericResourceListPageProps {
  title: string;
  groupVersionKind: { group: string; version: string; kind: string };
  columns: ColumnDef[];
  getFieldValue?: (resource: Record<string, unknown>, field: string) => string;
  createHref?: string;
  createLabel?: string;
}

function defaultGetFieldValue(resource: Record<string, unknown>, field: string): string {
  const parts = field.split('.');
  let val: unknown = resource;
  for (const p of parts) {
    if (val && typeof val === 'object') {
      val = (val as Record<string, unknown>)[p];
    } else {
      return '-';
    }
  }
  if (val === undefined || val === null) return '-';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

export const GenericResourceListPage: FC<GenericResourceListPageProps> = ({
  title,
  groupVersionKind,
  columns,
  getFieldValue = defaultGetFieldValue,
  createHref,
  createLabel,
}) => {
  const { t } = useTranslation('plugin__gitops-enhanced');

  const [resources, loaded, error] = useK8sWatchResource<
    Array<Record<string, unknown>>
  >({
    groupVersionKind,
    isList: true,
  });

  const items = useMemo(() => resources ?? [], [resources]);
  const pagination = useDataViewPagination({ perPage: 20 });
  const { page, perPage, onSetPage, onPerPageSelect } = pagination;

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, page, perPage]);

  const columnTitles = columns.map((col) => t(col.title));

  const rows = useMemo(() => paginatedItems.map((res) => {
    const meta = res.metadata as { name: string; namespace?: string; uid: string } | undefined;
    return {
      id: meta?.uid ?? '',
      row: columns.map((col, i) =>
        i === 0
          ? <ResourceLink
              key={col.field}
              groupVersionKind={groupVersionKind}
              name={meta?.name ?? ''}
              namespace={meta?.namespace}
            />
          : getFieldValue(res, col.field),
      ),
    };
  }), [paginatedItems, columns, groupVersionKind, getFieldValue]);

  const paginationNode = items.length > 20 ? (
    <Pagination
      itemCount={items.length}
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
      <DocumentTitle>{t(title)}</DocumentTitle>
      <ListPageHeader title={t(title)}>
        {createHref
          ? <Link to={createHref}><Button variant="primary">{createLabel ?? t('Create {{kind}}', { kind: groupVersionKind.kind })}</Button></Link>
          : <CreateResourceButton group={groupVersionKind.group} version={groupVersionKind.version} kind={groupVersionKind.kind} />
        }
      </ListPageHeader>
      <PageSection>
        {error && (
          <Alert variant="danger" isInline title={t('Error loading resources')}>
            {(error as Error).message}
          </Alert>
        )}

        <DataView
          activeState={
            !loaded && !error ? DataViewState.loading
            : loaded && items.length === 0 && !error ? DataViewState.empty
            : undefined
          }
        >
          {paginationNode && (
            <DataViewToolbar pagination={paginationNode} />
          )}
          <DataViewTable
            aria-label={t(title)}
            columns={columnTitles}
            rows={rows}
          />
        </DataView>

        {loaded && paginationNode && items.length > 0 && (
          <Pagination
            itemCount={items.length}
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
    </React.Fragment>
  );
};

export default GenericResourceListPage;
