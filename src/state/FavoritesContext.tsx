import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { loadFavorites, saveFavorites } from './preferencesStorage';

interface FavoritesContextValue {
  favorites: Set<string>;
  isFavorite: (playerId: string) => boolean;
  toggleFavorite: (playerId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());

  const toggleFavorite = useCallback((playerId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((playerId: string) => favorites.has(playerId), [favorites]);

  const value = useMemo(() => ({ favorites, isFavorite, toggleFavorite }), [favorites, isFavorite, toggleFavorite]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
}
