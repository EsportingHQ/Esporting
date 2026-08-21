"use client";

import Link from "next/link";
import { Users, User } from "lucide-react";
import { Match } from "@/hooks/useMatchRealtime";

interface LineupsTabProps {
  match: Match;
}

export function LineupsTab({ match }: LineupsTabProps) {
  const homeLineup = [
    {
      id: "p1",
      name: "Kuti_Junior",
      role: "starter",
      number: 10,
      position: "FWD",
    },
    {
      id: "p2",
      name: "Striker_X",
      role: "starter",
      number: 7,
      position: "MID",
    },
    {
      id: "p3",
      name: "Defender_One",
      role: "starter",
      number: 4,
      position: "DEF",
    },
    {
      id: "p4",
      name: "Benched_Guy",
      role: "substitute",
      number: 12,
      position: "SUB",
    },
  ];

  const awayLineup = [
    {
      id: "p5",
      name: "Bello_Master",
      role: "starter",
      number: 9,
      position: "FWD",
    },
    {
      id: "p6",
      name: "Venom_Sniper",
      role: "starter",
      number: 11,
      position: "MID",
    },
    {
      id: "p7",
      name: "Shield_Wall",
      role: "starter",
      number: 5,
      position: "DEF",
    },
    {
      id: "p8",
      name: "Coach_Sub",
      role: "substitute",
      number: 14,
      position: "SUB",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-border-line pb-2">
        <Users className="w-4 h-4 text-accent-readout" />
        <h3 className="font-display font-black text-lg uppercase tracking-wider">
          OFFICIAL SQUAD LINEUPS
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Home Squad */}
        <div className="bg-bg-surface border border-border-line rounded p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-border-line pb-2">
            <span className="font-display font-bold uppercase text-sm text-accent-readout">
              {match.team_home?.name}
            </span>
            <span className="text-[10px] font-data text-text-muted">
              HOME SQUAD
            </span>
          </div>

          <div className="space-y-2 text-xs font-body">
            <div className="text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
              STARTING LINEUP
            </div>
            {homeLineup
              .filter((p) => p.role === "starter")
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/players/${p.id}`}
                  className="bg-bg-void border border-border-line hover:border-accent-readout/40 px-3 py-2 rounded flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded bg-border-line flex items-center justify-center font-data font-bold text-[10px] text-text-muted">
                      {p.number}
                    </span>
                    <span className="font-medium text-text-primary group-hover:text-accent-readout transition-colors">
                      {p.name}
                    </span>
                  </div>
                  <span className="text-[9px] font-data text-text-muted bg-bg-surface px-1.5 py-0.5 rounded border border-border-line">
                    {p.position}
                  </span>
                </Link>
              ))}

            <div className="text-[10px] font-display font-bold text-text-muted uppercase tracking-wider pt-2">
              SUBSTITUTES
            </div>
            {homeLineup
              .filter((p) => p.role === "substitute")
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/players/${p.id}`}
                  className="bg-bg-void/50 border border-border-line hover:border-accent-readout/40 px-3 py-2 rounded flex items-center justify-between transition-all text-text-muted hover:text-text-primary group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded bg-border-line/50 flex items-center justify-center font-data font-bold text-[10px]">
                      {p.number}
                    </span>
                    <span className="font-medium truncate group-hover:text-accent-readout transition-colors">
                      {p.name}
                    </span>
                  </div>
                  <span className="text-[9px] font-data text-text-muted bg-bg-surface px-1.5 py-0.5 rounded border border-border-line">
                    SUB
                  </span>
                </Link>
              ))}
          </div>
        </div>

        {/* Away Squad */}
        <div className="bg-bg-surface border border-border-line rounded p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-border-line pb-2">
            <span className="font-display font-bold uppercase text-sm text-accent-readout">
              {match.team_away?.name}
            </span>
            <span className="text-[10px] font-data text-text-muted">
              AWAY SQUAD
            </span>
          </div>

          <div className="space-y-2 text-xs font-body">
            <div className="text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
              STARTING LINEUP
            </div>
            {awayLineup
              .filter((p) => p.role === "starter")
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/players/${p.id}`}
                  className="bg-bg-void border border-border-line hover:border-accent-readout/40 px-3 py-2 rounded flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded bg-border-line flex items-center justify-center font-data font-bold text-[10px] text-text-muted">
                      {p.number}
                    </span>
                    <span className="font-medium text-text-primary group-hover:text-accent-readout transition-colors">
                      {p.name}
                    </span>
                  </div>
                  <span className="text-[9px] font-data text-text-muted bg-bg-surface px-1.5 py-0.5 rounded border border-border-line">
                    {p.position}
                  </span>
                </Link>
              ))}

            <div className="text-[10px] font-display font-bold text-text-muted uppercase tracking-wider pt-2">
              SUBSTITUTES
            </div>
            {awayLineup
              .filter((p) => p.role === "substitute")
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/players/${p.id}`}
                  className="bg-bg-void/50 border border-border-line hover:border-accent-readout/40 px-3 py-2 rounded flex items-center justify-between transition-all text-text-muted hover:text-text-primary group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded bg-border-line/50 flex items-center justify-center font-data font-bold text-[10px]">
                      {p.number}
                    </span>
                    <span className="font-medium truncate group-hover:text-accent-readout transition-colors">
                      {p.name}
                    </span>
                  </div>
                  <span className="text-[9px] font-data text-text-muted bg-bg-surface px-1.5 py-0.5 rounded border border-border-line">
                    SUB
                  </span>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
