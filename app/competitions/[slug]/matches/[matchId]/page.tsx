'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { TallyLight } from '@/components/broadcast/tally-light';
import { RollDigit } from '@/components/broadcast/roll-digit';
import { EventBadge } from '@/components/broadcast/event-badge';
import { useMatchRealtime, MatchEvent, MatchStatusLog } from '@/hooks/useMatchRealtime';
import { Shield, Users, Clock, Flame, Award, AlertCircle, ListOrdered } from 'lucide-react';

export default function MatchDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ slug: string; matchId: string }>;
}) {
  const params = use(paramsPromise);
  const slug = params.slug;
  const matchId = params.matchId;

  const { match, score, events, statusLogs, isLoading } = useMatchRealtime(matchId);

  // Client-side generated recap string
  const [recapString, setRecapString] = useState('');

  useEffect(() => {
    if (!match || !score) return;

    if (match.status === 'completed') {
      const winnerName =
        score.home_maps_won > score.away_maps_won
          ? match.team_home?.name
          : score.home_maps_won < score.away_maps_won
          ? match.team_away?.name
          : score.home_current_score > score.away_current_score
          ? match.team_home?.name
          : match.team_away?.name;

      const loserName =
        winnerName === match.team_home?.name ? match.team_away?.name : match.team_home?.name;

      const winnerScore =
        winnerName === match.team_home?.name
          ? score.home_maps_won || score.home_current_score
          : score.away_maps_won || score.away_current_score;

      const loserScore =
        winnerName === match.team_home?.name
          ? score.away_maps_won || score.away_current_score
          : score.home_maps_won || score.home_current_score;

      const duration = 90; // Default simulated duration minutes
      const mode = match.game_title?.name === 'FC 26' ? 'Normal Match' : 'Series';

      setRecapString(
        `${winnerName} beat ${loserName} ${winnerScore} – ${loserScore} at ${mode} (${duration}m)`
      );
    } else {
      setRecapString('Match is currently in progress. Waiting for final results.');
    }
  }, [match, score]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-bg-void text-text-primary">
        <PublicNav />
        <div className="flex-1 flex items-center justify-center font-display font-bold uppercase tracking-wider text-xs">
          <TallyLight size="md" className="mr-2" />
          <span>ESTABLISHING BROADCAST TELEMETRY...</span>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex-1 flex flex-col bg-bg-void text-text-primary">
        <PublicNav />
        <div className="flex-1 flex items-center justify-center font-display font-bold uppercase tracking-wider text-xs text-state-alert">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>BROADCAST STREAM NOT FOUND</span>
        </div>
      </div>
    );
  }

  // Dual format check
  const isBR = match.match_format === 'battle_royale';
  const isShooter = match.game_title?.game_types?.slug === 'shooter';

  // Mock lineups
  const mockLineups = {
    home: [
      { id: 'p1', name: 'Kuti_Junior', role: 'starter' },
      { id: 'p2', name: 'Striker_X', role: 'starter' },
      { id: 'p3', name: 'Defender_One', role: 'starter' },
      { id: 'p4', name: 'Benched_Guy', role: 'substitute' },
    ],
    away: [
      { id: 'p5', name: 'Bello_Master', role: 'starter' },
      { id: 'p6', name: 'Venom_Sniper', role: 'starter' },
      { id: 'p7', name: 'Shield_Wall', role: 'starter' },
      { id: 'p8', name: 'Coach_Sub', role: 'substitute' },
    ],
  };

  // Mock shooter maps slots for BO3
  const mockMapSlots = [
    { number: 1, name: 'Nuketown', mode: 'Hardpoint', homeScore: 150, awayScore: 125, winner: 'home', status: 'completed' },
    { number: 2, name: 'Crash', mode: 'Search & Destroy', homeScore: 4, awayScore: 6, winner: 'away', status: 'completed' },
    { number: 3, name: 'Raid', mode: 'Control', homeScore: score?.home_current_score || 0, awayScore: score?.away_current_score || 0, winner: null, status: 'live' },
  ];

  // Mock BR Placement Table
  const mockBrResults = [
    { rank: 1, name: 'Ares Clan', shortCode: 'ARS', kills: 14, placementPts: 15, killPts: 14, totalPts: 29 },
    { rank: 2, name: 'Odin Elite', shortCode: 'ODN', kills: 10, placementPts: 12, killPts: 10, totalPts: 22 },
    { rank: 3, name: 'Venom Esports', shortCode: 'VENM', kills: 8, placementPts: 10, killPts: 8, totalPts: 18 },
    { rank: 4, name: 'Supra Gaming', shortCode: 'SUPR', kills: 6, placementPts: 8, killPts: 6, totalPts: 14 },
    { rank: 5, name: 'Apex Raiders', shortCode: 'APEX', kills: 5, placementPts: 6, killPts: 5, totalPts: 11 },
  ];

  const getEventEmoji = (type: string) => {
    switch (type) {
      case 'goal':
      case 'penalty_goal':
        return '⚽';
      case 'own_goal':
        return '🙃';
      case 'yellow_card':
        return '🟨';
      case 'red_card':
        return '🟥';
      case 'score_update':
        return '🎯';
      case 'map_end':
        return '🏁';
      case 'status_change':
        return '📢';
      default:
        return '•';
    }
  };

  const getEventText = (ev: MatchEvent) => {
    const timeText = ev.meta?.minute ? `${ev.meta.minute}' ` : '';
    switch (ev.event_type) {
      case 'goal':
        return `${timeText}GOAL! ${ev.team?.name || 'Player'} scores.`;
      case 'penalty_goal':
        return `${timeText}PENALTY CONVERTED! ${ev.team?.name || 'Player'} scores.`;
      case 'own_goal':
        return `${timeText}OWN GOAL! Credited to opponent.`;
      case 'yellow_card':
        return `${timeText}Yellow Card issued.`;
      case 'red_card':
        return `${timeText}RED CARD! Player sent off.`;
      case 'status_change':
        return `MATCH STATUS CHANGED TO ${ev.meta?.status?.toUpperCase()}`;
      case 'map_selected':
        return `Map Selected: ${ev.meta?.map_name || 'Map'}`;
      case 'mode_selected':
        return `Mode Selected: ${ev.meta?.mode_name || 'Mode'}`;
      default:
        return `${ev.event_type.toUpperCase()} recorded`;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-bg-void text-text-primary">
      <PublicNav />

      {/* Header section (Tournament name + game title) */}
      <section className="bg-bg-surface border-b border-border-line py-4 px-4 font-display">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href={`/competitions/${slug}`}
              className="text-xs text-accent-readout font-bold tracking-wider hover:underline"
            >
              ← BACK TO DIVISION HUB
            </Link>
            <h2 className="text-xl font-bold uppercase tracking-wider text-text-primary mt-1">
              {match.game_title?.name} — Stage Playoffs
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-data text-text-muted">
              MATCH ID: {match.id.substring(0, 8)}
            </span>
            <EventBadge status={match.status} />
          </div>
        </div>
      </section>

      {/* Flagship Scoreboard Section */}
      <section className="bg-bg-surface/50 border-b border-border-line py-8 px-4 font-body">
        <div className="max-w-4xl mx-auto">
          {!isBR ? (
            /* Head-to-Head Scoreboard Layout */
            <div className="flex items-center justify-between">
              {/* Home Team */}
              <div className="flex items-center gap-4 w-[40%]">
                <div className="w-12 h-12 bg-bg-void border border-border-line rounded flex items-center justify-center font-display font-black text-lg text-text-muted shrink-0 shadow-inner">
                  {match.team_home?.logo_url ? 'LOGO' : match.team_home?.name.substring(0, 3).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-black text-xl text-text-primary leading-tight uppercase">
                    {match.team_home?.name}
                  </span>
                  <span className="text-[10px] font-data text-text-muted">HOME SQUAD</span>
                </div>
              </div>

              {/* Big Score Numerals */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="flex items-center gap-3 bg-bg-void border border-border-line px-6 py-2 rounded text-3xl font-data font-bold tracking-wider text-accent-signal">
                  {isShooter ? (
                    <>
                      <RollDigit value={score?.home_maps_won || 0} />
                      <span className="text-text-muted text-xl">:</span>
                      <RollDigit value={score?.away_maps_won || 0} />
                    </>
                  ) : (
                    <>
                      <RollDigit value={score?.home_current_score || 0} />
                      <span className="text-text-muted text-xl">:</span>
                      <RollDigit value={score?.away_current_score || 0} />
                    </>
                  )}
                </div>
                {isShooter && (
                  <span className="text-[9px] text-text-muted font-display tracking-widest mt-2 uppercase">
                    SERIES SCORE (BO{match.best_of})
                  </span>
                )}
              </div>

              {/* Away Team */}
              <div className="flex items-center justify-end gap-4 w-[40%] text-right">
                <div className="flex flex-col">
                  <span className="font-display font-black text-xl text-text-primary leading-tight uppercase">
                    {match.team_away?.name}
                  </span>
                  <span className="text-[10px] font-data text-text-muted">AWAY SQUAD</span>
                </div>
                <div className="w-12 h-12 bg-bg-void border border-border-line rounded flex items-center justify-center font-display font-black text-lg text-text-muted shrink-0 shadow-inner">
                  {match.team_away?.logo_url ? 'LOGO' : match.team_away?.name.substring(0, 3).toUpperCase()}
                </div>
              </div>
            </div>
          ) : (
            /* Battle Royale Leaderboard Banner Layout */
            <div className="text-center space-y-3">
              <h3 className="font-display font-black text-2xl tracking-widest text-accent-signal uppercase">
                BATTLE ROYALE LOBBY
              </h3>
              <p className="text-xs font-data text-text-muted uppercase">
                Results recorded at placement tables. Updates pushed post-match.
              </p>
            </div>
          )}

          {/* Recap text block */}
          <div className="mt-8 border border-border-line bg-bg-void p-3 rounded text-center">
            <span className="text-[9px] font-display font-bold text-text-muted uppercase tracking-widest block mb-1">
              OFFICIAL BROADCAST RECAP
            </span>
            <p className="text-xs font-data text-text-primary italic">"{recapString}"</p>
          </div>
        </div>
      </section>

      {/* Main layout contents (Events timeline + lineups/maps) */}
      <main className="max-w-7xl w-full mx-auto px-4 py-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns: Timeline Events feed */}
        <section className="lg:col-span-2 space-y-6">
          {/* Header title */}
          <div className="flex items-center gap-2 border-b border-border-line pb-2">
            <Flame className="w-4 h-4 text-accent-signal" />
            <h3 className="font-display font-black text-lg uppercase tracking-wider">
              LIVE BROADCAST TIMELINE
            </h3>
            {match.status === 'live' && (
              <span className="ml-auto text-[9px] font-data text-accent-signal flex items-center gap-1 bg-accent-signal/10 px-2 py-0.5 rounded border border-accent-signal/30">
                <TallyLight size="sm" />
                <span>REALTIME TELEMETRY CONNECTED</span>
              </span>
            )}
          </div>

          {/* Delay / Announcements Panel */}
          {statusLogs.length > 0 && statusLogs[0].reason && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded flex items-start gap-3">
              <Clock className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-display font-bold uppercase tracking-wider block">
                  Broadcast Delay Announcement
                </span>
                <p className="font-body text-text-muted">
                  Match status reported as: <span className="font-semibold text-amber-400 uppercase">{statusLogs[0].new_status}</span>.
                  Reason: "{statusLogs[0].reason}".
                </p>
              </div>
            </div>
          )}

          {/* Live events timeline container */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {events.map((ev) => (
              <div
                key={ev.id}
                className={`bg-bg-surface border p-3 rounded transition-all flex items-start gap-4 ${
                  ev.is_void ? 'border-state-alert/10 opacity-30 line-through' : 'border-border-line'
                }`}
              >
                <span className="text-xl shrink-0 mt-0.5">{getEventEmoji(ev.event_type)}</span>
                <div className="flex-1 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold uppercase tracking-wider text-accent-readout text-[10px]">
                      {ev.event_type}
                    </span>
                    <span className="font-data text-text-muted text-[10px]">
                      {new Date(ev.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="font-body text-text-primary text-sm">{getEventText(ev)}</p>
                  {ev.is_correction && (
                    <span className="text-[10px] text-state-alert font-data block">
                      ⚠️ Corrected previous error event.
                    </span>
                  )}
                </div>
              </div>
            ))}

            {events.length === 0 && (
              <div className="py-12 text-center text-text-muted border border-dashed border-border-line rounded">
                <Clock className="w-6 h-6 mx-auto mb-2 text-text-muted/40" />
                <p className="font-display font-semibold uppercase text-xs tracking-wider">
                  Awaiting kick-off events
                </p>
                <p className="text-[10px] font-data mt-0.5">Timeline will update automatically.</p>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Lineups or Map slots */}
        <section className="space-y-8">
          {/* Map-by-map sheet for shooter BO series */}
          {isShooter && !isBR && (
            <div className="bg-bg-surface border border-border-line rounded p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-border-line pb-2">
                <Award className="w-4 h-4 text-accent-readout" />
                <h4 className="font-display font-bold text-xs uppercase tracking-wider">
                  SERIES MAP MATRIX
                </h4>
              </div>

              <div className="space-y-3 text-xs font-data">
                {mockMapSlots.map((slot) => (
                  <div
                    key={slot.number}
                    className={`p-3 rounded border flex items-center justify-between ${
                      slot.status === 'live'
                        ? 'bg-accent-signal/5 border-accent-signal/30'
                        : 'bg-bg-void border-border-line'
                    }`}
                  >
                    <div>
                      <span className="block font-display font-bold uppercase tracking-wider text-[9px] text-text-muted">
                        MAP 0{slot.number} — {slot.status.toUpperCase()}
                      </span>
                      <span className="font-body font-semibold text-text-primary">
                        {slot.name}
                      </span>
                      <span className="block text-[10px] text-accent-readout">{slot.mode}</span>
                    </div>

                    <div className="text-right">
                      {slot.status === 'completed' ? (
                        <div className="font-bold text-text-primary text-base">
                          {slot.homeScore} : {slot.awayScore}
                        </div>
                      ) : slot.status === 'live' ? (
                        <div className="font-bold text-accent-signal text-base flex items-center gap-1.5 justify-end">
                          <TallyLight size="sm" />
                          <span>
                            {slot.homeScore} : {slot.awayScore}
                          </span>
                        </div>
                      ) : (
                        <span className="text-text-muted italic">TBD</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Battle Royale standings final grid */}
          {isBR && (
            <div className="bg-bg-surface border border-border-line rounded p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-border-line pb-2">
                <ListOrdered className="w-4 h-4 text-accent-signal" />
                <h4 className="font-display font-bold text-xs uppercase tracking-wider">
                  PLACEMENT STANDINGS
                </h4>
              </div>

              <div className="space-y-2 text-xs font-data">
                {mockBrResults.map((row) => (
                  <div
                    key={row.shortCode}
                    className="p-2 bg-bg-void border border-border-line rounded flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-border-line flex items-center justify-center font-bold text-[10px] shrink-0">
                        {row.rank}
                      </span>
                      <span className="font-body font-semibold text-text-primary">
                        {row.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-text-muted">
                        Kills: <span className="text-text-primary">{row.kills}</span>
                      </span>
                      <span className="font-bold text-accent-signal text-sm">{row.totalPts} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lineups card (except for BR which has too many squads) */}
          {!isBR && (
            <div className="bg-bg-surface border border-border-line rounded p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-border-line pb-2">
                <Users className="w-4 h-4 text-text-muted" />
                <h4 className="font-display font-bold text-xs uppercase tracking-wider">
                  LINEUPS & ROSTERS
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-body">
                {/* Home Lineup */}
                <div className="space-y-2">
                  <span className="block font-display font-bold uppercase text-[9px] text-text-muted">
                    {match.team_home?.name}
                  </span>
                  <div className="space-y-1">
                    {mockLineups.home.map((p) => (
                      <div
                        key={p.id}
                        className="bg-bg-void border border-border-line px-2 py-1 rounded flex justify-between text-[11px]"
                      >
                        <span className="truncate">{p.name}</span>
                        {p.role === 'substitute' && (
                          <span className="text-[8px] font-data text-text-muted bg-bg-surface px-1 rounded">
                            SUB
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Away Lineup */}
                <div className="space-y-2">
                  <span className="block font-display font-bold uppercase text-[9px] text-text-muted text-right">
                    {match.team_away?.name}
                  </span>
                  <div className="space-y-1">
                    {mockLineups.away.map((p) => (
                      <div
                        key={p.id}
                        className="bg-bg-void border border-border-line px-2 py-1 rounded flex justify-between text-[11px]"
                      >
                        <span className="truncate">{p.name}</span>
                        {p.role === 'substitute' && (
                          <span className="text-[8px] font-data text-text-muted bg-bg-surface px-1 rounded">
                            SUB
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
