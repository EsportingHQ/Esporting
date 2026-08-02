'use client';

import { useState, useEffect, useCallback } from 'react';

export interface FavoriteItem {
  type: 'team' | 'competition';
  id: string;
  name: string;
  addedAt: string;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('esporting_favorites');
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load favorites from localStorage', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveFavorites = (items: FavoriteItem[]) => {
    setFavorites(items);
    try {
      localStorage.setItem('esporting_favorites', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save favorites to localStorage', e);
    }
  };

  const isFavorite = useCallback(
    (type: 'team' | 'competition', id: string) => {
      return favorites.some((item) => item.type === type && item.id === id);
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    (type: 'team' | 'competition', id: string, name: string) => {
      setFavorites((prev) => {
        const exists = prev.some((item) => item.type === type && item.id === id);
        let updated: FavoriteItem[];
        if (exists) {
          updated = prev.filter((item) => !(item.type === type && item.id === id));
        } else {
          updated = [...prev, { type, id, name, addedAt: new Date().toISOString() }];
        }
        try {
          localStorage.setItem('esporting_favorites', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    },
    []
  );

  // Timezone & locale based smart suggestions
  const getSuggestedFavorites = useCallback(() => {
    let timezone = '';
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch (e) {}

    const isAfricanRegion =
      timezone.includes('Lagos') ||
      timezone.includes('Africa') ||
      timezone.includes('Cairo') ||
      timezone.includes('Johannesburg');

    if (isAfricanRegion) {
      return [
        { type: 'team' as const, id: '1', name: 'Team Kuti', reason: 'Popular in your region (West Africa)' },
        { type: 'team' as const, id: '2', name: 'Team Bello', reason: 'Popular in your region (West Africa)' },
        { type: 'competition' as const, id: 'c1', name: 'UI eSports League Season 1', reason: 'Top regional tournament' },
        { type: 'competition' as const, id: 'c2', name: 'CODM Battle Royale Arena', reason: 'Trending tournament' },
      ];
    }

    return [
      { type: 'team' as const, id: '1', name: 'Team Kuti', reason: 'Top performing FC 26 squad' },
      { type: 'team' as const, id: '2', name: 'Team Bello', reason: 'Leading CODM MP squad' },
      { type: 'competition' as const, id: 'c1', name: 'UI eSports League Season 1', reason: 'Featured league' },
    ];
  }, []);

  return {
    favorites,
    isLoaded,
    isFavorite,
    toggleFavorite,
    suggestedFavorites: getSuggestedFavorites(),
  };
}
