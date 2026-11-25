'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MatchTimeEditor({
  matchId,
  scheduledAt,
  disabled,
  status = 'scheduled',
}: {
  matchId: string;
  scheduledAt: string | null;
  disabled: boolean;
  status?: string;
}) {
  // A cancelled or delayed match goes back on the schedule (same match, same bracket slot)
  const reschedule = status === 'cancelled' || status === 'delayed';
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [value, setValue] = useState(toLocalInput(scheduledAt));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function save() {
    setMsg(null);
    if (!value) return setMsg({ text: 'Pick a date and time', ok: false });
    setBusy(true);
    const iso = new Date(value).toISOString();
    const { error } = reschedule
      ? await supabase.rpc('reschedule_match', { p_match: matchId, p_at: iso })
      : await supabase.from('matches').update({ scheduled_at: iso }).eq('id', matchId);
    setBusy(false);
    if (error) return setMsg({ text: error.message, ok: false });
    setMsg({ text: reschedule ? 'Rescheduled. The match is back on the schedule.' : 'Time saved', ok: true });
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <input
          type="datetime-local"
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          className="bg-bg-void border border-border-line rounded px-2 py-1 text-xs text-text-primary disabled:opacity-50"
        />
        <button
          type="button"
          disabled={busy || disabled}
          onClick={save}
          className="px-2 py-1 rounded bg-bg-void border border-border-line text-[10px] font-display font-bold uppercase tracking-wider text-text-primary disabled:opacity-50"
        >
          {busy ? '...' : reschedule ? 'Reschedule' : scheduledAt ? 'Change time' : 'Set time'}
        </button>
      </div>
      {msg && <p className={`text-[11px] ${msg.ok ? 'text-state-win' : 'text-state-loss'}`}>{msg.text}</p>}
    </div>
  );
}
