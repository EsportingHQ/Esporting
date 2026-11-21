'use client';

import { useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { createClient } from '@/lib/supabase/client';
import { matchKey, parseTeamList, sanitiseSvg } from '@/lib/team-import';

type TeamRef = { id: string; name: string };

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_EXT: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

const EXAMPLE = `1. Evil Geniuses: Taro, Kaelith, Nori, Taliah, Ronan
2. Fnatic: Kori, Ezra, Jett, Jettar, Kira
3. T1: Gideon, Rex, Soren, Talia, Blaze`;

export default function BulkImportPanel({
  compId,
  teams,
  onChanged,
}: {
  compId: string;
  teams: TeamRef[];
  onChanged: () => void | Promise<void>;
}) {
  const [supabase] = useState(() => createClient());
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'import' | 'logos' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [logoReport, setLogoReport] = useState<string[] | null>(null);
  const csvInput = useRef<HTMLInputElement>(null);
  const zipInput = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseTeamList(text), [text]);
  const playerCount = parsed.reduce((n, t) => n + t.players.length, 0);

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
                <span className="text-text-muted">{t.players.join(', ') || 'no players'}</span>
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
