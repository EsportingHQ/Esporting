'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export type Application = {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  org_name: string;
  games: string[];
  experience: string | null;
  links: string | null;
  status: 'pending' | 'approved' | 'rejected';
  review_note: string | null;
  created_at: string;
};

export default function ApplicationsClient({ applications }: { applications: Application[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function review(id: string, approve: boolean) {
    setBusy(id);
    setError(null);
    const { error } = await supabase.rpc('review_organiser_application', {
      p_id: id,
      p_approve: approve,
      p_note: notes[id]?.trim() || null,
    });
    setBusy(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  const pending = applications.filter((a) => a.status === 'pending');
  const reviewed = applications.filter((a) => a.status !== 'pending');

  return (
    <div className="space-y-8 font-body">
      <div>
        <h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">
          Organiser Applications
        </h2>
        <p className="text-xs text-text-muted font-data mt-1 uppercase">
          Approve people to become Verified Tournament Organisers ({pending.length} waiting)
        </p>
      </div>

      {error && (
        <div className="bg-state-alert/10 border border-state-alert/30 text-state-alert rounded px-4 py-3 text-xs">
          {error}
        </div>
      )}

      {pending.length === 0 && (
        <div className="bg-bg-surface border border-border-line rounded p-8 text-center text-xs text-text-muted">
          No applications waiting.
        </div>
      )}

      <div className="space-y-4">
        {pending.map((a) => (
          <div key={a.id} className="bg-bg-surface border border-border-line rounded p-5 space-y-3">
            <div>
              <p className="font-display font-black text-base text-text-primary uppercase tracking-wide">
                {a.org_name}
              </p>
              <p className="text-xs text-text-muted">
                {a.display_name} · {a.email} · {new Date(a.created_at).toLocaleDateString()}
              </p>
            </div>
            <p className="text-xs text-text-primary">Games: {a.games.join(', ') || '-'}</p>
            {a.experience && <p className="text-xs text-text-muted whitespace-pre-wrap">{a.experience}</p>}
            {a.links && <p className="text-xs text-accent-readout whitespace-pre-wrap">{a.links}</p>}
            <input
              placeholder="Note (shown to the applicant if you reject)"
              value={notes[a.id] ?? ''}
              onChange={(e) => setNotes((n) => ({ ...n, [a.id]: e.target.value }))}
              className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-xs text-text-primary"
            />
            <div className="flex gap-2">
              <button
                disabled={busy === a.id}
                onClick={() => review(a.id, true)}
                className="px-4 py-2 rounded bg-accent-primary text-white text-xs font-display font-bold uppercase tracking-wider disabled:opacity-50"
              >
                Approve as Verified TO
              </button>
              <button
                disabled={busy === a.id}
                onClick={() => review(a.id, false)}
                className="px-4 py-2 rounded bg-bg-void border border-border-line text-text-muted text-xs font-display font-bold uppercase tracking-wider disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {reviewed.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display font-bold text-xs uppercase tracking-widest text-text-muted">Reviewed</h3>
          {reviewed.map((a) => (
            <div key={a.id} className="bg-bg-surface border border-border-line rounded px-4 py-3 text-xs flex justify-between">
              <span className="text-text-primary">{a.org_name} · {a.email}</span>
              <span className={a.status === 'approved' ? 'text-state-win' : 'text-state-loss'}>{a.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
