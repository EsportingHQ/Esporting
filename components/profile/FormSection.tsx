'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FormEntry, FormResult } from '@/lib/profile-form';

const CHIP: Record<FormResult, string> = {
  W: 'bg-green-500 text-white',
  D: 'bg-amber-400 text-black',
  L: 'bg-red-500 text-white',
};

function Chip({ result }: { result: FormResult }) {
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${CHIP[result]}`}
      aria-label={result === 'W' ? 'Win' : result === 'D' ? 'Draw' : 'Loss'}
    >
      {result}
    </span>
  );
}

// `entries` must be newest first. The strip shows the last 5, oldest to newest (latest on the right),
// and "See all" opens the full history with opponents.
export default function FormSection({ entries }: { entries: FormEntry[] }) {
  const [open, setOpen] = useState(false);
  const last5 = entries.slice(0, 5).reverse();

  return (
    <div className="space-y-3 rounded border border-border-line bg-bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider">Form</h3>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent-primary"
            aria-expanded={open}
          >
            {open ? 'Hide' : `See all (${entries.length})`}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-text-muted">No finished matches yet. Form appears once a match is completed.</p>
      ) : (
        <div className="flex items-center gap-2">
          {last5.map((e) => (
            <Chip key={e.matchId} result={e.result} />
          ))}
          <span className="ml-2 text-[11px] text-text-muted">Last {last5.length}, latest on the right</span>
        </div>
      )}

      {open && (
        <ul className="divide-y divide-border-line border-t border-border-line">
          {entries.map((e) => (
            <li key={e.matchId}>
              <Link
                href={e.competitionSlug ? `/competitions/${e.competitionSlug}/matches/${e.matchId}` : '#'}
                className="flex items-center gap-3 py-3 text-xs hover:bg-bg-void/40"
              >
                <Chip result={e.result} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text-primary">
                    {e.teamName} <span className="font-data">{e.scoreFor} - {e.scoreAgainst}</span> {e.opponentName}
                  </p>
                  {e.isSeries && e.goalsFor !== undefined ? (
                    <p className="text-[11px] text-text-muted">
                      Goals: {e.goalsFor} - {e.goalsAgainst}
                    </p>
                  ) : null}
                  <p className="truncate text-[11px] text-text-muted">
                    {[e.gameName, e.competitionName].filter(Boolean).join(' · ')}
                    {e.playedAt ? ` · ${new Date(e.playedAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
                {e.isMvp ? (
                  <span className="shrink-0 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                    ★ MVP
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
