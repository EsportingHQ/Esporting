"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type MatchRow = {
  id: string;
  status: string;
  scheduled_at: string | null;
  match_format: string;
  contrib_id: string | null;
  comp_instance_id: string;
  game_titles: { name: string } | null;
  comp_instances: { name: string } | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
};

type Contributor = {
  id: string;
  name: string;
  comp_instance_id: string | null;
};

type Props = {
  matches: MatchRow[];
  contributors: Contributor[];
};

export default function AdminMatchesClient({
  matches: initialMatches,
  contributors,
}: Props) {
  const supabase = createClient();
  const [matches, setMatches] = useState(initialMatches);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unassigned">("unassigned");

  async function assignContributor(matchId: string, contribId: string) {
    setError(null);
    setSavingId(matchId);
    try {
      const { error: updateError } = await supabase
        .from("matches")
        .update({ contrib_id: contribId || null })
        .eq("id", matchId);

      if (updateError) throw updateError;

      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId ? { ...m, contrib_id: contribId || null } : m,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to assign contributor",
      );
    } finally {
      setSavingId(null);
    }
  }

  const visibleMatches =
    filter === "unassigned" ? matches.filter((m) => !m.contrib_id) : matches;

  return (
    <div style={{ maxWidth: 900 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        Match Assignments
      </h2>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
        Assign contributors to matches so they can log live events.
      </p>

      {error && (
        <div
          style={{
            background: "#7f1d1d33",
            border: "1px solid #7f1d1d",
            color: "#fca5a5",
            padding: 10,
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setFilter("unassigned")}
          style={toggleButtonStyle(filter === "unassigned")}
        >
          Unassigned ({matches.filter((m) => !m.contrib_id).length})
        </button>
        <button
          onClick={() => setFilter("all")}
          style={toggleButtonStyle(filter === "all")}
        >
          All ({matches.length})
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visibleMatches.length === 0 && (
          <p style={{ color: "#666", fontSize: 13 }}>
            {filter === "unassigned"
              ? "All matches are assigned."
              : "No matches found."}
          </p>
        )}

        {visibleMatches.map((match) => (
          <div
            key={match.id}
            style={{
              background: "#111",
              borderRadius: 8,
              padding: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <p style={{ fontSize: 13, fontWeight: 600 }}>
                {match.match_format === "head_to_head"
                  ? `${match.home_team?.name ?? "TBD"} vs ${match.away_team?.name ?? "TBD"}`
                  : "Battle Royale Match"}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "#888",
                  marginTop: 2,
                }}
              >
                {match.comp_instances?.name} · {match.game_titles?.name} ·{" "}
                <span
                  style={{
                    color: match.status === "live" ? "#22c55e" : "#999",
                  }}
                >
                  {match.status}
                </span>
              </p>
            </div>

            <select
              value={match.contrib_id ?? ""}
              onChange={(e) => assignContributor(match.id, e.target.value)}
              disabled={savingId === match.id}
              style={selectStyle}
            >
              <option value="">Unassigned</option>
              {contributors
                .filter(
                  (c) =>
                    c.comp_instance_id === null ||
                    c.comp_instance_id === match.comp_instance_id,
                )
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function toggleButtonStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? "#16a34a" : "#1a1a1a",
    color: "#fff",
    border: `1px solid ${active ? "#16a34a" : "#333"}`,
    borderRadius: 8,
    padding: "6px 14px",
    fontSize: 13,
    cursor: "pointer",
  };
}

const selectStyle: React.CSSProperties = {
  background: "#1a1a1a",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
  minWidth: 180,
};
