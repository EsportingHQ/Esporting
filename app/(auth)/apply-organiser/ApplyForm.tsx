'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const GAMES = [
  'EA FC',
  'FC Mobile',
  'eFootball Mobile',
  'Call of Duty Mobile',
  'PUBG Mobile',
  'Free Fire',
  'Mobile Legends',
];

const field =
  'w-full bg-bg-void border border-border-line rounded px-4 py-2.5 text-text-primary placeholder-text-muted/40 focus:outline-none focus:border-accent-readout text-sm font-body';
const label =
  'block text-xs font-display font-bold text-text-muted mb-1.5 uppercase tracking-wider';

export default function ApplyForm({
  initial,
}: {
  initial: { org_name: string; games: string[]; experience: string; links: string } | null;
}) {
  const supabase = createClient();
  const [org, setOrg] = useState(initial?.org_name ?? '');
  const [games, setGames] = useState<string[]>(initial?.games ?? []);
  const [experience, setExperience] = useState(initial?.experience ?? '');
  const [links, setLinks] = useState(initial?.links ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.rpc('apply_as_organiser', {
      p_org_name: org,
      p_games: games,
      p_experience: experience || null,
      p_links: links || null,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="bg-bg-surface border border-state-win/30 rounded p-6 text-sm text-text-primary font-body">
        Application sent. Esporting will review it and your account becomes a
        verified organiser once approved. Sign in again after approval to see
        your organiser dashboard.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-bg-surface border border-border-line rounded p-6 space-y-5">
      {error && (
        <div className="bg-state-alert/10 border border-state-alert/30 text-state-alert rounded px-4 py-3 text-xs">
          {error}
        </div>
      )}
      <div>
        <label className={label}>Organisation or brand name</label>
        <input value={org} onChange={(e) => setOrg(e.target.value)} required className={field} />
      </div>
      <div>
        <label className={label}>Games you will run</label>
        <div className="grid grid-cols-2 gap-2">
          {GAMES.map((g) => (
            <label key={g} className="flex items-center gap-2 text-xs text-text-primary">
              <input
                type="checkbox"
                checked={games.includes(g)}
                onChange={(e) =>
                  setGames((prev) => (e.target.checked ? [...prev, g] : prev.filter((x) => x !== g)))
                }
              />
              {g}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className={label}>Tournaments you have run before</label>
        <textarea value={experience} onChange={(e) => setExperience(e.target.value)} rows={3} className={field} />
      </div>
      <div>
        <label className={label}>Links (Instagram, Discord, YouTube...)</label>
        <textarea value={links} onChange={(e) => setLinks(e.target.value)} rows={2} className={field} />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full bg-accent-readout text-bg-void font-display font-black rounded px-4 py-2.5 text-sm uppercase tracking-widest disabled:opacity-50"
      >
        {busy ? 'Sending...' : initial ? 'Update application' : 'Send application'}
      </button>
    </form>
  );
}
