import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

interface SortState<T> {
  sortedItems: T[];
  sortIndex: number;
  sortDirection: SortDirection;
  onSort: (index: number) => void;
  getSortParams: (index: number) => {
    sort: { sortBy: { index: number; direction: SortDirection }; onSort: (_e: unknown, idx: number, dir: SortDirection) => void; columnIndex: number };
  };
}

export function useSortableData<T>(
  items: T[],
  getters: Array<(item: T) => string | number>,
  defaultIndex = 0,
  defaultDirection: SortDirection = 'asc',
): SortState<T> {
  const [sortIndex, setSortIndex] = useState(defaultIndex);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);

  const onSort = (index: number) => {
    if (index === sortIndex) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortIndex(index);
      setSortDirection('asc');
    }
  };

  const sortedItems = useMemo(() => {
    const getter = getters[sortIndex];
    if (!getter) return items;
    return [...items].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb));
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [items, sortIndex, sortDirection, getters]);

  const getSortParams = (index: number) => ({
    sort: {
      sortBy: { index: sortIndex, direction: sortDirection },
      onSort: (_e: unknown, idx: number, dir: SortDirection) => { setSortIndex(idx); setSortDirection(dir); },
      columnIndex: index,
    },
  });

  return { sortedItems, sortIndex, sortDirection, onSort, getSortParams };
}
