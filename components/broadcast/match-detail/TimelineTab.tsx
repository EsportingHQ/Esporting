'use client';

import { Flame, Clock, Award, ListOrdered } from 'lucide-react';
import { StatusDot } from '../StatusDot';
import { MatchEvent, MatchStatusLog } from '@/hooks/useMatchRealtime';

interface TimelineTabProps {
  events: MatchEvent[];
  statusLogs: MatchStatusLog[];
  isLive: boolean;
  isShooter: boolean;
  isBR: boolean;
}

export function TimelineTab({ events, statusLogs, isLive, isShooter, isBR }: TimelineTabProps) {
  // Mock shooter map slots
  const mockMapSlots = [
    { number: 1, name: 'Nuketown', mode: 'Hardpoint', homeScore: 150, awayScore: 125, winner: 'home', status: 'completed' },
    { number: 2, name: 'Crash', mode: 'Search & Destroy', homeScore: 4, awayScore: 6, winner: 'away', status: 'completed' },
    { number: 3, name: 'Raid', mode: 'Control', homeScore: 110, awayScore: 95, winner: null, status: 'live' },
  ];

  // Mock BR results
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
      default:
        return `${ev.event_type.toUpperCase()} recorded`;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left 2 Cols: Event Stream */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center gap-2 border-b border-border-line pb-2">
          <Flame className="w-4 h-4 text-accent-signal" />
          <h3 className="font-display font-black text-lg uppercase tracking-wider">
            LIVE BROADCAST TIMELINE
          </h3>
          {isLive && (
            <span className="ml-auto text-[9px] font-data text-accent-signal flex items-center gap-1.5 bg-accent-signal/10 px-2 py-0.5 rounded border border-accent-signal/30 font-semibold">
              <StatusDot status="live" size="sm" />
              <span>TELEMETRY STREAM CONNECTED</span>
            </span>
          )}
        </div>

        {/* Status Delay Announcement */}
        {statusLogs.length > 0 && statusLogs[0].reason && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded flex items-start gap-3">
            <Clock className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-display font-bold uppercase tracking-wider block">
                Broadcast Delay Announcement
              </span>
              <p className="font-body text-text-muted">
                Match status: <span className="font-semibold text-amber-400 uppercase">{statusLogs[0].new_status}</span>.
                Reason: "{statusLogs[0].reason}".
              </p>
            </div>
          </div>
        )}

        {/* Live Timeline Events List */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {events.map((ev) => (
            <div
              key={ev.id}
              className={`bg-bg-surface border p-3 rounded transition-all flex items-start gap-4 ${
                ev.is_void ? 'border-state-alert/10 opacity-40 line-through' : 'border-border-line hover:border-accent-readout/30'
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
                Awaiting kick-off telemetry events
              </p>
              <p className="text-[10px] font-data mt-0.5">Timeline updates automatically in real-time.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Col: Map Matrix / BR Table */}
      <div className="space-y-6">
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
                      ? 'bg-accent-signal/10 border-accent-signal/30'
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
                        <StatusDot status="live" size="sm" />
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
      </div>
    </div>
  );
}
