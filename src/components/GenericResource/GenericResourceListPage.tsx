import React from 'react';
import type { FC } from 'react';
import {
  useK8sWatchResource,
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
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { CreateResourceButton } from '../shared/CreateResourceButton';
import { TablePagination } from '../shared/TablePagination';
import { usePagination } from '../../hooks/usePagination';

interface ColumnDef {
  title: string;
  field: string;
}

interface GenericResourceListPageProps {
  title: string;
  groupVersionKind: { group: string; version: string; kind: string };
  columns: ColumnDef[];
  getFieldValue?: (resource: Record<string, unknown>, field: string) => string;
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
}) => {
  const { t } = useTranslation('plugin__gitops-enhanced');

  const [resources, loaded, error] = useK8sWatchResource<
    Array<Record<string, unknown>>
  >({
    groupVersionKind,
    isList: true,
  });

  const items = resources ?? [];
  const { paginatedItems, page, perPage, totalItems, setPage, setPerPage } = usePagination(items);

  return (
    <React.Fragment>
      <DocumentTitle>{t(title)}</DocumentTitle>
      <ListPageHeader title={t(title)}>
        <CreateResourceButton group={groupVersionKind.group} version={groupVersionKind.version} kind={groupVersionKind.kind} />
      </ListPageHeader>
      <PageSection>
        {error && (
          <Alert variant="danger" isInline title={t('Error loading resources')}>
            {(error as Error).message}
          </Alert>
        )}
        {!loaded && !error && (
          <Bullseye>
            <Spinner />
          </Bullseye>
        )}
        {loaded && items.length === 0 && !error && (
          <EmptyState>
            <EmptyStateBody>
              {t('No {{kind}} resources found.', { kind: groupVersionKind.kind })}
            </EmptyStateBody>
          </EmptyState>
        )}
        {loaded && items.length > 0 && (
          <>
          <Table aria-label={t(title)}>
            <Thead>
              <Tr>
                {columns.map((col) => (
                  <Th key={col.field}>{t(col.title)}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {paginatedItems.map((res) => {
                const meta = res.metadata as { name: string; namespace?: string; uid: string };
                return (
                  <Tr key={meta.uid}>
                    {columns.map((col, i) => (
                      <Td key={col.field}>
                        {i === 0 ? (
                          <ResourceLink
                            groupVersionKind={groupVersionKind}
                            name={meta.name}
                            namespace={meta.namespace}
                          />
                        ) : (
                          getFieldValue(res, col.field)
                        )}
                      </Td>
                    ))}
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
          <TablePagination page={page} perPage={perPage} totalItems={totalItems} onSetPage={setPage} onPerPageSelect={setPerPage} />
          </>
        )}
      </PageSection>
    </React.Fragment>
  );
};

export default GenericResourceListPage;
