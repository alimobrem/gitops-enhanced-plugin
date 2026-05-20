import { useState, useMemo, useEffect, useCallback } from 'react';

interface PaginationState<T> {
  paginatedItems: T[];
  page: number;
  perPage: number;
  totalItems: number;
  setPage: (p: number) => void;
  setPerPage: (pp: number) => void;
}

export function usePagination<T>(items: T[], defaultPerPage = 20): PaginationState<T> {
  const [page, setPageRaw] = useState(1);
  const [perPage, setPerPageState] = useState(defaultPerPage);

  const maxPage = Math.max(1, Math.ceil(items.length / perPage));

  useEffect(() => {
    if (page > maxPage) setPageRaw(maxPage);
  }, [items.length, maxPage, page]);

  const setPage = useCallback((p: number) => setPageRaw(Math.max(1, Math.min(p, maxPage))), [maxPage]);

  const setPerPage = useCallback((pp: number) => {
    setPerPageState(pp);
    setPageRaw(1);
  }, []);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, page, perPage]);

  return { paginatedItems, page, perPage, totalItems: items.length, setPage, setPerPage };
}
