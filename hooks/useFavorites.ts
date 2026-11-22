'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface FavoriteItem {
  type: 'team' | 'competition';
  id: string;
  name: string;
  addedAt: string;
}

const KEY = 'esporting_favorites';

// One shared list for the whole page, so every star updates together.
let items: FavoriteItem[] = [];
let userId: string | null = null;
let started = false;
const listeners = new Set<() => void>();
const EMPTY: FavoriteItem[] = [];

function emit() {
  listeners.forEach((l) => l());
}
function setItems(next: FavoriteItem[]) {
  items = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage can be blocked; follows still work for this visit */
  }
  emit();
}

function readLocal(): FavoriteItem[] {
  try {
    const stored = localStorage.getItem(KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    // Old builds saved made-up suggestions with ids like "1" or "c1". Keep real ones only.
    return Array.isArray(parsed)
      ? parsed.filter((f: FavoriteItem) => typeof f.id === 'string' && f.id.length > 8)
      : [];
  } catch {
    return [];
  }
}

async function syncFromAccount() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  userId = auth.user?.id ?? null;
  if (!userId) {
    items = readLocal();
    emit();
    return;
  }
  const { data } = await supabase
    .from('follows')
    .select('entity_type, entity_id, name, created_at')
    .eq('user_id', userId);
  const saved: FavoriteItem[] = (data ?? []).map((r) => ({
    type: r.entity_type as 'team' | 'competition',
    id: r.entity_id,
    name: r.name,
    addedAt: r.created_at,
  }));
  // Stars tapped before signing in move into the account
  const local = readLocal().filter((l) => !saved.some((s) => s.type === l.type && s.id === l.id));
  if (local.length > 0) {
    await supabase.from('follows').upsert(
      local.map((l) => ({ user_id: userId, entity_type: l.type, entity_id: l.id, name: l.name })),
      { onConflict: 'user_id,entity_type,entity_id', ignoreDuplicates: true },
    );
  }
  setItems([...saved, ...local]);
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  items = readLocal();
  emit();
  syncFromAccount();
  createClient().auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
      if (event === 'SIGNED_OUT') {
        userId = null;
        try {
          localStorage.removeItem(KEY);
        } catch {
          /* ignore */
        }
        items = [];
        emit();
      } else {
        syncFromAccount();
      }
    }
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useFavorites() {
  useEffect(() => {
    start();
  }, []);
  const favorites = useSyncExternalStore(subscribe, () => items, () => EMPTY);

  const isFavorite = useCallback(
    (type: 'team' | 'competition', id: string) =>
      favorites.some((item) => item.type === type && item.id === id),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (type: 'team' | 'competition', id: string, name: string) => {
      const exists = items.some((i) => i.type === type && i.id === id);
      setItems(
        exists
          ? items.filter((i) => !(i.type === type && i.id === id))
          : [...items, { type, id, name, addedAt: new Date().toISOString() }],
      );
      if (userId) {
        const supabase = createClient();
        if (exists) {
          supabase.from('follows').delete().eq('user_id', userId).eq('entity_type', type).eq('entity_id', id).then();
        } else {
          supabase
            .from('follows')
            .upsert({ user_id: userId, entity_type: type, entity_id: id, name }, { onConflict: 'user_id,entity_type,entity_id' })
            .then();
        }
      }
    },
    [],
  );

  return {
    favorites,
    isLoaded: true,
    isFavorite,
    toggleFavorite,
    // No made-up suggestions: only things the person actually follows are listed.
    suggestedFavorites: [] as { type: 'team' | 'competition'; id: string; name: string; reason: string }[],
  };
}
