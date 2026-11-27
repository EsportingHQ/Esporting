'use client';

import { useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { createClient } from '@/lib/supabase/client';
import { matchKey, parseTeamList, sanitiseSvg } from '@/lib/team-import';
import { Modal, modalButton, modalDanger } from '@/components/ui/Modal';

type TeamRef = { id: string; name: string };
type GameRef = { id: string; name: string; slug: string };

// What a roster sheet looks like per game. Same columns everywhere; the gamertag is the in-game name.
const GAME_GUIDE: Record<string, { size: string; example: string[][]; note: string }> = {
  'codm-mp': {
    size: '5 players per team',
    example: [['Team Alpha', 'TAL', 'Chidi Okafor', 'AlphaChidi'], ['Team Alpha', 'TAL', 'Tunde Bello', 'TundeX']],
    note: 'Use each player\'s CODM in-game name.',
  },
  'codm-br': {
    size: '4 players per squad',
    example: [['Squad One', 'SQ1', 'Ada Eze', 'AdaSnipes'], ['Squad One', 'SQ1', 'Musa Ali', 'MusaBR']],
    note: 'Use each player\'s CODM in-game name.',
  },
  'freefire-br': {
    size: '4 players per squad',
    example: [['Lagos Wolves', 'LGW', 'Ife Ade', 'WolfIfe'], ['Lagos Wolves', 'LGW', 'Kay Obi', 'KayFF']],
    note: 'Use the in-game nickname. If you also collect the UID, put it after the name like "WolfIfe (12345678)".',
  },
  'pubg-br': {
    size: '4 players per squad',
    example: [['Abuja Kings', 'ABK', 'Sam Eke', 'KingSam'], ['Abuja Kings', 'ABK', 'Zee Musa', 'ZeeAim']],
    note: 'Use each player\'s PUBG in-game name.',
  },
  mlbb: {
    size: '5 players per team (plus sub)',
    example: [['Kano Titans', 'KNT', 'Bala Sani', 'BalaMage'], ['Kano Titans', 'KNT', 'Emeka N', 'EmekaJG']],
    note: 'Use the in-game name. If you also collect the ID, put it after the name like "BalaMage (12345678 (1234))".',
  },
};
const DEFAULT_GUIDE = {
  size: '',
  example: [['Team Alpha', 'TAL', 'Chidi Okafor', 'AlphaChidi'], ['Team Alpha', 'TAL', 'Tunde Bello', 'TundeX']],
  note: 'Use each player\'s in-game name or ID.',
};
const HEADER = ['Team Name', 'Tag', 'Player Name', 'Gamertag / In-game name'];

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_EXT: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

const EXAMPLE = `Team Name\tTag\tPlayer Name\tGamertag / In-game name
Evil Geniuses\tEG\tTaro Obi\tTaro
Evil Geniuses\tEG\tNori Ade\tNori
Fnatic\tFNC\tKori Eze\tKori`;

export default function BulkImportPanel({
  compId,
  teams,
  games = [],
  onChanged,
}: {
  compId: string;
  teams: TeamRef[];
  games?: GameRef[];
  onChanged: () => void | Promise<void>;
}) {
  const [supabase] = useState(() => createClient());
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'import' | 'logos' | 'clear' | null>(null);
  const [gameId, setGameId] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [logoReport, setLogoReport] = useState<string[] | null>(null);
  const csvInput = useRef<HTMLInputElement>(null);
  const zipInput = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseTeamList(text), [text]);
  const playerCount = parsed.reduce((n, t) => n + t.players.length, 0);
  const game = games.find((g) => g.id === gameId);
  const guide = (game && GAME_GUIDE[game.slug]) || DEFAULT_GUIDE;

  function downloadTemplate() {
    const rows = [HEADER, ...guide.example].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${game?.slug ?? 'teams'}-roster-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function clearAll() {
    setError(null);
    setResult(null);
    setBusy('clear');
    const { data, error } = await supabase.rpc('remove_all_comp_teams', { p_comp: compId });
    setBusy(null);
    setConfirmClear(false);
    if (error) return setError(error.message);
    const r = data as { registrations_removed: number; teams_deleted: number; players_deleted: number };
    setResult(
      `Removed ${r.registrations_removed} teams from this competition. ${r.teams_deleted} teams and ${r.players_deleted} players that existed only because of it were deleted too.`,
    );
    await onChanged();
  }

  async function readCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setText(await file.text());
  }

  async function runImport() {
    setError(null);
    setResult(null);
    setBusy('import');
    const { data, error } = await supabase.rpc('bulk_import_teams', {
      p_comp: compId,
      p_teams: parsed,
      p_game: gameId || null,
    });
    setBusy(null);
    if (error) return setError(error.message);
    const r = data as { teams: unknown[]; new_teams: number; new_players: number };
    setResult(
      `${r.teams.length} teams added to this competition (${r.new_teams} new, ${r.teams.length - r.new_teams} already existed). ${r.new_players} new players created.`,
    );
    setText('');
    await onChanged();
  }

  async function runLogos(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setLogoReport(null);
    setBusy('logos');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in again');

      const zip = await JSZip.loadAsync(file);
      const byKey = new Map(teams.map((t) => [matchKey(t.name), t]));
      const done: string[] = [];
      const unmatched: string[] = [];
      const problems: string[] = [];

      const entries = Object.values(zip.files).filter(
        (f) => !f.dir && !f.name.startsWith('__MACOSX') && !f.name.split('/').pop()!.startsWith('.'),
      );
      if (entries.length > 128) throw new Error('Put at most 128 logos in one zip');

      for (const entry of entries) {
        const base = entry.name.split('/').pop()!;
        const ext = base.split('.').pop()?.toLowerCase() ?? '';
        const mime = LOGO_EXT[ext];
        if (!mime) {
          problems.push(`${base}: not an image`);
          continue;
        }
        const team = byKey.get(matchKey(base));
        if (!team) {
          unmatched.push(base);
          continue;
        }

        let blob: Blob;
        if (ext === 'svg') {
          const clean = sanitiseSvg(await entry.async('string'));
          if (!clean) {
            problems.push(`${base}: not a valid SVG`);
            continue;
          }
          blob = new Blob([clean], { type: mime });
        } else {
          blob = new Blob([await entry.async('arraybuffer')], { type: mime });
        }
        if (blob.size > MAX_LOGO_BYTES) {
          problems.push(`${base}: over 2 MB`);
          continue;
        }

        const path = `${user.id}/${crypto.randomUUID()}.${ext === 'jpeg' ? 'jpg' : ext}`;
        const { error: upErr } = await supabase.storage
          .from('logos')
          .upload(path, blob, { contentType: mime, cacheControl: '31536000' });
        if (upErr) {
          problems.push(`${base}: ${upErr.message}`);
          continue;
        }
        const { data: pub } = supabase.storage.from('logos').getPublicUrl(path);
        const { error: rpcErr } = await supabase.rpc('set_team_logo', {
          p_comp: compId,
          p_team: team.id,
          p_url: pub.publicUrl,
        });
        if (rpcErr) problems.push(`${base}: ${rpcErr.message}`);
        else done.push(team.name);
      }

      const noLogo = teams.filter((t) => !done.includes(t.name)).map((t) => t.name);
      setLogoReport([
        `${done.length} logos matched and saved.`,
        ...(unmatched.length ? [`No team found for: ${unmatched.join(', ')}`] : []),
        ...(problems.length ? [`Problems: ${problems.join('; ')}`] : []),
        ...(noLogo.length && done.length ? [`Teams still without a new logo: ${noLogo.join(', ')}`] : []),
      ]);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read the zip');
    } finally {
      setBusy(null);
    }
  }

  const field =
    'w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout font-data';

  return (
    <div className="bg-bg-surface border border-border-line rounded p-6 space-y-6">
      <div className="space-y-2">
        <h4 className="font-display font-black text-sm uppercase tracking-wider text-text-primary">
          1. Paste or upload your teams
        </h4>
        <p className="text-xs text-text-muted leading-relaxed">
          One team per line: the team name, then the players&apos; gamertags. Copy straight from Excel or
          Google Sheets, or upload a CSV. Any number of players per team. The gamertag is what stats are
          tracked under, so spell it the way players use it. You can edit everything afterwards.
        </p>
        {games.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="import-game" className="text-xs font-display font-bold uppercase tracking-wider text-text-muted">
              Game
            </label>
            <select
              id="import-game"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="bg-bg-void border border-border-line rounded px-2 py-1.5 text-xs text-text-primary"
            >
              <option value="">All games in this competition</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={downloadTemplate}
              className="px-3 py-1.5 rounded bg-bg-void border border-border-line text-xs font-display font-bold uppercase tracking-wider text-text-primary"
            >
              Download template
            </button>
          </div>
        )}
        <div className="border border-border-line rounded overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-text-muted">
                {HEADER.map((h) => (
                  <th key={h} className="px-3 py-1.5 font-display font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-text-muted">
              {guide.example.map((r, i) => (
                <tr key={i} className="border-t border-border-line">
                  {r.map((c, j) => (
                    <td key={j} className="px-3 py-1.5">{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-text-muted">
          One row per player. {guide.size ? `${guide.size}. ` : ''}{guide.note} Tag and Player Name are optional.
        </p>
        <textarea
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EXAMPLE}
          className={field}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => csvInput.current?.click()}
            className="px-3 py-1.5 rounded bg-bg-void border border-border-line text-xs font-display font-bold uppercase tracking-wider text-text-primary"
          >
            Upload CSV / TXT
          </button>
          <input ref={csvInput} type="file" accept=".csv,.txt,text/csv,text/plain" onChange={readCsv} className="hidden" />
          {parsed.length > 0 && (
            <span className="text-xs text-text-muted">
              Found {parsed.length} teams and {playerCount} players
            </span>
          )}
        </div>

        {parsed.length > 0 && (
          <div className="max-h-56 overflow-auto border border-border-line rounded divide-y divide-border-line">
            {parsed.map((t, i) => (
              <div key={i} className="px-3 py-2 text-xs flex gap-3">
                <span className="font-display font-bold text-text-primary uppercase w-40 shrink-0 truncate">{t.name}</span>
                <span className="text-text-muted">
                  {t.tag ? `[${t.tag}] ` : ''}
                  {t.players.map((p) => p.gamertag).join(', ') || 'no players'}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          disabled={busy !== null || parsed.length === 0}
          onClick={runImport}
          className="bg-accent-readout text-bg-void font-display font-black text-xs uppercase tracking-wider px-4 py-2 rounded disabled:opacity-50"
        >
          {busy === 'import' ? 'Importing...' : `Import ${parsed.length || ''} teams`}
        </button>
        {result && <p className="text-xs text-state-win">{result}</p>}
      </div>

      <div className="space-y-2 border-t border-border-line pt-5">
        <h4 className="font-display font-black text-sm uppercase tracking-wider text-text-primary">
          Imported the wrong list?
        </h4>
        <p className="text-xs text-text-muted leading-relaxed">
          Removes every team from this competition so you can import again. Only works before fixtures exist.
          Teams and players that were created only for this competition are deleted too; anything used elsewhere is kept.
        </p>
        <button
          type="button"
          disabled={busy !== null || teams.length === 0}
          onClick={() => setConfirmClear(true)}
          className="px-3 py-1.5 rounded border border-state-loss/50 text-state-loss text-xs font-display font-bold uppercase tracking-wider disabled:opacity-50"
        >
          Delete all {teams.length} teams
        </button>
      </div>
      <Modal open={confirmClear} title="Delete all teams?" onClose={() => setConfirmClear(false)} busy={busy === 'clear'}>
        <p className="text-sm text-text-muted mb-4">
          This removes all {teams.length} teams (and their rosters) from this competition. It cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" className={modalButton} onClick={() => setConfirmClear(false)} disabled={busy === 'clear'}>
            Keep teams
          </button>
          <button type="button" className={modalDanger} onClick={clearAll} disabled={busy === 'clear'}>
            {busy === 'clear' ? 'Deleting...' : 'Yes, delete all'}
          </button>
        </div>
      </Modal>

      <div className="space-y-2 border-t border-border-line pt-5">
        <h4 className="font-display font-black text-sm uppercase tracking-wider text-text-primary">
          2. Upload all team logos in one zip
        </h4>
        <p className="text-xs text-text-muted leading-relaxed">
          Put one image per team in a zip and name each file after its team, for example{' '}
          <span className="font-data">Fnatic.svg</span> or <span className="font-data">Team Liquid.svg</span>.
          SVG is best. PNG, JPG and WebP also work (2 MB each). Logos are matched to the {teams.length}{' '}
          registered teams by name.
        </p>
        <button
          type="button"
          disabled={busy !== null || teams.length === 0}
          onClick={() => zipInput.current?.click()}
          className="px-3 py-1.5 rounded bg-bg-void border border-border-line text-xs font-display font-bold uppercase tracking-wider text-text-primary disabled:opacity-50"
        >
          {busy === 'logos' ? 'Reading zip...' : 'Choose logos zip'}
        </button>
        <input ref={zipInput} type="file" accept=".zip,application/zip" onChange={runLogos} className="hidden" />
        {teams.length === 0 && <p className="text-xs text-text-muted italic">Import your teams first.</p>}
        {logoReport && (
          <ul className="text-xs text-text-muted space-y-1 list-disc pl-4">
            {logoReport.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-xs text-state-loss">{error}</p>}
    </div>
  );
}
