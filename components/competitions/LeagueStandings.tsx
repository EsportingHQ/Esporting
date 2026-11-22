import type { StandingRow } from '@/hooks/useCompetitionDetail';

// One table per game and group. The columns follow how each game is scored:
//   football        goals for / against / difference, draws allowed
//   other H2H games (CODM, MLBB...)  wins and losses with a map record, no goals
export default function LeagueStandings({ rows }: { rows: StandingRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="p-10 text-center text-xs text-text-muted font-body">
        Standings appear here once teams are drawn and matches are played.
      </div>
    );
  }

  const tables = new Map<string, StandingRow[]>();
  for (const r of rows) {
    const key = `${r.gameName}||${r.groupName ?? ''}`;
    tables.set(key, [...(tables.get(key) ?? []), r]);
  }
  const gameCount = new Set(rows.map((r) => r.gameName)).size;

  return (
    <div className="space-y-6">
      {[...tables.entries()].map(([key, list]) => {
        const sample = list[0];
        const football = sample.metric === 'goals';
        const heading = [gameCount > 1 ? sample.gameName : null, sample.groupName].filter(Boolean).join(' · ');
        const th = 'py-3 px-3 text-center';
        return (
          <div key={key} className="overflow-x-auto">
            {heading && (
              <p className="px-4 pt-4 pb-2 font-display font-bold text-xs uppercase tracking-wider text-text-primary">
                {heading}
              </p>
            )}
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-bg-void border-b border-border-line font-display font-bold text-text-muted uppercase tracking-wider text-[11px]">
                  <th className={`${th} w-12`}>#</th>
                  <th className="py-3 px-4">Team</th>
                  <th className={th}>P</th>
                  <th className={th}>W</th>
                  {football && <th className={th}>D</th>}
                  <th className={th}>L</th>
                  {football ? (
                    <>
                      <th className={th}>GF</th>
                      <th className={th}>GA</th>
                      <th className={th}>GD</th>
                    </>
                  ) : (
                    <>
                      <th className={th}>Maps W</th>
                      <th className={th}>Maps L</th>
                      <th className={th}>Map diff</th>
                    </>
                  )}
                  <th className={`${th} text-accent-signal`}>Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-line font-data">
                {list.map((r) => (
                  <tr key={r.teamId} className="hover:bg-bg-void/40 transition-colors">
                    <td className={`${th} font-bold`}>{r.rank}</td>
                    <td className="py-3 px-4 font-body font-medium text-text-primary">{r.name}</td>
                    <td className={th}>{r.played}</td>
                    <td className={th}>{r.won}</td>
                    {football && <td className={th}>{r.drawn}</td>}
                    <td className={th}>{r.lost}</td>
                    <td className={th}>{r.scoreFor}</td>
                    <td className={th}>{r.scoreAgainst}</td>
                    <td className={th}>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                    <td className={`${th} font-bold text-accent-signal`}>{r.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
