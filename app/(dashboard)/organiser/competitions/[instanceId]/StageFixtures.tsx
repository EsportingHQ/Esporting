'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Stage = { id: string; name: string; stage_type: string; stage_order: number; best_of: number };
type PreviewRow = { group: string | null; round: string; home: string; away: string; game: string };

const btn =
  'px-3 py-2 rounded text-xs font-display font-bold uppercase tracking-wider disabled:opacity-50';
const input =
  'bg-bg-void border border-border-line rounded px-2 py-1 text-text-primary text-xs';

const TYPE_HELP: Record<string, string> = {
  league: 'Everyone plays everyone.',
  group: 'Teams are split randomly and evenly into groups, then play each other inside their group.',
  knockout: 'Teams are paired at random. Later rounds are created once a round finishes.',
};

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
  const [seed, setSeed] = useState(() => Math.random() * 1.8 - 0.9);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const type = stage.stage_type;

  async function changeStage(patch: { stage_type?: string; best_of?: number }) {
    setMsg(null);
    setPreview(null);
    const { error } = await supabase.from('comp_stages').update(patch).eq('id', stage.id);
    if (error) return setMsg({ text: error.message, ok: false });
    router.refresh();
  }

  async function doPreview(newSeed?: number) {
    const s = newSeed ?? seed;
    setBusy('preview');
    setMsg(null);
    const { data, error } = await supabase.rpc('preview_fixtures', {
      p_comp: compId, p_stage: stage.id, p_groups: groups, p_double: double, p_seed: s,
    });
    setBusy(null);
    if (error) return setMsg({ text: error.message, ok: false });
    setSeed(s);
    setPreview(data as PreviewRow[]);
  }

  async function confirm() {
    setBusy('gen');
    setMsg(null);
    const { data, error } = await supabase.rpc('generate_fixtures_seeded', {
      p_comp: compId, p_stage: stage.id, p_groups: groups, p_double: double, p_seed: seed,
    });
    setBusy(null);
    if (error) return setMsg({ text: error.message, ok: false });
    setPreview(null);
    setMsg({ text: `${data} fixtures created. Set their times in the Matches tab.`, ok: true });
    router.refresh();
  }

  async function next() {
    setBusy('next');
    setMsg(null);
    const { data, error } = await supabase.rpc('generate_next_knockout_round', { p_comp: compId, p_stage: stage.id });
    setBusy(null);
    if (error) return setMsg({ text: error.message, ok: false });
    setMsg({ text: `${data} fixtures created for the next round.`, ok: true });
    router.refresh();
  }

  async function clear() {
    if (!window.confirm('Remove all fixtures in this stage? Groups are removed too.')) return;
    setBusy('clear');
    setMsg(null);
    const { data, error } = await supabase.rpc('clear_stage_fixtures', { p_comp: compId, p_stage: stage.id });
    setBusy(null);
    if (error) return setMsg({ text: error.message, ok: false });
    setMsg({ text: `${data} fixtures removed.`, ok: true });
    router.refresh();
  }

  // group preview rows by group name
  const sections = new Map<string, PreviewRow[]>();
  for (const r of preview ?? []) {
    const k = r.group ?? 'Fixtures';
    sections.set(k, [...(sections.get(k) ?? []), r]);
  }

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
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-text-muted">
              Format
              <select
                value={type}
                disabled={locked}
                onChange={(e) => changeStage({ stage_type: e.target.value })}
                className={input}
              >
                <option value="league">League (everyone plays everyone)</option>
                <option value="group">Groups</option>
                <option value="knockout">Knockout</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-text-muted">
              Best of
              <input
                type="number"
                min={1}
                max={99}
                defaultValue={stage.best_of}
                disabled={locked}
                onBlur={(e) => {
                  const v = Math.min(99, Math.max(1, Number(e.target.value) || 1));
                  if (v !== stage.best_of) changeStage({ best_of: v });
                }}
                className={`${input} w-16`}
              />
            </label>
            {type === 'group' && (
              <label className="flex items-center gap-2 text-text-muted">
                Groups
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={groups}
                  onChange={(e) => { setGroups(Math.max(1, Number(e.target.value) || 1)); setPreview(null); }}
                  className={`${input} w-16`}
                />
              </label>
            )}
            {type !== 'knockout' && (
              <label className="flex items-center gap-2 text-text-muted">
                <input type="checkbox" checked={double} onChange={(e) => { setDouble(e.target.checked); setPreview(null); }} />
                Home and away (two legs)
              </label>
            )}
          </div>
          <p className="text-text-muted">
            {teamCount} approved teams. {TYPE_HELP[type]}
          </p>

          {!preview ? (
            <button
              disabled={busy !== null || locked}
              onClick={() => doPreview()}
              className={`${btn} bg-accent-readout text-bg-void`}
            >
              {busy === 'preview' ? 'Building preview...' : 'Preview fixtures'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="max-h-80 overflow-y-auto space-y-3 border border-border-line rounded p-3 bg-bg-void">
                {[...sections.entries()].map(([name, rows]) => (
                  <div key={name}>
                    <p className="font-display font-bold uppercase tracking-wider text-text-muted mb-1">{name}</p>
                    {rows.map((r, i) => (
                      <p key={i} className="text-text-primary">
                        <span className="text-text-muted">{r.round} · </span>
                        {r.home} vs {r.away}
                        <span className="text-text-muted"> · {r.game}</span>
                      </p>
                    ))}
                  </div>
                ))}
              </div>
              <p className="text-text-muted">
                This is a preview only. Nothing is saved until you confirm. {preview.length} fixtures.
              </p>
              <div className="flex flex-wrap gap-2">
                <button disabled={busy !== null} onClick={confirm} className={`${btn} bg-accent-readout text-bg-void`}>
                  {busy === 'gen' ? 'Creating...' : 'Confirm and create'}
                </button>
                <button
                  disabled={busy !== null}
                  onClick={() => doPreview(Math.random() * 1.8 - 0.9)}
                  className={`${btn} bg-bg-void border border-border-line text-text-primary`}
                >
                  Shuffle again
                </button>
                <button
                  disabled={busy !== null}
                  onClick={() => setPreview(null)}
                  className={`${btn} bg-bg-void border border-border-line text-text-muted`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
