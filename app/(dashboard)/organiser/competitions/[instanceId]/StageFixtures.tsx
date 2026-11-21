'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Stage = { id: string; name: string; stage_type: string; stage_order: number; best_of: number };

const btn =
  'px-3 py-2 rounded text-xs font-display font-bold uppercase tracking-wider disabled:opacity-50';

export default function StageFixtures({
  compId,
  stage,
  fixtureCount,
  teamCount,
  locked,
}: {
  compId: string;
  stage: Stage;
  fixtureCount: number;
  teamCount: number;
  locked: boolean;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [groups, setGroups] = useState(2);
  const [double, setDouble] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function run(label: string, fn: () => PromiseLike<{ data: unknown; error: { message: string } | null }>, ok: (n: number) => string) {
    setBusy(label);
    setMsg(null);
    const { data, error } = await fn();
    setBusy(null);
    if (error) return setMsg({ text: error.message, ok: false });
    setMsg({ text: ok(Number(data ?? 0)), ok: true });
    router.refresh();
  }

  const generate = () =>
    run(
      'gen',
      () => supabase.rpc('generate_fixtures', { p_comp: compId, p_stage: stage.id, p_groups: groups, p_double: double }),
      (n) => `${n} fixtures created. Set their times in the Matches tab.`,
    );
  const next = () =>
    run(
      'next',
      () => supabase.rpc('generate_next_knockout_round', { p_comp: compId, p_stage: stage.id }),
      (n) => `${n} fixtures created for the next round.`,
    );
  const clear = () => {
    if (!window.confirm('Remove all fixtures in this stage? Groups are removed too.')) return;
    run(
      'clear',
      () => supabase.rpc('clear_stage_fixtures', { p_comp: compId, p_stage: stage.id }),
      (n) => `${n} fixtures removed.`,
    );
  };

  const type = stage.stage_type;
  return (
    <div className="bg-bg-surface border border-border-line rounded p-4 space-y-3 text-xs">
      <div className="flex justify-between items-center">
        <span className="font-display font-bold text-sm text-text-primary uppercase">
          {stage.stage_order}. {stage.name}
        </span>
        <span className="font-data text-text-muted uppercase">
          {type} · BO{stage.best_of} · {fixtureCount} fixtures
        </span>
      </div>

      {type === 'ranking' ? (
        <p className="text-text-muted">Ranking stages are lobby based. Add lobbies in the Schedule tab.</p>
      ) : fixtureCount === 0 ? (
        <div className="space-y-3">
          <p className="text-text-muted">
            {teamCount} approved teams.{' '}
            {type === 'league' && 'Everyone plays everyone.'}
            {type === 'group' && 'Teams are split randomly and evenly into groups, then play each other in the group.'}
            {type === 'knockout' && 'Teams are paired at random. Later rounds are created once a round finishes.'}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {type === 'group' && (
              <label className="flex items-center gap-2 text-text-muted">
                Groups
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={groups}
                  onChange={(e) => setGroups(Math.max(1, Number(e.target.value) || 1))}
                  className="w-16 bg-bg-void border border-border-line rounded px-2 py-1 text-text-primary"
                />
              </label>
            )}
            {type !== 'knockout' && (
              <label className="flex items-center gap-2 text-text-muted">
                <input type="checkbox" checked={double} onChange={(e) => setDouble(e.target.checked)} />
                Home and away (two legs)
              </label>
            )}
            <button
              disabled={busy !== null || locked}
              onClick={generate}
              className={`${btn} bg-accent-readout text-bg-void`}
            >
              {busy === 'gen' ? 'Generating...' : type === 'knockout' ? 'Generate first round' : 'Generate fixtures'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {type === 'knockout' && (
            <button disabled={busy !== null || locked} onClick={next} className={`${btn} bg-accent-readout text-bg-void`}>
              {busy === 'next' ? 'Working...' : 'Generate next round'}
            </button>
          )}
          <button
            disabled={busy !== null || locked}
            onClick={clear}
            className={`${btn} bg-bg-void border border-border-line text-text-muted`}
          >
            {busy === 'clear' ? 'Removing...' : 'Clear fixtures'}
          </button>
        </div>
      )}
      {msg && <p className={msg.ok ? 'text-state-win' : 'text-state-loss'}>{msg.text}</p>}
    </div>
  );
}
