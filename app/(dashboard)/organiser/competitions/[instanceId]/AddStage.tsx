'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const input = 'bg-bg-void border border-border-line rounded px-2 py-1.5 text-text-primary text-xs';

export default function AddStage({
  compId,
  nextOrder,
  games,
  locked,
}: {
  compId: string;
  nextOrder: number;
  games: { id: string; name: string }[];
  locked: boolean;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('group');
  const [bestOf, setBestOf] = useState(1);
  const [game, setGame] = useState('');
  const [qualify, setQualify] = useState<'auto' | 'manual'>('auto');
  const [perGroup, setPerGroup] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!name.trim()) return setError('Give the stage a name, for example "Group Stage" or "Playoffs"');
    setBusy(true);
    const { error } = await supabase.from('comp_stages').insert({
      comp_instance_id: compId,
      name: name.trim(),
      stage_type: type,
      stage_order: nextOrder,
      best_of: bestOf,
      game_title_id: game || null,
      ...(type === 'knockout' ? { qualify_mode: qualify, qualifiers_per_group: perGroup } : {}),
    });
    setBusy(false);
    if (error) return setError(error.message);
    setOpen(false);
    setName('');
    router.refresh();
  }

  if (locked) return null;
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 rounded bg-bg-surface border border-border-line text-xs font-display font-bold uppercase tracking-wider text-text-primary"
      >
        + Add stage
      </button>
    );
  }
  return (
    <div className="bg-bg-surface border border-border-line rounded p-4 space-y-3 text-xs">
      <div className="flex flex-wrap gap-3 items-center">
        <input placeholder="Stage name" value={name} onChange={(e) => setName(e.target.value)} className={`${input} w-48`} />
        <select value={type} onChange={(e) => setType(e.target.value)} className={input}>
          <option value="league">League</option>
          <option value="group">Groups</option>
          <option value="knockout">Knockout</option>
          <option value="ranking">Ranking (Battle Royale)</option>
        </select>
        <label className="flex items-center gap-2 text-text-muted">
          Best of
          <input type="number" min={1} max={99} value={bestOf} onChange={(e) => setBestOf(Math.min(99, Math.max(1, Number(e.target.value) || 1)))} className={`${input} w-16`} />
        </label>
        <select value={game} onChange={(e) => setGame(e.target.value)} className={input}>
          <option value="">All games</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>
      {type === 'knockout' && (
        <div className="flex flex-wrap items-center gap-3 text-text-muted">
          <select value={qualify} onChange={(e) => setQualify(e.target.value as 'auto' | 'manual')} className={input}>
            <option value="auto">Top teams from the earlier stage move on automatically</option>
            <option value="manual">I will pick the teams myself</option>
          </select>
          {qualify === 'auto' && (
            <label className="flex items-center gap-2">
              Teams through per group
              <input type="number" min={1} max={32} value={perGroup} onChange={(e) => setPerGroup(Math.min(32, Math.max(1, Number(e.target.value) || 2)))} className={`${input} w-16`} />
            </label>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button disabled={busy} onClick={save} className="px-3 py-2 rounded bg-accent-readout text-bg-void text-xs font-display font-bold uppercase tracking-wider disabled:opacity-50">
          {busy ? 'Saving...' : 'Add stage'}
        </button>
        <button onClick={() => setOpen(false)} className="px-3 py-2 rounded bg-bg-void border border-border-line text-text-muted text-xs font-display font-bold uppercase tracking-wider">
          Cancel
        </button>
      </div>
      {error && <p className="text-state-loss">{error}</p>}
    </div>
  );
}
