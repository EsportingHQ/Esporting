'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Modal, modalButton, modalPrimary } from '@/components/ui/Modal';

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
  const [approval, setApproval] = useState<{ requested: boolean; summary: string } | null>(null);

  async function doReschedule(carry: boolean) {
    setBusy(true);
    const iso = new Date(value).toISOString();
    const { error } = await supabase.rpc('reschedule_match', { p_match: matchId, p_at: iso, p_carry_over: carry });
    setBusy(false);
    if (error) return setMsg({ text: error.message, ok: false });
    setApproval(null);
    setMsg({ text: 'Rescheduled. The match is back on the schedule.', ok: true });
    router.refresh();
  }

  async function save() {
    setMsg(null);
    if (!value) return setMsg({ text: 'Pick a date and time', ok: false });
    if (!reschedule) {
      setBusy(true);
      const { error } = await supabase
        .from('matches')
        .update({ scheduled_at: new Date(value).toISOString() })
        .eq('id', matchId);
      setBusy(false);
      if (error) return setMsg({ text: error.message, ok: false });
      setMsg({ text: 'Time saved', ok: true });
      router.refresh();
      return;
    }
    // Rescheduling: if scores were recorded, the organiser decides whether they carry over
    setBusy(true);
    const [{ data: m }, { count: eventCount }] = await Promise.all([
      supabase
        .from('matches')
        .select('cancel_carry_over, home_maps_won, away_maps_won, best_of, match_scores(home_current_score, away_current_score)')
        .eq('id', matchId)
        .maybeSingle(),
      supabase
        .from('match_events')
        .select('id', { count: 'exact', head: true })
        .eq('match_id', matchId)
        .eq('is_void', false)
        .not('event_type', 'in', '(map_selected,mode_selected)'),
    ]);
    setBusy(false);
    const row = m as unknown as {
      cancel_carry_over: boolean | null;
      home_maps_won: number | null;
      away_maps_won: number | null;
      best_of: number;
      match_scores: { home_current_score: number | null; away_current_score: number | null } | { home_current_score: number | null; away_current_score: number | null }[] | null;
    } | null;
    const sc = Array.isArray(row?.match_scores) ? row?.match_scores[0] : row?.match_scores;
    const games = (row?.home_maps_won ?? 0) + (row?.away_maps_won ?? 0);
    const goals = (sc?.home_current_score ?? 0) + (sc?.away_current_score ?? 0);
    const hasPlay = (eventCount ?? 0) > 0 || games > 0 || goals > 0;
    if (!hasPlay) return void doReschedule(false);
    const summary =
      row && row.best_of > 1 && games > 0
        ? `${row.home_maps_won ?? 0} - ${row.away_maps_won ?? 0} in games`
        : `${sc?.home_current_score ?? 0} - ${sc?.away_current_score ?? 0}`;
    setApproval({ requested: row?.cancel_carry_over === true, summary });
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
      <Modal open={!!approval} title="Scores were recorded for this match" onClose={() => setApproval(null)} busy={busy}>
        <div className="space-y-3 text-sm">
          <p className="text-text-muted">
            Recorded so far: <span className="font-semibold text-text-primary">{approval?.summary}</span>.{' '}
            {approval?.requested
              ? 'The contributor asked to carry these scores over. Approve to keep finished games and goals; a game that was in progress restarts from 0.'
              : 'The contributor did not ask to carry them over, so the match will start fresh.'}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setApproval(null)} disabled={busy} className={modalButton}>
              Back
            </button>
            <button type="button" onClick={() => doReschedule(false)} disabled={busy} className={modalButton}>
              Start fresh
            </button>
            {approval?.requested ? (
              <button type="button" onClick={() => doReschedule(true)} disabled={busy} className={modalPrimary}>
                {busy ? 'Saving...' : 'Approve carry-over'}
              </button>
            ) : null}
          </div>
        </div>
      </Modal>
      {msg && <p className={`text-[11px] ${msg.ok ? 'text-state-win' : 'text-state-loss'}`}>{msg.text}</p>}
    </div>
  );
}
