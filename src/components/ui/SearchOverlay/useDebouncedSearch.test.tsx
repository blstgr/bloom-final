import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { useDebouncedSearch, type DebouncedSearch, type UseDebouncedSearchOptions } from './useDebouncedSearch';

/** A minimal renderHook: renders a component that calls the hook and exposes its latest value. */
function renderSearch<Item>(options: UseDebouncedSearchOptions<Item>) {
  const result = { current: undefined as unknown as DebouncedSearch<Item> };
  function Probe() {
    result.current = useDebouncedSearch(options);
    return null;
  }
  act(() => {
    ReactTestRenderer.create(<Probe />);
  });

  return {
    result,
    type: (query: string) => act(() => result.current.setQuery(query)),
  };
}

const seedThenRemote = {
  merge: (instant: string[], remote: string[]) => [...instant, ...remote],
  results: () => ['seed'],
};

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays idle below the minimum length and makes no request', () => {
    const search = jest.fn(() => Promise.resolve(['x']));
    const { result, type } = renderSearch({ search });

    type('m');
    act(() => jest.runAllTimers());

    expect(result.current.status).toBe('idle');
    expect(search).not.toHaveBeenCalled();
  });

  it('debounces typing into one request', async () => {
    const search = jest.fn((query: string) => Promise.resolve([query]));
    const { result, type } = renderSearch({ search });

    type('mo');
    type('mon');
    type('mons');
    await act(async () => {
      jest.runAllTimers();
    });

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('mons');
    expect(result.current).toMatchObject({ query: 'mons', results: ['mons'], status: 'results' });
  });

  it('drops a stale answer that arrives after a newer query', async () => {
    let resolveFirst: (value: string[]) => void = () => undefined;
    const search = jest
      .fn()
      .mockImplementationOnce(() => new Promise<string[]>(resolve => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => Promise.resolve(['monstera']));
    const { result, type } = renderSearch<string>({ search });

    type('mon');
    act(() => jest.runAllTimers());
    type('monstera');
    await act(async () => {
      jest.runAllTimers();
    });
    await act(async () => {
      resolveFirst(['money tree']);
    });

    expect(result.current.results).toEqual(['monstera']);
  });

  it('shows instant results at once and merges remote ones after', async () => {
    const { result, type } = renderSearch({
      instant: seedThenRemote,
      search: () => Promise.resolve(['remote']),
    });

    type('ze');
    expect(result.current.results).toEqual(['seed']);
    await act(async () => {
      jest.runAllTimers();
    });
    expect(result.current.results).toEqual(['seed', 'remote']);
  });

  it('keeps the merged list up while the next request is in flight', async () => {
    const { result, type } = renderSearch({
      instant: { ...seedThenRemote, results: (query: string) => (query === 'zz' ? [] : ['seed']) },
      search: (query: string) => Promise.resolve([`remote ${query}`]),
    });

    type('ze');
    await act(async () => {
      jest.runAllTimers();
    });
    // No instant match for the next query: the previous remote answer stays rather than the list
    // dropping to nothing until the request lands.
    type('zz');

    expect(result.current.results).toEqual(['remote ze']);
    await act(async () => {
      jest.runAllTimers();
    });
    expect(result.current.results).toEqual(['remote zz']);
  });

  it('keeps instant results when the request fails, and reports the failure only without them', async () => {
    const failing = () => Promise.reject(new Error('offline'));
    const withInstant = renderSearch({ instant: seedThenRemote, search: failing });
    const without = renderSearch<string>({ search: failing });

    withInstant.type('ze');
    without.type('ze');
    await act(async () => {
      jest.runAllTimers();
    });

    expect(withInstant.result.current).toMatchObject({ results: ['seed'], status: 'results' });
    expect(without.result.current).toMatchObject({ results: [], status: 'error' });
  });
});
