'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Series = { id: string; name: string }
type GameTitle = { id: string; name: string; slug: string }

type Props = {
  existingSeries: Series[]
  gameTitles: GameTitle[]
}

type StageInput = {
  name: string
  stage_type: string
  stage_order: number
  best_of: number
}

export default function NewCompetitionClient({ existingSeries, gameTitles }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [seriesMode, setSeriesMode] = useState<'new' | 'existing'>('new')
  const [seriesId, setSeriesId] = useState('')
  const [seriesName, setSeriesName] = useState('')
  const [seriesDescription, setSeriesDescription] = useState('')

  const [instanceName, setInstanceName] = useState('')
  const [editionLabel, setEditionLabel] = useState('')
  const [format, setFormat] = useState('league')
  const [prizePool, setPrizePool] = useState('')
  const [description, setDescription] = useState('')

  const [selectedGames, setSelectedGames] = useState<string[]>([])

  const [stages, setStages] = useState<StageInput[]>([
    { name: 'Group Stage', stage_type: 'group', stage_order: 1, best_of: 1 },
  ])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleGame(slug: string) {
    setSelectedGames((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  function updateStage(index: number, field: keyof StageInput, value: string | number) {
    setStages((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
  }

  function addStage() {
    setStages((prev) => [
      ...prev,
      { name: '', stage_type: 'knockout', stage_order: prev.length + 1, best_of: 1 },
    ])
  }

  function removeStage(index: number) {
    setStages((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    setError(null)

    if (!instanceName || selectedGames.length === 0) {
      setError('Competition name and at least one game are required')
      return
    }
    if (seriesMode === 'new' && !seriesName) {
      setError('Series name is required')
      return
    }
    if (seriesMode === 'existing' && !seriesId) {
      setError('Select an existing series')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Session expired, please log in again')

      const body: Record<string, unknown> = {
        instance_name: instanceName,
        edition_label: editionLabel || null,
        format,
        prize_pool: prizePool || null,
        description: description || null,
        game_title_slugs: selectedGames,
        stages: stages.filter((s) => s.name),
      }

      if (seriesMode === 'new') {
        body.series_name = seriesName
        body.series_description = seriesDescription || null
      } else {
        body.series_id = seriesId
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
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create competition')

      router.push(`/organiser/competitions/${data.competition.instance.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Create Competition</h2>

      {error && (
        <div style={{ background: '#7f1d1d33', border: '1px solid #7f1d1d', color: '#fca5a5', padding: 10, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <Field label="Competition Series">
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button type="button" onClick={() => setSeriesMode('new')} style={toggleButtonStyle(seriesMode === 'new')}>
            New Series
          </button>
          <button type="button" onClick={() => setSeriesMode('existing')} style={toggleButtonStyle(seriesMode === 'existing')}>
            Existing Series
          </button>
        </div>

        {seriesMode === 'new' ? (
          <>
            <input
              placeholder="e.g. UI eSports League"
              value={seriesName}
              onChange={(e) => setSeriesName(e.target.value)}
              style={inputStyle}
            />
            <textarea
              placeholder="Series description (optional)"
              value={seriesDescription}
              onChange={(e) => setSeriesDescription(e.target.value)}
              style={{ ...inputStyle, marginTop: 8, minHeight: 60 }}
            />
          </>
        ) : (
          <select value={seriesId} onChange={(e) => setSeriesId(e.target.value)} style={inputStyle}>
            <option value="">Select a series</option>
            {existingSeries.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Competition Name">
        <input
          placeholder="e.g. UI eSports League Season 1 2025"
          value={instanceName}
          onChange={(e) => setInstanceName(e.target.value)}
          style={inputStyle}
        />
      </Field>

      <Field label="Edition Label (optional)">
        <input
          placeholder="e.g. Season 1"
          value={editionLabel}
          onChange={(e) => setEditionLabel(e.target.value)}
          style={inputStyle}
        />
      </Field>

      <Field label="Format">
        <select value={format} onChange={(e) => setFormat(e.target.value)} style={inputStyle}>
          <option value="league">League</option>
          <option value="knockout">Knockout</option>
          <option value="group+knockout">Group + Knockout</option>
          <option value="ranking">Ranking (BR-style)</option>
        </select>
      </Field>

      <Field label="Prize Pool (optional)">
        <input
          placeholder="e.g. ₦500,000"
          value={prizePool}
          onChange={(e) => setPrizePool(e.target.value)}
          style={inputStyle}
        />
      </Field>

      <Field label="Description (optional)">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 80 }} />
      </Field>

      <Field label="Games Covered">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {gameTitles.map((g) => (
            <button key={g.id} type="button" onClick={() => toggleGame(g.slug)} style={toggleButtonStyle(selectedGames.includes(g.slug))}>
              {g.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Stages">
        {stages.map((stage, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input
              placeholder="Stage name"
              value={stage.name}
              onChange={(e) => updateStage(i, 'name', e.target.value)}
              style={{ ...inputStyle, flex: 2 }}
            />
            <select value={stage.stage_type} onChange={(e) => updateStage(i, 'stage_type', e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="league">League</option>
              <option value="group">Group</option>
              <option value="knockout">Knockout</option>
              <option value="ranking">Ranking</option>
            </select>
            <input
              type="number"
              min={1}
              max={15}
              value={stage.best_of}
              onChange={(e) => updateStage(i, 'best_of', Number(e.target.value))}
              style={{ ...inputStyle, width: 60 }}
              title="Best of"
            />
            <button type="button" onClick={() => removeStage(i)} style={buttonStyle('#7f1d1d')}>×</button>
          </div>
        ))}
        <button type="button" onClick={addStage} style={buttonStyle('#333')}>+ Add Stage</button>
      </Field>

      <button
        type="button"
        disabled={loading}
        onClick={handleSubmit}
        style={{ ...buttonStyle('#16a34a'), width: '100%', padding: '12px 0', fontSize: 14, marginTop: 12 }}
      >
        {loading ? 'Creating...' : 'Create Competition'}
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

function toggleButtonStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? '#16a34a' : '#1a1a1a',
    color: '#fff',
    border: `1px solid ${active ? '#16a34a' : '#333'}`,
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 13,
    cursor: 'pointer',
  }
}

function buttonStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  }
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1a1a1a',
  color: '#fff',
  border: '1px solid #333',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 13,
}
