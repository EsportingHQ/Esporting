'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const inputClass =
  'w-full bg-bg-void border border-border-line rounded px-4 py-2.5 text-text-primary placeholder-text-muted/40 focus:outline-none focus:border-accent-readout text-sm font-body transition-colors';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    // Same message whether or not the email has an account, so nobody can probe for accounts.
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-void">
      <div className="w-full max-w-md px-4">
        <h1 className="text-xl font-display font-black text-text-primary mb-1 uppercase tracking-wider">Forgot password</h1>
        <p className="text-xs text-text-muted mb-6">Enter your email and we will send you a link to choose a new password.</p>

        {sent ? (
          <div className="bg-bg-surface border border-border-line rounded p-6 text-sm text-text-primary space-y-3">
            <p>If an account exists for {email.trim()}, a reset link is on its way. Check your inbox and spam folder.</p>
            <Link href="/login" className="text-accent-readout text-xs">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-bg-surface border border-border-line rounded p-8 space-y-5">
            {error && (
              <div className="bg-state-alert/10 border border-state-alert/30 text-state-alert rounded px-4 py-3 text-xs">{error}</div>
            )}
            <div>
              <label htmlFor="email" className="block text-xs font-display font-bold text-text-muted mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-readout hover:bg-accent-readout/80 disabled:opacity-60 text-bg-void font-display font-black rounded px-4 py-2.5 text-sm uppercase tracking-widest transition-colors"
            >
              {loading ? 'SENDING...' : 'SEND RESET LINK'}
            </button>
            <p className="text-center text-xs">
              <Link href="/login" className="text-accent-readout">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
