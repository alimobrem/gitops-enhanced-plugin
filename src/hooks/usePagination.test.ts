import { renderHook, act } from '@testing-library/react-hooks';
import { usePagination } from './usePagination';

describe('usePagination', () => {
  const items = Array.from({ length: 50 }, (_, i) => i);

  it('returns first page by default', () => {
    const { result } = renderHook(() => usePagination(items, 10));
    expect(result.current.paginatedItems).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(result.current.totalItems).toBe(50);
  });

  it('changes page', () => {
    const { result } = renderHook(() => usePagination(items, 10));
    act(() => result.current.setPage(3));
    expect(result.current.paginatedItems).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
  });

  it('resets to page 1 when perPage changes', () => {
    const { result } = renderHook(() => usePagination(items, 10));
    act(() => result.current.setPage(3));
    act(() => result.current.setPerPage(25));
    expect(result.current.page).toBe(1);
    expect(result.current.paginatedItems.length).toBe(25);
  });
});
