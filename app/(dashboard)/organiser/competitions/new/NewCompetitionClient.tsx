'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, Plus, Trash2, Award, Calendar, Layers, Shield } from 'lucide-react';

type Series = { id: string; name: string };
type GameTitle = { id: string; name: string; slug: string };

type Props = {
  existingSeries: Series[];
  gameTitles: GameTitle[];
};

type StageInput = {
  name: string;
  stage_type: string;
  stage_order: number;
  best_of: number;
};

export default function NewCompetitionClient({ existingSeries, gameTitles }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [seriesMode, setSeriesMode] = useState<'new' | 'existing'>('new');
  const [seriesId, setSeriesId] = useState('');
  const [seriesName, setSeriesName] = useState('');
  const [seriesDescription, setSeriesDescription] = useState('');

  const [instanceName, setInstanceName] = useState('');
  const [editionLabel, setEditionLabel] = useState('');
  const [format, setFormat] = useState('league');
  const [prizePool, setPrizePool] = useState('');
  const [description, setDescription] = useState('');

  const [selectedGames, setSelectedGames] = useState<string[]>([]);

  const [stages, setStages] = useState<StageInput[]>([
    { name: 'Group Stage', stage_type: 'group', stage_order: 1, best_of: 1 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleGame(slug: string) {
    setSelectedGames((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function updateStage(index: number, field: keyof StageInput, value: string | number) {
    setStages((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  function addStage() {
    setStages((prev) => [
      ...prev,
      { name: '', stage_type: 'knockout', stage_order: prev.length + 1, best_of: 1 },
    ]);
  }

  function removeStage(index: number) {
    setStages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setError(null);

    if (!instanceName || selectedGames.length === 0) {
      setError('Competition name and at least one game are required');
      return;
    }
    if (seriesMode === 'new' && !seriesName) {
      setError('Series name is required');
      return;
    }
    if (seriesMode === 'existing' && !seriesId) {
      setError('Select an existing series');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session expired, please log in again');

      const body: Record<string, unknown> = {
        instance_name: instanceName,
        edition_label: editionLabel || null,
        format,
        prize_pool: prizePool || null,
        description: description || null,
        game_title_slugs: selectedGames,
        stages: stages.filter((s) => s.name),
      };

      if (seriesMode === 'new') {
        body.series_name = seriesName;
        body.series_description = seriesDescription || null;
      } else {
        body.series_id = seriesId;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/register-competition`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create competition');

      router.push(`/organiser/competitions/${data.competition.instance.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8 font-body">
      <div>
        <h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">
          Create Competition
        </h2>
        <p className="text-xs text-text-muted font-data mt-1 uppercase">
          REGISTER NEW LEAGUE, KNOCKOUT OR BR CAMPAIGN
        </p>
      </div>

      {error && (
        <div className="bg-state-loss/10 border border-state-loss/30 text-state-loss px-4 py-3 rounded text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-bg-surface border border-border-line rounded p-6 space-y-6">
        {/* Series Section */}
        <div className="space-y-3">
          <label className="block text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
            Competition Series
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSeriesMode('new')}
              className={`px-4 py-1.5 rounded text-xs font-display font-bold uppercase tracking-wider border transition-colors ${
                seriesMode === 'new'
                  ? 'bg-accent-readout border-accent-readout text-bg-void'
                  : 'bg-bg-void border-border-line text-text-muted hover:text-text-primary'
              }`}
            >
              New Series
            </button>
            <button
              type="button"
              onClick={() => setSeriesMode('existing')}
              className={`px-4 py-1.5 rounded text-xs font-display font-bold uppercase tracking-wider border transition-colors ${
                seriesMode === 'existing'
                  ? 'bg-accent-readout border-accent-readout text-bg-void'
                  : 'bg-bg-void border-border-line text-text-muted hover:text-text-primary'
              }`}
            >
              Existing Series
            </button>
          </div>

          {seriesMode === 'new' ? (
            <div className="space-y-2 pt-1">
              <input
                placeholder="Series Name (e.g. UI eSports League)"
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout transition-colors"
              />
              <textarea
                placeholder="Series description / history (optional)"
                value={seriesDescription}
                onChange={(e) => setSeriesDescription(e.target.value)}
                className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout transition-colors min-h-[60px]"
              />
            </div>
          ) : (
            <div className="pt-1">
              <select
                value={seriesId}
                onChange={(e) => setSeriesId(e.target.value)}
                className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-readout transition-colors"
              >
                <option value="">Select an existing series</option>
                {existingSeries.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Competition Instance Name */}
        <div className="space-y-1">
          <label className="block text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
            Competition Edition Name
          </label>
          <input
            placeholder="e.g. UI eSports League Season 1 2025"
            value={instanceName}
            onChange={(e) => setInstanceName(e.target.value)}
            className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout transition-colors"
          />
        </div>

        {/* Details Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
              Edition Label (optional)
            </label>
            <input
              placeholder="e.g. Season 1"
              value={editionLabel}
              onChange={(e) => setEditionLabel(e.target.value)}
              className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
              Prize Pool (optional)
            </label>
            <input
              placeholder="e.g. ₦500,000"
              value={prizePool}
              onChange={(e) => setPrizePool(e.target.value)}
              className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout transition-colors"
            />
          </div>
        </div>

        {/* Format */}
        <div className="space-y-1">
          <label className="block text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
            Tournament Format
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-readout transition-colors"
          >
            <option value="league">League (Round-Robin with Standings Table)</option>
            <option value="knockout">Knockout (Bracket Elimination)</option>
            <option value="group+knockout">Group Stage + Knockout Playoffs</option>
            <option value="ranking">Ranking (BR Lobby Accumulator)</option>
          </select>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="block text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-readout transition-colors min-h-[80px]"
          />
        </div>

        {/* Games Covered */}
        <div className="space-y-2">
          <label className="block text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
            Games Covered
          </label>
          <div className="flex flex-wrap gap-2">
            {gameTitles.map((g) => {
              const active = selectedGames.includes(g.slug);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGame(g.slug)}
                  className={`px-3 py-1.5 rounded text-xs font-display font-bold uppercase border transition-colors ${
                    active
                      ? 'bg-accent-readout border-accent-readout text-bg-void'
                      : 'bg-bg-void border-border-line text-text-muted hover:text-text-primary'
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stages list */}
        <div className="space-y-3 pt-2">
          <label className="block text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
            Competition Stages
          </label>
          <div className="space-y-2">
            {stages.map((stage, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  placeholder="Stage name (e.g. Group Stage)"
                  value={stage.name}
                  onChange={(e) => updateStage(i, 'name', e.target.value)}
                  className="bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout transition-colors flex-2"
                />
                <select
                  value={stage.stage_type}
                  onChange={(e) => updateStage(i, 'stage_type', e.target.value)}
                  className="bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-readout transition-colors flex-1"
                >
                  <option value="league">League</option>
                  <option value="group">Group</option>
                  <option value="knockout">Knockout</option>
                  <option value="ranking">Ranking</option>
                </select>
                <div className="flex items-center gap-1.5 bg-bg-void border border-border-line px-2 rounded h-[38px] shrink-0">
                  <span className="text-[10px] font-data text-text-muted">BO</span>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={stage.best_of}
                    onChange={(e) => updateStage(i, 'best_of', Number(e.target.value))}
                    className="w-8 bg-transparent text-text-primary text-sm font-data focus:outline-none text-center"
                    title="Best of maps"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeStage(i)}
                  className="bg-state-loss/10 hover:bg-state-loss/20 border border-state-loss/20 text-state-loss p-2 rounded transition-colors shrink-0"
                  title="Remove Stage"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addStage}
            className="inline-flex items-center gap-1 bg-bg-void hover:bg-bg-void/50 border border-border-line hover:border-accent-readout text-xs text-text-primary font-display font-bold uppercase tracking-wider px-3 py-1.5 rounded transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Stage</span>
          </button>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-border-line">
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="w-full bg-accent-readout hover:bg-accent-readout/80 disabled:opacity-50 text-bg-void font-display font-black text-sm uppercase tracking-widest py-3 rounded transition-all cursor-pointer"
          >
            {loading ? 'CREATING CAMPAIGN DATA...' : 'CREATE COMPETITION'}
          </button>
        </div>
      </div>
    </div>
  );
}
