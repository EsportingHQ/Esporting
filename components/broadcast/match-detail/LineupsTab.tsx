'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { Match } from '@/hooks/useMatchRealtime';
import { createClient } from '@/lib/supabase/client';

interface LineupsTabProps {
  match: Match;
}

type Player = { id: string; gamertag: string };

// The squad shown here is the roster the tournament organiser registered for this
// competition and game, read live, so organiser edits show up straight away.
async function loadSquad(
  supabase: ReturnType<typeof createClient>,
  compId: string,
  gameId: string,
  teamId: string,
): Promise<Player[]> {
  const { data } = await supabase
    .from('player_game_assignments')
    .select('players(id, gamertag)')
    .eq('comp_instance_id', compId)
    .eq('game_title_id', gameId)
    .eq('team_id', teamId)
    .eq('is_active', true);
  const rows = (data ?? []) as unknown as { players: Player | Player[] | null }[];
  return rows
    .map((r) => (Array.isArray(r.players) ? r.players[0] : r.players))
    .filter((p): p is Player => !!p)
    .sort((a, b) => a.gamertag.localeCompare(b.gamertag));
}

function Squad({ title, side, players }: { title?: string; side: string; players: Player[] | null }) {
  return (
    <div className="bg-bg-surface border border-border-line rounded p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-border-line pb-2">
        <span className="font-display font-bold uppercase text-sm text-accent-readout">{title}</span>
        <span className="text-[10px] font-data text-text-muted">{side}</span>
      </div>
      <div className="space-y-2 text-xs font-body">
        {players === null && <p className="text-text-muted italic">Loading roster...</p>}
        {players?.length === 0 && <p className="text-text-muted italic">Roster not published yet.</p>}
        {players?.map((p) => (
          <Link
            key={p.id}
            href={`/players/${p.id}`}
            className="bg-bg-void border border-border-line hover:border-accent-readout/40 px-3 py-2 rounded flex items-center justify-between transition-all group"
          >
            <span className="font-medium text-text-primary group-hover:text-accent-readout transition-colors truncate">
              {p.gamertag}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function LineupsTab({ match }: LineupsTabProps) {
  const [home, setHome] = useState<Player[] | null>(null);
  const [away, setAway] = useState<Player[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const [h, a] = await Promise.all([
        match.team_home_id ? loadSquad(supabase, match.comp_instance_id, match.game_title_id, match.team_home_id) : [],
        match.team_away_id ? loadSquad(supabase, match.comp_instance_id, match.game_title_id, match.team_away_id) : [],
      ]);
      if (!cancelled) {
        setHome(h);
        setAway(a);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [match.comp_instance_id, match.game_title_id, match.team_home_id, match.team_away_id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-border-line pb-2">
        <Users className="w-4 h-4 text-accent-readout" />
        <h3 className="font-display font-black text-lg uppercase tracking-wider">SQUADS</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Squad title={match.team_home?.name} side="HOME" players={home} />
        <Squad title={match.team_away?.name} side="AWAY" players={away} />
      </div>
    </div>
  );
}
