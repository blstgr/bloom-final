import { configureStore } from '@reduxjs/toolkit';

import favoritesReducer from './favoritesSlice';
import settingsReducer from './settingsSlice';

export const store = configureStore({
  reducer: {
    favorites: favoritesReducer,
    settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
