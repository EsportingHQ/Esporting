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

type Change = {
  id: string;
  action: 'in' | 'out';
  created_at: string;
  team_id: string;
  players: { gamertag: string } | { gamertag: string }[] | null;
};

async function loadPlayed(supabase: ReturnType<typeof createClient>, matchId: string, teamId: string): Promise<Player[]> {
  const { data } = await supabase.from('match_lineups').select('players(id, gamertag)').eq('match_id', matchId).eq('team_id', teamId);
  const rows = (data ?? []) as unknown as { players: Player | Player[] | null }[];
  return rows
    .map((r) => (Array.isArray(r.players) ? r.players[0] : r.players))
    .filter((p): p is Player => !!p)
    .sort((a, b) => a.gamertag.localeCompare(b.gamertag));
}

export function LineupsTab({ match }: LineupsTabProps) {
  const [home, setHome] = useState<{ played: Player[]; bench: Player[] } | null>(null);
  const [away, setAway] = useState<{ played: Player[]; bench: Player[] } | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    async function side(teamId: string | null) {
      if (!teamId) return { played: [], bench: [] };
      const [squad, played] = await Promise.all([
        loadSquad(supabase, match.comp_instance_id, match.game_title_id, teamId),
        loadPlayed(supabase, match.id, teamId),
      ]);
      // Until the line-up is confirmed, the whole squad is shown as playing
      if (played.length === 0) return { played: squad, bench: [] };
      const ids = new Set(played.map((p) => p.id));
      return { played, bench: squad.filter((p) => !ids.has(p.id)) };
    }
    (async () => {
      const [h, a, { data: ch }] = await Promise.all([
        side(match.team_home_id),
        side(match.team_away_id),
        supabase
          .from('match_roster_changes')
          .select('id, action, created_at, team_id, players(gamertag)')
          .eq('match_id', match.id)
          .order('created_at', { ascending: true }),
      ]);
      if (!cancelled) {
        setHome(h);
        setAway(a);
        setChanges((ch ?? []) as unknown as Change[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [match.id, match.comp_instance_id, match.game_title_id, match.team_home_id, match.team_away_id]);

  const teamName = (id: string) => (id === match.team_home_id ? match.team_home?.name : match.team_away?.name) ?? 'Team';
  const tag = (c: Change) => (Array.isArray(c.players) ? c.players[0] : c.players)?.gamertag ?? 'Player';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-border-line pb-2">
        <Users className="w-4 h-4 text-accent-readout" />
        <h3 className="font-display font-black text-lg uppercase tracking-wider">SQUADS</h3>
      </div>

      {changes.length > 0 ? (
        <div className="bg-bg-surface border border-border-line rounded p-4 space-y-2">
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-text-muted">Roster changes</h4>
          <ul className="space-y-1.5 text-xs font-body">
            {changes.map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <span
                  className={`w-10 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-bold uppercase ${
                    c.action === 'out' ? 'bg-red-500/10 text-red-500' : 'bg-state-win/10 text-state-win'
                  }`}
                >
                  {c.action === 'out' ? 'Out' : 'In'}
                </span>
                <span className="font-semibold text-text-primary">{tag(c)}</span>
                <span className="text-text-muted">{teamName(c.team_id)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Squad title={match.team_home?.name} side="HOME" players={home ? home.played : null} />
          {home && home.bench.length > 0 ? <Bench players={home.bench} /> : null}
        </div>
        <div className="space-y-3">
          <Squad title={match.team_away?.name} side="AWAY" players={away ? away.played : null} />
          {away && away.bench.length > 0 ? <Bench players={away.bench} /> : null}
        </div>
      </div>
    </div>
  );
}

function Bench({ players }: { players: Player[] }) {
  return (
    <div className="rounded border border-dashed border-border-line p-3 text-xs">
      <p className="mb-1 text-[10px] font-display font-bold uppercase tracking-wider text-text-muted">Not playing this match</p>
      <p className="text-text-muted">
        {players.map((p, i) => (
          <span key={p.id}>
            {i > 0 ? ', ' : ''}
            <Link href={`/players/${p.id}`} className="hover:text-accent-readout">
              {p.gamertag}
            </Link>
          </span>
        ))}
      </p>
    </div>
  );
}
