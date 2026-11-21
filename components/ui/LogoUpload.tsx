'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/** Uploads a PNG / JPG / WebP (max 2 MB) to the public "logos" bucket and returns its URL. */
export default function LogoUpload({
  value,
  onUploaded,
  label = 'Logo',
}: {
  value: string | null;
  onUploaded: (url: string) => void | Promise<void>;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    const ext = TYPES[file.type];
    if (!ext) return setError('Use a PNG, JPG or WebP image');
    if (file.size > MAX_BYTES) return setError('Image must be under 2 MB');

    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in again');
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('logos')
        .upload(path, file, { contentType: file.type, cacheControl: '31536000' });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('logos').getPublicUrl(path);
      await onUploaded(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-14 h-14 rounded border border-border-line bg-bg-void flex items-center justify-center overflow-hidden shrink-0">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="w-full h-full object-contain" />
        ) : (
          <span className="text-[10px] text-text-muted uppercase">No logo</span>
        )}
      </div>
      <div className="space-y-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="px-3 py-1.5 rounded bg-bg-void border border-border-line text-xs font-display font-bold uppercase tracking-wider text-text-primary disabled:opacity-50"
        >
          {busy ? 'Uploading...' : value ? `Change ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
        </button>
        <p className="text-[10px] text-text-muted">PNG, JPG or WebP, up to 2 MB</p>
        {error && <p className="text-[11px] text-state-loss">{error}</p>}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} className="hidden" />
    </div>
  );
}
