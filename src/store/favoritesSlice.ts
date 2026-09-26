import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ImageSourcePropType } from 'react-native';

export type FavoriteItem = {
  speciesId: string;
  speciesName: string;
  image: ImageSourcePropType;
  addedAt: string;
};

export type FavoritesState = FavoriteItem[];

const initialState: FavoritesState = [];

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    addFavorite: (state, action: PayloadAction<FavoriteItem>) => {
      const alreadyPresent = state.some(item => item.speciesId === action.payload.speciesId);
      if (!alreadyPresent) {
        state.push(action.payload);
      }
    },
    removeFavorite: (state, action: PayloadAction<string>) => {
      const existingIndex = state.findIndex(item => item.speciesId === action.payload);
      if (existingIndex !== -1) {
        state.splice(existingIndex, 1);
      }
    },
    /** Replaces the list wholesale with what was read from storage. Deliberately not matched by
     * the persistence listener, so restoring cannot trigger a write back. */
    hydrateFavorites: (state, action: PayloadAction<FavoritesState>) => {
      state.splice(0, state.length, ...action.payload);
    },
    toggleFavorite: (state, action: PayloadAction<FavoriteItem>) => {
      const existingIndex = state.findIndex(item => item.speciesId === action.payload.speciesId);
      if (existingIndex === -1) {
        state.push(action.payload);
      } else {
        state.splice(existingIndex, 1);
      }
    },
  },
});

export const {
  addFavorite,
  hydrateFavorites,
  removeFavorite,
  toggleFavorite,
} = favoritesSlice.actions;
export default favoritesSlice.reducer;
