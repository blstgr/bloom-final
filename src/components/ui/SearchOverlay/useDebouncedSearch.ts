import React from 'react';

/** Below two characters a substring match is too broad to be worth a request — nearly every name
 * contains any single common letter. */
const DEFAULT_MIN_QUERY_LENGTH = 2;
/** Waits for a pause in typing, so a whole word costs one request instead of one per keystroke —
 * Perenual's free tier allows 100 a day. */
const SEARCH_DEBOUNCE_MS = 350;

export type SearchStatus = 'idle' | 'loading' | 'results' | 'empty' | 'error';

/**
 * Answers available without a request (the shipped plant catalog), and how they combine with the
 * remote ones. One object rather than two optionals: instant results with no rule for combining
 * them would have nowhere to go once the request answers.
 */
export type InstantSearch<Item> = {
  /** Combines the two lists. Also runs before the request answers, against the previous remote
   * answer, so the list does not flash down to the instant subset on every keystroke. */
  merge: (instant: Item[], remote: Item[]) => Item[];
  /** Shown the moment the query changes, and kept even if the remote search then fails. */
  results: (query: string) => Item[];
};

export type UseDebouncedSearchOptions<Item> = {
  instant?: InstantSearch<Item>;
  /** The shortest query worth sending. Defaults to 2; a service that answers nothing below some
   * length (Open-Meteo's geocoder returns no city for two letters) sets its own, so the screen
   * stays on recent searches instead of announcing a false "no matches". */
  minQueryLength?: number;
  search: (query: string) => Promise<Item[]>;
};

/** Everything a search screen renders from: the query it edits and what that query found. */
export type DebouncedSearch<Item> = {
  query: string;
  results: Item[];
  setQuery: (query: string) => void;
  status: SearchStatus;
};

/**
 * Query in, results out: the minimum length, the debounce, and the race between overlapping
 * requests — a slow answer to "mon" must never overwrite the answer to "monstera".
 *
 * While a request is in flight the previous results stay up, so the list does not blank on every
 * keystroke (docs/search-spec.md §1.3).
 */
export function useDebouncedSearch<Item>({
  instant,
  minQueryLength = DEFAULT_MIN_QUERY_LENGTH,
  search,
}: UseDebouncedSearchOptions<Item>): DebouncedSearch<Item> {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<Item[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const requestIdRef = React.useRef(0);
  // The last remote answer, merged under each keystroke's instant results until the next one
  // lands. Dropped when the query falls below the minimum, so a fresh search starts clean.
  const lastRemoteRef = React.useRef<Item[]>([]);
  // Held in refs so a caller passing inline functions does not restart the debounce on every
  // render; only a changed query does.
  const searchRef = React.useRef(search);
  const instantRef = React.useRef(instant);
  searchRef.current = search;
  instantRef.current = instant;

  const normalizedQuery = query.trim();
  const isSearching = normalizedQuery.length >= minQueryLength;

  React.useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!isSearching) {
      lastRemoteRef.current = [];
      setResults([]);
      setHasError(false);
      setIsLoading(false);

      return undefined;
    }

    const instantSearch = instantRef.current;
    const instantResults = instantSearch?.results(normalizedQuery) ?? [];
    if (instantSearch) setResults(instantSearch.merge(instantResults, lastRemoteRef.current));
    setHasError(false);
    setIsLoading(true);

    const timeout = setTimeout(() => {
      searchRef.current(normalizedQuery)
        .then(remote => {
          if (requestIdRef.current !== requestId) return;
          lastRemoteRef.current = remote;
          setResults(instantSearch ? instantSearch.merge(instantResults, remote) : remote);
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          // Instant answers are still valid, so the failure only surfaces when the request was
          // the only thing that could have produced results. The previous remote answer belongs
          // to another query, so it goes either way.
          lastRemoteRef.current = [];
          setResults(instantResults);
          if (instantResults.length === 0) setHasError(true);
        })
        .finally(() => {
          if (requestIdRef.current === requestId) setIsLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [isSearching, normalizedQuery]);

  return {
    query,
    results,
    setQuery,
    status: resolveStatus({ hasError, isLoading, isSearching, results }),
  };
}

function resolveStatus({
  hasError,
  isLoading,
  isSearching,
  results,
}: {
  hasError: boolean;
  isLoading: boolean;
  isSearching: boolean;
  results: unknown[];
}): SearchStatus {
  if (!isSearching) return 'idle';
  if (hasError) return 'error';
  if (results.length > 0) return 'results';
  if (isLoading) return 'loading';

  return 'empty';
}
