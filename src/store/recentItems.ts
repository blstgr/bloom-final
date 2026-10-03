/** How many recent searches a search screen keeps: eight 44pt rows fill the space above the
 * docked input and keyboard on a standard phone. One number for both searches (§1). */
export const MAX_RECENT_ITEMS = 8;

/**
 * The "recent searches" rule both searches share (docs/search-spec.md §1): the newest pick goes
 * first, an earlier pick of the same thing moves up rather than appearing twice, and the oldest
 * fall off past {@link MAX_RECENT_ITEMS}. Written once so recent cities and recent plants cannot
 * drift apart.
 */
export function pushRecentItem<Item>(
  items: readonly Item[],
  item: Item,
  getKey: (item: Item) => string,
): Item[] {
  const key = getKey(item);

  return [item, ...items.filter(existing => getKey(existing) !== key)].slice(0, MAX_RECENT_ITEMS);
}
