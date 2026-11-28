'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Team {
  id: string;
  name: string;
  short_code: string | null;
  logo_url: string | null;
}

interface BracketMatch {
  id: string;
  bracket_round: number;
  bracket_slot: number;
  status: string;
  scheduled_at: string | null;
  best_of: number;
  home_maps_won: number | null;
  away_maps_won: number | null;
  winner_team_id: string | null;
  home: Team | null;
  away: Team | null;
  scoreHome: number;
  scoreAway: number;
  football: boolean;
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

function roundName(round: number, total: number): string {
  const left = total - round; // 0 = final
  if (left === 0) return 'Final';
  if (left === 1) return 'Semi-finals';
  if (left === 2) return 'Quarter-finals';
  return `Round of ${2 ** (left + 1)}`;
}

function when(m: BracketMatch): string {
  if (m.status === 'live') return 'LIVE';
  if (m.status === 'cancelled') return 'CANCELLED';
  if (m.status === 'delayed') return 'DELAYED';
  if (m.status === 'completed' || m.status === 'walkover') return m.football ? 'FT' : 'ENDED';
  if (!m.scheduled_at) return 'TBD';
  const d = new Date(m.scheduled_at);
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}`;
}

function TeamRow({ team, score, won, lost }: { team: Team | null; score: number | null; won: boolean; lost: boolean }) {
  return (
    <div className="flex items-center gap-2 h-8 px-2.5">
      <div className="w-5 h-5 rounded-md overflow-hidden bg-text-primary/[0.05] border border-text-primary/[0.08] flex items-center justify-center text-[8px] font-display font-black shrink-0">
        {team?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logo_url} alt="" className="w-full h-full object-cover" />
        ) : team ? (
          (team.short_code ?? team.name).slice(0, 2).toUpperCase()
        ) : null}
      </div>
      <span
        className={`flex-1 min-w-0 truncate text-xs ${
          team ? (won ? 'font-bold text-text-primary' : lost ? 'text-text-muted' : 'font-semibold text-text-primary') : 'text-text-muted/60 italic'
        }`}
      >
        {team ? (
          <Link
            href={`/teams/${team.id}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:underline"
          >
            {team.name}
          </Link>
        ) : (
          'TBD'
        )}
      </span>
      <span className={`font-data text-xs tabular-nums ${won ? 'font-black text-text-primary' : 'text-text-muted'}`}>
        {score ?? ''}
      </span>
    </div>
  );
}

function MatchBox({ m, slug }: { m: BracketMatch; slug: string }) {
  const router = useRouter();
  const started = m.status === 'live' || m.status === 'completed' || m.status === 'walkover';
  const done = m.status === 'completed' || m.status === 'walkover';
  const hWon = done && !!m.winner_team_id && m.winner_team_id === m.home?.id;
  const aWon = done && !!m.winner_team_id && m.winner_team_id === m.away?.id;
  const body = (
    <div
      className={`w-52 rounded-xl border bg-bg-surface overflow-hidden ${
        m.status === 'live'
          ? 'border-accent-primary shadow-[0_0_14px_rgba(255,31,109,0.25)]'
          : m.status === 'cancelled'
            ? 'border-amber-500/60 opacity-80'
            : 'border-text-primary/[0.1]'
      }`}
    >
      <div className="flex items-center justify-between px-2.5 pt-1.5 text-[9px] font-display font-bold tracking-wider">
        <span
          className={
            m.status === 'live'
              ? 'text-accent-primary animate-pulse'
              : done
                ? 'text-accent-cyan'
                : m.status === 'cancelled' || m.status === 'delayed'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-text-muted'
          }
        >
          {when(m)}
        </span>
        <span className="text-text-muted">BO{m.best_of}</span>
      </div>
      <TeamRow team={m.home} score={started ? m.scoreHome : null} won={hWon} lost={aWon} />
      <div className="h-px bg-text-primary/[0.06]" />
      <TeamRow team={m.away} score={started ? m.scoreAway : null} won={aWon} lost={hWon} />
      {m.status === 'cancelled' && (
        <p className="border-t border-text-primary/[0.06] px-2.5 py-1 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
          Cancelled, to be rescheduled
        </p>
      )}
    </div>
  );
  if (m.home && m.away) {
    // A div, not a link, because the team names inside are links to the team pages.
    const open = () => router.push(`/competitions/${slug}/matches/${m.id}`);
    return (
      <div
        role="link"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            open();
          }
        }}
        className="block cursor-pointer hover:opacity-90 transition-opacity"
      >
        {body}
      </div>
    );
  }
  return body;
}

