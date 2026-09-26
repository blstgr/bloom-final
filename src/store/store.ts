import { configureStore } from '@reduxjs/toolkit';

import favoritesReducer, { hydrateFavorites } from './favoritesSlice';
import { loadPersistedState, persistenceMiddleware } from './persistence';
import settingsReducer, { hydrateSettings } from './settingsSlice';

export const store = configureStore({
  reducer: {
    favorites: favoritesReducer,
    settings: settingsReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().prepend(persistenceMiddleware.middleware),
});

/**
 * Restores whatever was saved. Reading storage is async and `configureStore` needs its initial
 * state synchronously, so the store starts from each slice's defaults and is corrected once the
 * read lands — which happens behind the auth screen, long before any of it is on screen.
 */
export async function hydrateStore(): Promise<void> {
  const persisted = await loadPersistedState();

  if (persisted.favorites) store.dispatch(hydrateFavorites(persisted.favorites));
  // Dispatched even when nothing was saved: a first run has no settings to restore but still has
  // to announce that the read finished, or consumers wait forever for state that will never come.
  store.dispatch(hydrateSettings(persisted.settings ?? {}));
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
