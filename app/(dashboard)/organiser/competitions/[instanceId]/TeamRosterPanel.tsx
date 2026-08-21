"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Player = { id: string; gamertag: string };
type GameTitle = { id: string; name: string; slug: string };
type Assignment = { player_id: string; game_title_id: string };

type Props = {
  teamId: string;
  compInstanceId: string;
  gameTitles: GameTitle[];
  initialRoster: Player[];
  initialAssignments: Assignment[];
};

export default function TeamRosterPanel({
  teamId,
  compInstanceId,
  gameTitles,
  initialRoster,
  initialAssignments,
}: Props) {
  const supabase = createClient();
  const [roster, setRoster] = useState(initialRoster);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [gamertag, setGamertag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addPlayer() {
    if (!gamertag.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const { data: player, error: playerErr } = await supabase
        .from("players")
        .insert({ gamertag: gamertag.trim() })
        .select("id, gamertag")
        .single();
      if (playerErr) throw playerErr;

      const { error: rosterErr } = await supabase.from("team_rosters").insert({
        team_id: teamId,
        player_id: player.id,
        role: "player",
      });
      if (rosterErr) throw rosterErr;

      setRoster((prev) => [...prev, player]);
      setGamertag("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add player");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAssignment(playerId: string, gameTitleId: string) {
    const exists = assignments.some(
      (a) => a.player_id === playerId && a.game_title_id === gameTitleId,
    );
    try {
      if (exists) {
        await supabase.from("player_game_assignments").delete().match({
          comp_instance_id: compInstanceId,
          team_id: teamId,
          player_id: playerId,
          game_title_id: gameTitleId,
        });
        setAssignments((prev) =>
          prev.filter(
            (a) =>
              !(a.player_id === playerId && a.game_title_id === gameTitleId),
          ),
        );
      } else {
        await supabase.from("player_game_assignments").insert({
          comp_instance_id: compInstanceId,
          team_id: teamId,
          player_id: playerId,
          game_title_id: gameTitleId,
        });
        setAssignments((prev) => [
          ...prev,
          { player_id: playerId, game_title_id: gameTitleId },
        ]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update assignment",
      );
    }
  }

  return (
    <div className="bg-bg-surface border border-border-line rounded p-4 space-y-4 text-xs">
      <h4 className="font-display font-bold uppercase tracking-wider text-text-muted">
        Team Roster & Game Assignments
      </h4>

      {error && <div className="text-state-alert">{error}</div>}

      <div className="flex gap-2">
        <input
          value={gamertag}
          onChange={(e) => setGamertag(e.target.value)}
          placeholder="Player gamertag"
          className="flex-1 bg-bg-void border border-border-line rounded px-3 py-1.5 text-text-primary"
        />
        <button
          disabled={loading}
          onClick={addPlayer}
          className="bg-accent-readout text-bg-void font-bold px-3 py-1.5 rounded disabled:opacity-50"
        >
          Add Player
        </button>
      </div>

      <div className="space-y-2">
        {roster.map((player) => (
          <div
            key={player.id}
            className="bg-bg-void border border-border-line rounded p-3"
          >
            <div className="font-semibold text-text-primary mb-2">
              {player.gamertag}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {gameTitles.map((game) => {
                const active = assignments.some(
                  (a) =>
                    a.player_id === player.id && a.game_title_id === game.id,
                );
                return (
                  <button
                    key={game.id}
                    onClick={() => toggleAssignment(player.id, game.id)}
                    className={`px-2 py-1 rounded border font-bold uppercase tracking-wide ${
                      active
                        ? "bg-accent-readout border-accent-readout text-bg-void"
                        : "bg-bg-surface border-border-line text-text-muted"
                    }`}
                  >
                    {game.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {roster.length === 0 && (
          <p className="text-text-muted italic">No players added yet.</p>
        )}
      </div>
    </div>
  );
}
