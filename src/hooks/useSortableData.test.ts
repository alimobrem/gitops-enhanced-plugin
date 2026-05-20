import { renderHook, act } from '@testing-library/react-hooks';
import { useSortableData } from './useSortableData';

describe('useSortableData', () => {
  const items = [{ name: 'banana', age: 2 }, { name: 'apple', age: 3 }, { name: 'cherry', age: 1 }];
  const getters = [(i: typeof items[0]) => i.name, (i: typeof items[0]) => i.age];

  it('sorts by first column ascending by default', () => {
    const { result } = renderHook(() => useSortableData(items, getters));
    expect(result.current.sortedItems.map((i) => i.name)).toEqual(['apple', 'banana', 'cherry']);
  });

  it('toggles direction on same column', () => {
    const { result } = renderHook(() => useSortableData(items, getters));
    act(() => result.current.onSort(0));
    expect(result.current.sortedItems.map((i) => i.name)).toEqual(['cherry', 'banana', 'apple']);
  });

  it('sorts by different column', () => {
    const { result } = renderHook(() => useSortableData(items, getters));
    act(() => result.current.onSort(1));
    expect(result.current.sortedItems.map((i) => i.name)).toEqual(['cherry', 'banana', 'apple']);
  });
});
