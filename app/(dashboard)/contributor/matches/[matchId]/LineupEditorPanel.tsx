"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type EligiblePlayer = { team_id: string; player_id: string; gamertag: string };
type LineupRow = {
  id: string;
  team_id: string;
  player_id: string;
  role: string;
  confirmed: boolean;
};

type Props = {
  matchId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  eligiblePlayers: EligiblePlayer[];
  initialLineup: LineupRow[];
};

export default function LineupEditorPanel({
  matchId,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  eligiblePlayers,
  initialLineup,
}: Props) {
  const supabase = createClient();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialLineup.map((l) => l.player_id)),
  );
  const [confirmed, setConfirmed] = useState(
    initialLineup.length > 0 && initialLineup.every((l) => l.confirmed),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePlayer(playerId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  async function saveLineup(markConfirmed: boolean) {
    setError(null);
    setSaving(true);
    try {
      // Full replace: remove existing rows for this match, insert current selection.
      // Simplest correct approach given lineups are contributor-controlled per match,
      // not incrementally appended.
      await supabase.from("match_lineups").delete().eq("match_id", matchId);

      const rows = Array.from(selected).map((playerId) => {
        const assignment = eligiblePlayers.find(
          (p) => p.player_id === playerId,
        );
        return {
          match_id: matchId,
          team_id: assignment?.team_id,
          player_id: playerId,
          role: "starter",
          confirmed: markConfirmed,
        };
      });

      if (rows.length > 0) {
        const { error: insertErr } = await supabase
          .from("match_lineups")
          .insert(rows);
        if (insertErr) throw insertErr;
      }

      setConfirmed(markConfirmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save lineup");
    } finally {
      setSaving(false);
    }
  }

  const homePlayers = eligiblePlayers.filter((p) => p.team_id === homeTeamId);
  const awayPlayers = eligiblePlayers.filter((p) => p.team_id === awayTeamId);

  function renderTeamColumn(teamName: string, players: EligiblePlayer[]) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-300">{teamName}</p>
        {players.length === 0 && (
          <p className="text-xs text-gray-500 italic">
            No players assigned to this game for this team yet.
          </p>
        )}
        {players.map((p) => (
          <label
            key={p.player_id}
            className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.has(p.player_id)}
              onChange={() => togglePlayer(p.player_id)}
            />
            <span>{p.gamertag}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-gray-800 bg-gray-900 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Match Lineup</h3>
        <span
          className={`text-xs px-2 py-1 rounded-full border ${
            confirmed
              ? "bg-green-500/15 text-green-300 border-green-500/30"
              : "bg-gray-800 text-gray-400 border-gray-700"
          }`}
        >
          {confirmed
            ? "Confirmed - visible to public"
            : "Not confirmed - hidden from public"}
        </span>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {renderTeamColumn(homeTeamName, homePlayers)}
        {renderTeamColumn(awayTeamName, awayPlayers)}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => saveLineup(false)}
          disabled={saving}
          className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-600 disabled:opacity-50"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={() => saveLineup(true)}
          disabled={saving || selected.size === 0}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Confirm Lineup"}
        </button>
      </div>
    </section>
  );
}
