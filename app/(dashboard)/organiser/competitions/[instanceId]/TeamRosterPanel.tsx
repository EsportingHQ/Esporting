'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import LogoUpload from '@/components/ui/LogoUpload';

type Game = { slug: string; name: string };
type RosterRow = {
  player_id: string;
  players: { gamertag: string; real_name: string | null } | { gamertag: string; real_name: string | null }[] | null;
};

const field =
  'w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout';

export default function TeamRosterPanel({
  compId,
  teamId,
  logoUrl,
  games,
  locked,
  onLogoChanged,
}: {
  compId: string;
  teamId: string;
  logoUrl: string | null;
  games: Game[];
  locked: boolean;
  onLogoChanged: (url: string) => void;
}) {
  const [supabase] = useState(() => createClient());
  const [roster, setRoster] = useState<{ id: string; gamertag: string; realName: string | null; games: string[] }[]>([]);
  const [gamertag, setGamertag] = useState('');
  const [realName, setRealName] = useState('');
  const [picked, setPicked] = useState<string[]>(games.map((g) => g.slug));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tick, setTick] = useState(0);
  const load = () => setTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: r }, { data: a }] = await Promise.all([
        supabase
          .from('team_rosters')
          .select('player_id, players(gamertag, real_name)')
          .eq('team_id', teamId)
          .is('left_at', null),
        supabase
          .from('player_game_assignments')
          .select('player_id, game_titles(slug)')
          .eq('comp_instance_id', compId)
          .eq('team_id', teamId),
      ]);
      if (cancelled) return;
      const byPlayer = new Map<string, string[]>();
      for (const row of (a ?? []) as unknown as { player_id: string; game_titles: { slug: string } | { slug: string }[] | null }[]) {
        const gt = Array.isArray(row.game_titles) ? row.game_titles[0] : row.game_titles;
        if (!gt) continue;
        byPlayer.set(row.player_id, [...(byPlayer.get(row.player_id) ?? []), gt.slug]);
      }
      setRoster(
        ((r ?? []) as unknown as RosterRow[]).map((x) => {
          const p = Array.isArray(x.players) ? x.players[0] : x.players;
          return {
            id: x.player_id,
            gamertag: p?.gamertag ?? '',
            realName: p?.real_name ?? null,
            games: byPlayer.get(x.player_id) ?? [],
          };
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, teamId, compId, tick]);

  async function add() {
    setError(null);
    setBusy(true);
    const { error } = await supabase.rpc('add_roster_player', {
      p_comp: compId,
      p_team: teamId,
      p_gamertag: gamertag,
      p_real_name: realName || null,
      p_game_slugs: picked,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setGamertag('');
    setRealName('');
    load();
  }

  async function remove(playerId: string) {
    setError(null);
    const { error } = await supabase.rpc('remove_roster_player', {
      p_comp: compId,
      p_team: teamId,
      p_player: playerId,
    });
    if (error) return setError(error.message);
    load();
  }

  async function saveLogo(url: string) {
    const { error } = await supabase.rpc('set_team_logo', { p_comp: compId, p_team: teamId, p_url: url });
    if (error) throw new Error(error.message);
    onLogoChanged(url);
  }

  return (
    <div className="border-t border-border-line pt-4 mt-3 space-y-4">
      <LogoUpload value={logoUrl} onUploaded={saveLogo} label="Team logo" />

      <div className="space-y-2">
        <p className="text-[10px] font-display font-bold uppercase tracking-wider text-text-muted">
          Roster ({roster.length})
        </p>
        {roster.length === 0 && <p className="text-xs text-text-muted italic">No players yet.</p>}
        {roster.map((p) => (
          <div key={p.id} className="flex items-center justify-between bg-bg-void border border-border-line rounded px-3 py-2 text-xs">
            <span className="text-text-primary">
              <strong>{p.gamertag}</strong>
              {p.realName ? ` · ${p.realName}` : ''}
              <span className="text-text-muted">
                {' '}
                · {p.games.map((s) => games.find((g) => g.slug === s)?.name ?? s).join(', ') || 'no game'}
              </span>
            </span>
            {!locked && (
              <button onClick={() => remove(p.id)} className="text-state-loss text-[11px] uppercase font-bold">
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {!locked && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input placeholder="Gamertag" value={gamertag} onChange={(e) => setGamertag(e.target.value)} className={field} />
            <input placeholder="Real name (optional)" value={realName} onChange={(e) => setRealName(e.target.value)} className={field} />
          </div>
          <div className="flex flex-wrap gap-3">
            {games.map((g) => (
              <label key={g.slug} className="flex items-center gap-1.5 text-xs text-text-muted">
                <input
                  type="checkbox"
                  checked={picked.includes(g.slug)}
                  onChange={(e) =>
                    setPicked((p) => (e.target.checked ? [...p, g.slug] : p.filter((s) => s !== g.slug)))
                  }
                />
                {g.name}
              </label>
            ))}
          </div>
          <button
            disabled={busy || !gamertag.trim()}
            onClick={add}
            className="bg-accent-readout text-bg-void font-display font-black text-xs uppercase tracking-wider px-3 py-2 rounded disabled:opacity-50"
          >
            {busy ? 'Adding...' : 'Add player'}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-state-loss">{error}</p>}
    </div>
  );
}
