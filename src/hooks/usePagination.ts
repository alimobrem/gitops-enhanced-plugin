import { useState, useMemo } from 'react';

interface PaginationState<T> {
  paginatedItems: T[];
  page: number;
  perPage: number;
  totalItems: number;
  setPage: (p: number) => void;
  setPerPage: (pp: number) => void;
}

export function usePagination<T>(items: T[], defaultPerPage = 20): PaginationState<T> {
  const [page, setPage] = useState(1);
  const [perPage, setPerPageState] = useState(defaultPerPage);

  const setPerPage = (pp: number) => {
    setPerPageState(pp);
    setPage(1);
  };

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, page, perPage]);

  return { paginatedItems, page, perPage, totalItems: items.length, setPage, setPerPage };
}
