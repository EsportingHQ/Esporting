'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PasswordInput from '@/components/ui/PasswordInput';

const inputClass =
  'w-full bg-bg-void border border-border-line rounded px-4 py-2.5 text-text-primary placeholder-text-muted/40 focus:outline-none focus:border-accent-readout text-sm font-body transition-colors';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    async function prepare() {
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.substring(1));
      const problem = search.get('error_description') ?? hash.get('error_description');
      if (problem) {
        setLinkError(`${problem.replace(/\+/g, ' ')}.`);
        return;
      }
      // The Supabase client exchanges ?code= by itself when it starts. Calling the exchange again
      // would fail with "already used", so wait for that result first and only fall back if needed.
      const code = search.get('code');
      if (code) {
        const first = await supabase.auth.getSession();
        if (first.data.session) {
          setReady(true);
          return;
        }
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          const again = await supabase.auth.getSession();
          if (again.data.session) {
            setReady(true);
            return;
          }
          setLinkError(
            'This reset link could not be used. Open it in the same browser where you asked for it, or request a new one.',
          );
          return;
        }
        setReady(true);
        return;
      }
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (sessionError) {
          setLinkError('This reset link has expired or was already used. Request a new one.');
          return;
        }
        setReady(true);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) setReady(true);
      else setLinkError('This reset link is not valid. Request a new one.');
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setLinkError(null);
        setReady(true);
      }
    });
    prepare();
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push('/dashboard-redirect');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-void">
      <div className="w-full max-w-md px-4">
        <h1 className="text-xl font-display font-black text-text-primary mb-1 uppercase tracking-wider">Choose a new password</h1>
        {linkError ? (
          <div className="bg-bg-surface border border-border-line rounded p-6 mt-6 text-sm space-y-3">
            <p className="text-state-alert">{linkError}</p>
            <Link href="/forgot-password" className="text-accent-readout text-xs">Request a new link</Link>
          </div>
        ) : !ready ? (
          <p className="text-xs text-text-muted mt-6">Checking your link...</p>
        ) : (
          <form onSubmit={submit} className="bg-bg-surface border border-border-line rounded p-8 mt-6 space-y-5">
            {error && (
              <div className="bg-state-alert/10 border border-state-alert/30 text-state-alert rounded px-4 py-3 text-xs">{error}</div>
            )}
            <div>
              <label htmlFor="password" className="block text-xs font-display font-bold text-text-muted mb-1.5 uppercase tracking-wider">New password</label>
              <PasswordInput id="password" autoComplete="new-password" minLength={8} value={password} onChange={setPassword} placeholder="At least 8 characters" className={inputClass} />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-xs font-display font-bold text-text-muted mb-1.5 uppercase tracking-wider">Confirm password</label>
              <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={setConfirm} className={inputClass} />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-accent-readout hover:bg-accent-readout/80 disabled:opacity-60 text-bg-void font-display font-black rounded px-4 py-2.5 text-sm uppercase tracking-widest transition-colors">
              {loading ? 'SAVING...' : 'SAVE PASSWORD'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
