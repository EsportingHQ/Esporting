'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Stage = { id: string; name: string; stage_type: string; stage_order: number; best_of: number };
type PreviewRow = { group: string | null; round: string; home: string; away: string; game: string };

const btn =
  'px-3 py-2 rounded text-xs font-display font-bold uppercase tracking-wider disabled:opacity-50';
const input =
  'bg-bg-void border border-border-line rounded px-2 py-1 text-text-primary text-xs';

function splitText(teams: number, groups: number): string {
  const base = Math.floor(teams / groups);
  const extra = teams % groups;
  if (extra === 0) return `${base} per group`;
  const sizes = [...Array(extra).fill(base + 1), ...Array(groups - extra).fill(base)];
  return sizes.join(', ');
}

const TYPE_HELP: Record<string, string> = {
  league: 'Everyone plays everyone.',
  group: 'Teams play each other inside their group. Let us draw the groups evenly, or pick them yourself.',
  knockout: 'Teams are drawn at random into a full bracket. If the number of teams is not 2, 4, 8, 16..., some teams skip round 1. Winners move into the next round on their own.',
};

export default function StageFixtures({
  compId,
  stage,
  fixtureCount,
  teamCount,
  teams,
  locked,
}: {
  compId: string;
  stage: Stage;
  fixtureCount: number;
  teamCount: number;
  teams: { id: string; name: string; manual_group: number | null }[];
  locked: boolean;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [groups, setGroups] = useState(2);
  const [mode, setMode] = useState<'auto' | 'manual'>(
    teams.length > 0 && teams.every((t) => t.manual_group) ? 'manual' : 'auto',
  );
  const [assign, setAssign] = useState<Record<string, number>>(() =>
    Object.fromEntries(teams.filter((t) => t.manual_group).map((t) => [t.id, t.manual_group as number])),
  );
  const [savedAssign, setSavedAssign] = useState<Record<string, number>>(assign);
  const [double, setDouble] = useState(false);
  const [perDay, setPerDay] = useState(2);
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

  const assignedAll = teams.length > 0 && teams.every((t) => assign[t.id]);
  const dirty = JSON.stringify(assign) !== JSON.stringify(savedAssign);
  const manualReady = mode === 'manual' ? assignedAll && !dirty : true;
  const sizes = Array.from({ length: groups }, (_, i) => teams.filter((t) => assign[t.id] === i + 1).length);

  async function saveGroups(list: Record<string, number>) {
    setBusy('groups');
    setMsg(null);
    const payload = Object.entries(list).map(([team_id, group]) => ({ team_id, group }));
    const { error } = await supabase.rpc('set_manual_groups', { p_comp: compId, p_assignments: payload });
    setBusy(null);
    if (error) {
      setMsg({ text: error.message, ok: false });
      return false;
    }
    setSavedAssign(list);
    setPreview(null);
    return true;
  }

  async function switchMode(next: 'auto' | 'manual') {
    setMode(next);
    setPreview(null);
    if (next === 'auto' && Object.keys(savedAssign).length > 0) {
      setAssign({});
      await saveGroups({});
    }
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

  async function autoSchedule() {
    setBusy('sched');
    setMsg(null);
    const { data, error } = await supabase.rpc('auto_schedule_stage', {
      p_comp: compId, p_stage: stage.id, p_per_day: perDay,
    });
    setBusy(null);
    if (error) return setMsg({ text: error.message, ok: false });
    setMsg({ text: `${data} fixtures given dates inside the competition window. You can still change any time in the Matches tab.`, ok: true });
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
              <div className="flex items-center gap-1 bg-bg-void border border-border-line rounded p-0.5">
                {(['auto', 'manual'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={locked || busy !== null}
                    onClick={() => switchMode(m)}
                    className={`px-3 py-1 rounded text-[11px] font-display font-bold uppercase tracking-wider ${
                      mode === m ? 'bg-accent-readout text-bg-void' : 'text-text-muted'
                    }`}
                  >
                    {m === 'auto' ? 'Auto draw' : 'I pick groups'}
                  </button>
                ))}
              </div>
            )}
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
            {teamCount} teams registered. {TYPE_HELP[type]}
          </p>
          {type === 'group' && mode === 'manual' && (
            <div className="space-y-2 border border-border-line rounded p-3 bg-bg-void">
              <p className="text-text-muted">Choose a group for every team. Each group needs at least 2 teams.</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {teams.map((t) => (
                  <label key={t.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-text-primary">{t.name}</span>
                    <select
                      value={assign[t.id] ?? 0}
                      disabled={locked}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setAssign((prev) => {
                          const n = { ...prev };
                          if (v === 0) delete n[t.id];
                          else n[t.id] = v;
                          return n;
                        });
                        setPreview(null);
                      }}
                      className={input}
                    >
                      <option value={0}>Pick group</option>
                      {Array.from({ length: groups }, (_, i) => (
                        <option key={i} value={i + 1}>Group {String.fromCharCode(65 + i)}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <p className="text-text-muted">
                {sizes.map((n, i) => `Group ${String.fromCharCode(65 + i)}: ${n}`).join(' · ')}
                {assignedAll ? '' : ` · ${teams.filter((t) => !assign[t.id]).length} not placed yet`}
              </p>
              <button
                disabled={busy !== null || locked || !assignedAll || !dirty || sizes.some((n) => n < 2)}
                onClick={() => saveGroups(assign)}
                className={`${btn} bg-accent-readout text-bg-void`}
              >
                {busy === 'groups' ? 'Saving...' : dirty ? 'Save groups' : 'Groups saved'}
              </button>
            </div>
          )}
          {type === 'group' && mode === 'auto' && teamCount >= 2 && (
            <p className="text-text-muted">
              {groups > teamCount / 2
                ? `Too many groups: each group needs at least 2 teams, so ${Math.floor(teamCount / 2)} is the most.`
                : `${teamCount} teams in ${groups} group${groups > 1 ? 's' : ''}: ${splitText(teamCount, groups)}.`}
            </p>
          )}
          {teamCount < 2 && (
            <p className="text-state-alert">Register at least 2 teams in the Teams tab first.</p>
          )}

          {!preview ? (
            <button
              disabled={busy !== null || locked || teamCount < 2 || !manualReady}
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
        <div className="space-y-3">
          <p className="text-text-muted">
            This stage has {fixtureCount} fixtures. To redo the draw or change the format, clear them first.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-text-muted">
              Matches per day
              <input
                type="number"
                min={1}
                max={12}
                value={perDay}
                onChange={(e) => setPerDay(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
                className={`${input} w-16`}
              />
            </label>
            <button disabled={busy !== null || locked} onClick={autoSchedule} className={`${btn} bg-accent-readout text-bg-void`}>
              {busy === 'sched' ? 'Scheduling...' : 'Auto-set dates'}
            </button>
          </div>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy !== null || locked}
            onClick={clear}
            className={`${btn} bg-bg-void border border-border-line text-text-muted`}
          >
            {busy === 'clear' ? 'Removing...' : 'Clear fixtures'}
          </button>
        </div>
        </div>
      )}
      {type === 'knockout' && fixtureCount > 0 && <LevelMatches stageId={stage.id} locked={locked} />}
      {msg && <p className={msg.ok ? 'text-state-win' : 'text-state-loss'}>{msg.text}</p>}
    </div>
  );
}

type Level = {
  id: string;
  bracket_round: number;
  home: { id: string; name: string } | null;
  away: { id: string; name: string } | null;
};

// A knockout match that ended level has no winner yet. The organiser picks who went through
// (extra time, penalties) and the bracket moves them on.
function LevelMatches({ stageId, locked }: { stageId: string; locked: boolean }) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<Level[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('matches')
      .select(
        'id, bracket_round, home:teams!matches_team_home_id_fkey(id, name), away:teams!matches_team_away_id_fkey(id, name)',
      )
      .eq('stage_id', stageId)
      .eq('status', 'completed')
      .is('winner_team_id', null)
      .not('bracket_round', 'is', null)
      .is('deleted_at', null)
      .order('bracket_round');
    const list = (data ?? []) as unknown as {
      id: string;
      bracket_round: number;
      home: Level['home'] | Level['home'][];
      away: Level['away'] | Level['away'][];
    }[];
    setRows(
      list.map((r) => ({
        id: r.id,
        bracket_round: r.bracket_round,
        home: Array.isArray(r.home) ? (r.home[0] ?? null) : r.home,
        away: Array.isArray(r.away) ? (r.away[0] ?? null) : r.away,
      })),
    );
  }, [supabase, stageId]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function pick(matchId: string, teamId: string) {
    setErr(null);
    const { error } = await supabase.rpc('set_knockout_winner', { p_match: matchId, p_team: teamId });
    if (error) return setErr(error.message);
    load();
  }

  if (rows.length === 0 && !err) return null;
  return (
    <div className="border border-state-alert/40 rounded p-3 space-y-2">
      <p className="text-xs font-bold text-state-alert">Level after the match. Pick who goes through:</p>
      {rows.map((m) => (
        <div key={m.id} className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-text-muted">Round {m.bracket_round}</span>
          {[m.home, m.away].map((t) =>
            t ? (
              <button
                key={t.id}
                disabled={locked}
                onClick={() => pick(m.id, t.id)}
                className={`${btn} bg-bg-void border border-border-line text-text-primary`}
              >
                {t.name} goes through
              </button>
            ) : null,
          )}
        </div>
      ))}
      {err && <p className="text-state-loss text-xs">{err}</p>}
    </div>
  );
}
