'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { Match, MatchEvent, MatchMap, MatchScore } from '@/hooks/useMatchRealtime';

// A live-scores style timeline: oldest at the top, home events on the left, away events on the right.
// For a series (best of 2+) every match gets its own "started / full time" markers and its own running score.

const HIDDEN = new Set(['correction', 'status_change', 'map_selected', 'mode_selected', 'score_update', 'round_end', 'map_end', 'extra_time']);
const GOALS = new Set(['goal', 'penalty_goal', 'own_goal']);

type Item =
  | { kind: 'marker'; key: string; label: string; score?: string; tone?: 'start' | 'ht' | 'ft' | 'series' }
  | { kind: 'event'; key: string; ev: MatchEvent; side: 'home' | 'away'; score?: string; note?: string };

function clock(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

function minuteLabel(ev: MatchEvent): string {
  const m = ev.meta?.minute;
  return m ? `${m}'` : clock(ev.created_at);
}

function EventIcon({ type }: { type: string }) {
  if (type === 'yellow_card') return <span className="inline-block w-3 h-4 rounded-[2px] bg-yellow-400 shrink-0" aria-label="Yellow card" />;
  if (type === 'red_card') return <span className="inline-block w-3 h-4 rounded-[2px] bg-red-600 shrink-0" aria-label="Red card" />;
  if (type === 'penalty_miss') return <span className="text-base leading-none shrink-0" aria-label="Penalty missed">❌</span>;
  return <span className="text-base leading-none shrink-0" aria-label="Goal">⚽</span>;
}

export function FootballTimeline({
  match,
  score,
  events,
  matchMaps,
}: {
  match: Match;
  score: MatchScore | null;
  events: MatchEvent[];
  matchMaps: MatchMap[];
}) {
  const items = useMemo<Item[]>(() => {
    const homeId = match.team_home_id;
    const awayId = match.team_away_id;
    const visible = events
      .filter((e) => !e.is_void && !HIDDEN.has(e.event_type))
      .sort((a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0) || String(a.created_at).localeCompare(String(b.created_at)));

    const sideOf = (e: MatchEvent): 'home' | 'away' => {
      const isHome = e.team_id === homeId;
      if (e.event_type === 'own_goal') return isHome ? 'away' : 'home'; // credited to the opponent
      return isHome ? 'home' : 'away';
    };

    const series = matchMaps.length > 1;
    const groups: { id: string | null; label: string; startedAt: string | null; endedAt: string | null; done: boolean; hs: number; as: number }[] = series
      ? [...matchMaps]
          .sort((a, b) => a.map_number - b.map_number)
          .map((m) => ({
            id: m.id,
            label: `Match ${m.map_number}`,
            startedAt: (m as MatchMap & { started_at?: string | null }).started_at ?? null,
            endedAt: (m as MatchMap & { ended_at?: string | null }).ended_at ?? null,
            done: m.status === 'completed',
            hs: Number(m.home_score ?? 0),
            as: Number(m.away_score ?? 0),
          }))
      : [{ id: null, label: 'Match', startedAt: match.started_at, endedAt: match.ended_at, done: match.status === 'completed', hs: Number(score?.home_current_score ?? 0), as: Number(score?.away_current_score ?? 0) }];

    const out: Item[] = [];
    const yellowed = new Set<string>();

    for (const g of groups) {
      const own = visible.filter((e) => (series ? e.match_map_id === g.id : true));
      const started = g.startedAt || own.length > 0;
      if (!started) continue;
      out.push({ kind: 'marker', key: `start-${g.id ?? 'm'}`, label: series ? `${g.label} started` : 'Kick-off', tone: 'start', score: g.startedAt ? clock(g.startedAt) : undefined });

      let h = 0;
      let a = 0;
      for (const ev of own) {
        if (ev.event_type === 'half_time') {
          out.push({ kind: 'marker', key: ev.id, label: 'Half time', score: `${h} – ${a}`, tone: 'ht' });
          continue;
        }
        if (ev.event_type === 'full_time') continue; // shown from the match state below
        const side = sideOf(ev);
        let sc: string | undefined;
        if (GOALS.has(ev.event_type)) {
          if (side === 'home') h += Number(ev.value ?? 1);
          else a += Number(ev.value ?? 1);
          sc = `${h} – ${a}`;
        }
        let note: string | undefined;
        if (ev.event_type === 'penalty_goal' || ev.event_type === 'penalty_miss') note = 'PEN';
        if (ev.event_type === 'own_goal') note = 'OG';
        if (ev.event_type === 'yellow_card' && ev.player_id) yellowed.add(`${g.id}:${ev.player_id}`);
        if (ev.event_type === 'red_card' && ev.player_id && yellowed.has(`${g.id}:${ev.player_id}`)) note = '2nd yellow';
        out.push({ kind: 'event', key: ev.id, ev, side, score: sc, note });
      }

      if (g.done) {
        out.push({ kind: 'marker', key: `end-${g.id ?? 'm'}`, label: series ? `Full time · ${g.label}` : 'Full time', score: `${g.hs} – ${g.as}`, tone: 'ft' });
      }
    }

    if (series && (match.status === 'completed' || match.status === 'walkover')) {
      out.push({
        kind: 'marker',
        key: 'series-end',
        label: 'Series full time',
        score: `${score?.home_maps_won ?? 0} – ${score?.away_maps_won ?? 0}`,
        tone: 'series',
      });
    }
    return out;
  }, [events, matchMaps, match, score]);

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-text-muted border border-dashed border-border-line rounded">
        <p className="font-display font-semibold uppercase text-xs tracking-wider">Waiting for kick-off</p>
        <p className="text-[10px] font-data mt-0.5">Events appear here as they happen.</p>
      </div>
    );
  }

  return (
    <div className="border border-border-line rounded-lg overflow-hidden bg-bg-surface divide-y divide-border-line">
      {items.map((it) => {
        if (it.kind === 'marker') {
          const strong = it.tone === 'ft' || it.tone === 'series';
          return (
            <div
              key={it.key}
              className={`flex items-center justify-center gap-3 px-3 py-2 text-[11px] font-display font-bold tracking-wider uppercase ${
                strong ? 'bg-bg-elevated text-text-primary' : 'text-text-muted'
              }`}
            >
              <span>{it.label}</span>
              {it.score && <span className="font-data tabular-nums text-text-primary">{it.score}</span>}
            </div>
          );
        }
        const { ev } = it;
        const who = ev.player?.gamertag ?? '';
        const cell = (
          <span className={`flex items-center gap-2 min-w-0 ${it.side === 'home' ? 'justify-end text-right' : 'justify-start text-left'}`}>
            {it.side === 'away' && <EventIcon type={ev.event_type} />}
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-text-primary truncate">
                {who ? (
                  <Link href={`/players/${ev.player_id}`} className="hover:underline">
                    {who}
                  </Link>
                ) : (
                  ev.event_type.replace(/_/g, ' ')
                )}
              </span>
              {it.note && <span className="block text-[10px] font-data font-bold text-text-muted tracking-wider">{it.note}</span>}
            </span>
            {it.side === 'home' && <EventIcon type={ev.event_type} />}
          </span>
        );
        return (
          <div key={it.key} className="grid grid-cols-[1fr_4.5rem_1fr] items-center gap-2 px-3 py-2.5">
            {it.side === 'home' ? cell : <span />}
            <span className="text-center">
              <span className="block font-data text-xs text-text-muted tabular-nums">{minuteLabel(ev)}</span>
              {it.score && <span className="block font-data text-xs font-bold text-text-primary tabular-nums">{it.score}</span>}
            </span>
            {it.side === 'away' ? cell : <span />}
          </div>
        );
      })}
    </div>
  );
}
