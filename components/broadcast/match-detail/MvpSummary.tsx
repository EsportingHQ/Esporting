'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Row = { label: string; detail: string | null; playerId: string };
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

// The MVP of each game and of the whole match, on the match page.
export function MvpSummary({ matchId, refreshKey }: { matchId: string; refreshKey: string }) {
  const [rows, setRows] = useState<(Row & { name: string })[]>([]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const [{ data: m }, { data: maps }] = await Promise.all([
        supabase.from('matches').select('mvp_player_id, best_of').eq('id', matchId).maybeSingle(),
        supabase
          .from('match_maps')
          .select('map_number, mvp_player_id, maps(name), modes(name)')
          .eq('match_id', matchId)
          .not('mvp_player_id', 'is', null)
          .order('map_number', { ascending: true }),
      ]);
      const list: Row[] = [];
      const best = (m as { best_of?: number } | null)?.best_of ?? 1;
      for (const r of (maps ?? []) as unknown as {
        map_number: number;
        mvp_player_id: string;
        maps: { name: string } | { name: string }[] | null;
        modes: { name: string } | { name: string }[] | null;
      }[]) {
        list.push({
          label: best > 1 ? `Game ${r.map_number} MVP` : 'Game MVP',
          detail: [one(r.maps)?.name, one(r.modes)?.name].filter(Boolean).join(' · ') || null,
          playerId: r.mvp_player_id,
        });
      }
      const matchMvp = (m as { mvp_player_id?: string | null } | null)?.mvp_player_id;
      if (matchMvp) list.push({ label: best > 1 ? 'Overall match MVP' : 'Match MVP', detail: null, playerId: matchMvp });
      // A single-game match has one MVP: show it once
      const deduped = best > 1 ? list : list.filter((r) => r.label !== 'Game MVP' || !matchMvp);
      const ids = [...new Set(deduped.map((r) => r.playerId))];
      const { data: players } = ids.length
        ? await supabase.from('players').select('id, gamertag').in('id', ids)
        : { data: [] as { id: string; gamertag: string }[] };
      const names = new Map((players ?? []).map((p) => [p.id, p.gamertag]));
      if (!cancelled) setRows(deduped.map((r) => ({ ...r, name: names.get(r.playerId) ?? 'Player' })));
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId, refreshKey]);

  if (rows.length === 0) return null;

  return (
    <div className="bg-bg-surface border border-border-line rounded p-4 space-y-2">
      <div className="flex items-center gap-2 border-b border-border-line pb-2">
        <Star className="w-4 h-4 text-accent-signal" />
        <h3 className="font-display font-bold text-sm tracking-wider uppercase">MVP</h3>
      </div>
      <ul className="space-y-1.5 text-xs font-body">
        {rows.map((r, i) => (
          <li key={`${r.label}-${i}`} className="flex items-center justify-between gap-3">
            <span className="text-text-muted">
              {r.label}
              {r.detail ? <span className="ml-2 text-[11px]">({r.detail})</span> : null}
            </span>
            <Link href={`/players/${r.playerId}`} className="font-semibold text-text-primary hover:text-accent-readout">
              {r.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
