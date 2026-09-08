'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface FavoriteItem {
	type: 'team' | 'competition';
	id: string;
	name: string;
	addedAt: string;
}

interface SuggestedFavorite {
	type: 'team' | 'competition';
	id: string;
	name: string;
	reason: string;
}

export function useFavorites() {
	const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
	const [isLoaded, setIsLoaded] = useState(false);

	useEffect(() => {
		const loadFavorites = () => {
			try {
				const stored = localStorage.getItem('esporting_favorites');

				if (stored) {
					const parsed = JSON.parse(stored);

					if (Array.isArray(parsed)) {
						setFavorites(parsed);
					}
				}
			} catch (e) {
				console.error('Failed to load favorites from localStorage', e);
			} finally {
				setIsLoaded(true);
			}
		};

		// Defer the state update so the effect isn't synchronously
		// triggering a cascading render.
		const frame = requestAnimationFrame(loadFavorites);

		return () => cancelAnimationFrame(frame);
	}, []);

	const isFavorite = useCallback(
		(type: 'team' | 'competition', id: string) => {
			return favorites.some(
				(item) => item.type === type && item.id === id,
			);
		},
		[favorites],
	);

	const toggleFavorite = useCallback(
		(type: 'team' | 'competition', id: string, name: string) => {
			setFavorites((prev) => {
				const exists = prev.some(
					(item) => item.type === type && item.id === id,
				);

				const updated: FavoriteItem[] = exists
					? prev.filter(
							(item) => !(item.type === type && item.id === id),
						)
					: [
							...prev,
							{
								type,
								id,
								name,
								addedAt: new Date().toISOString(),
							},
						];

				try {
					localStorage.setItem(
						'esporting_favorites',
						JSON.stringify(updated),
					);
				} catch (e) {
					console.error(
						'Failed to save favorites to localStorage',
						e,
					);
				}

				return updated;
			});
		},
		[favorites],
	);

	const [suggestedFavorites, setSuggestedFavorites] = useState<
		SuggestedFavorite[]
	>([]);

	useEffect(() => {
		const supabase = createClient();

		const loadSuggestions = async () => {
			try {
				const { data: comps, error: compsError } = await supabase
					.from('comp_instances')
					.select('id, name')
					.eq('status', 'ongoing')
					.is('deleted_at', null)
					.order('created_at', { ascending: false })
					.limit(2);

				if (compsError) {
					console.error('Failed to load competitions', compsError);
				}

				const { data: teams, error: teamsError } = await supabase
					.from('teams')
					.select('id, name')
					.is('deleted_at', null)
					.order('created_at', { ascending: false })
					.limit(2);

				if (teamsError) {
					console.error('Failed to load teams', teamsError);
				}

				setSuggestedFavorites([
					...(comps ?? []).map((c) => ({
						type: 'competition' as const,
						id: c.id,
						name: c.name,
						reason: 'Active competition',
					})),
					...(teams ?? []).map((t) => ({
						type: 'team' as const,
						id: t.id,
						name: t.name,
						reason: 'Recently active team',
					})),
				]);
			} catch (error) {
				console.error('Failed to load favorite suggestions', error);
			}
		};

		loadSuggestions();
	}, []);

	return {
		favorites,
		isLoaded,
		isFavorite,
		toggleFavorite,
		suggestedFavorites,
	};
}
