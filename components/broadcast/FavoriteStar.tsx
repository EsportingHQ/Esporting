'use client';

import { Star } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';

interface FavoriteStarProps {
  entityType: 'team' | 'competition';
  entityId: string;
  entityName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FavoriteStar({
  entityType,
  entityId,
  entityName,
  size = 'md',
  className = '',
}: FavoriteStarProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(entityType, entityId);

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(entityType, entityId, entityName);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={active ? `Remove ${entityName} from favorites` : `Add ${entityName} to favorites`}
      aria-pressed={active}
      className={`p-1 rounded hover:bg-bg-void/60 transition-all focus-ring text-text-muted hover:text-accent-favorite ${
        active ? 'text-accent-favorite' : ''
      } ${className}`}
    >
      <Star
        className={`${iconSizes[size]} transition-transform duration-200 ${
          active ? 'fill-accent-favorite text-accent-favorite scale-110' : ''
        }`}
      />
    </button>
  );
}