export default function KnockoutBracket({ compId, slug }: { compId: string; slug: string }) {
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(1);
  const scroller = useRef<HTMLDivElement>(null);
  const cols = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    const supabase = createClient();
    let alive = true;

    async function load() {
      const { data } = await supabase
        .from('matches')
        .select(
          `id, bracket_round, bracket_slot, status, scheduled_at, best_of, home_maps_won, away_maps_won, winner_team_id,
           home:teams!matches_team_home_id_fkey(id, name, short_code, logo_url),
           away:teams!matches_team_away_id_fkey(id, name, short_code, logo_url),
           game_titles(game_types(slug)),
           match_scores(home_current_score, away_current_score)`,
        )
        .eq('comp_instance_id', compId)
        .not('bracket_round', 'is', null)
        .is('deleted_at', null)
        .order('bracket_round')
        .order('bracket_slot');
      if (!alive) return;
      const rows = (data ?? []) as unknown as Record<string, unknown>[];
      setMatches(
        rows.map((r) => {
          const gt = one(r.game_titles as { game_types?: { slug: string } | { slug: string }[] } | null);
          const football = one(gt?.game_types ?? null)?.slug === 'football';
          const sc = one(r.match_scores as { home_current_score: number; away_current_score: number } | null);
          const series = (r.best_of as number) > 1 || !football;
          return {
            id: r.id as string,
            bracket_round: r.bracket_round as number,
            bracket_slot: r.bracket_slot as number,
            status: r.status as string,
            scheduled_at: r.scheduled_at as string | null,
            best_of: r.best_of as number,
            home_maps_won: r.home_maps_won as number | null,
            away_maps_won: r.away_maps_won as number | null,
            winner_team_id: r.winner_team_id as string | null,
            home: one(r.home as Team | Team[] | null),
            away: one(r.away as Team | Team[] | null),
            scoreHome: series ? ((r.home_maps_won as number | null) ?? 0) : (sc?.home_current_score ?? 0),
            scoreAway: series ? ((r.away_maps_won as number | null) ?? 0) : (sc?.away_current_score ?? 0),
            football,
          } satisfies BracketMatch;
        }),
      );
      setLoading(false);
    }

    load();
    const channel = supabase
      .channel(`bracket-${compId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `comp_instance_id=eq.${compId}` }, load)
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [compId]);

  const rounds = useMemo(() => {
    const map = new Map<number, BracketMatch[]>();
    for (const m of matches) map.set(m.bracket_round, [...(map.get(m.bracket_round) ?? []), m]);
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [matches]);

  const total = rounds.length;
  const firstSize = rounds[0]?.[1].length ?? 0;

  // Round 1 may have fewer matches than a full round (byes), so every column is laid out
  // against the size of a full bracket to keep the connecting lines level.
  const slots = Math.max(1, 2 ** Math.max(total - 1, 0), firstSize);

  function jump(round: number) {
    setActive(round);
    const col = cols.current[round];
    const box = scroller.current;
    if (col && box) box.scrollTo({ left: col.offsetLeft - 8, behavior: 'smooth' });
  }

  if (loading) return <p className="text-sm text-text-muted">Loading bracket...</p>;
  if (total === 0) {
    return (
      <div className="py-12 text-center text-text-muted border border-dashed border-border-line rounded">
        <p className="font-display font-semibold uppercase text-xs tracking-wider">
          The bracket appears once the organiser generates the knockout fixtures
        </p>
      </div>
    );
  }

  const rowH = 96; // height given to each slot of the first column

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {rounds.map(([r]) => (
          <button
            key={r}
            type="button"
            onClick={() => jump(r)}
            className={`shrink-0 px-4 h-9 rounded-full font-display font-bold text-xs tracking-wide transition-colors border ${
              active === r
                ? 'bg-text-primary text-bg-void border-text-primary'
                : 'bg-text-primary/[0.04] text-text-primary border-text-primary/[0.1] hover:bg-text-primary/[0.08]'
            }`}
          >
            {roundName(r, total)}
          </button>
        ))}
      </div>

      <div ref={scroller} className="overflow-x-auto pb-4 scroll-smooth">
        <div className="flex min-w-max gap-0">
          {rounds.map(([r, list], ci) => {
            const perSlot = 2 ** ci; // how many first-column slots each match spans
            const isLast = ci === total - 1;
            // place by bracket_slot so empty round-1 byes leave a gap
            const bySlot = new Map(list.map((m) => [m.bracket_slot, m]));
            const count = Math.max(slots / perSlot, 1);
            return (
              <div
                key={r}
                ref={(el) => {
                  cols.current[r] = el;
                }}
                className="flex flex-col shrink-0 px-5"
              >
                <div className="text-[10px] font-display font-bold tracking-wider text-text-muted mb-2 h-4">
                  {roundName(r, total).toUpperCase()}
                </div>
                {Array.from({ length: count }, (_, i) => {
                  const m = bySlot.get(i + 1);
                  return (
                    <div
                      key={i}
                      className="relative flex items-center"
                      style={{ height: rowH * perSlot }}
                    >
                      {m ? <MatchBox m={m} slug={slug} /> : null}
                      {m && !isLast && (
                        <>
                          <span className="absolute -right-5 top-1/2 w-5 border-t border-text-primary/20" />
                          <span
                            className={`absolute -right-5 w-px bg-text-primary/20 ${
                              i % 2 === 0 ? 'top-1/2 h-1/2' : 'bottom-1/2 h-1/2'
                            }`}
                          />
                        </>
                      )}
                      {m && ci > 0 && <span className="absolute -left-5 top-1/2 w-5 border-t border-text-primary/20" />}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
