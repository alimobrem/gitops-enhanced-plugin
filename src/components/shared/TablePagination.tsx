import React from 'react';
import type { FC } from 'react';
import { Pagination } from '@patternfly/react-core';

interface TablePaginationProps {
  page: number;
  perPage: number;
  totalItems: number;
  onSetPage: (page: number) => void;
  onPerPageSelect: (perPage: number) => void;
  variant?: 'top' | 'bottom';
}

export const TablePagination: FC<TablePaginationProps> = ({
  page, perPage, totalItems, onSetPage, onPerPageSelect, variant = 'bottom',
}) => {
  if (totalItems <= 20) return null;
  return (
    <Pagination
      itemCount={totalItems}
      perPage={perPage}
      page={page}
      onSetPage={(_e, p) => onSetPage(p)}
      onPerPageSelect={(_e, pp) => onPerPageSelect(pp)}
      variant={variant === 'bottom' ? 'bottom' : 'top'}
      perPageOptions={[
        { title: '10', value: 10 },
        { title: '20', value: 20 },
        { title: '50', value: 50 },
        { title: '100', value: 100 },
      ]}
    />
  );
};
