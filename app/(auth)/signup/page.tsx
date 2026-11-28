import Link from 'next/link';
import Image from 'next/image';
import { signup } from '@/lib/actions/auth';
import PasswordInput from '@/components/ui/PasswordInput';
import GoogleSignInButton from '@/components/ui/GoogleSignInButton';
import TurnstileWidget from '@/components/ui/TurnstileWidget';

const field =
  'w-full bg-bg-void border border-border-line rounded px-4 py-2.5 text-text-primary placeholder-text-muted/40 focus:outline-none focus:border-accent-readout text-sm font-body transition-colors';
const label =
  'block text-xs font-display font-bold text-text-muted mb-1.5 uppercase tracking-wider';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; to?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-void">
      <div className="w-full max-w-md px-4">
        <div className="flex flex-col items-center justify-center mb-8">
          <Image
            src="/esportinghq-logo-primary.png"
            alt="EsportingHQ Logo"
            width={240}
            height={56}
            priority
            className="logo-light h-12 w-auto object-contain mb-3"
          />
          <Image
            src="/esportinghq-logo-white.png"
            alt="EsportingHQ Logo"
            width={240}
            height={56}
            priority
            className="logo-dark h-12 w-auto object-contain mb-3"
          />
          <p className="text-xs font-data text-text-muted tracking-wider uppercase">
            Create your account
          </p>
        </div>

        {params.error && (
          <div className="bg-state-alert/10 border border-state-alert/30 text-state-alert rounded px-4 py-3 mb-6 text-xs font-body">
            {params.error}
          </div>
        )}

        {params.sent ? (
          <div className="bg-bg-surface border border-border-line rounded p-8 space-y-3 text-center">
            <p className="font-display font-bold text-base text-text-primary uppercase tracking-wide">
              Check your email
            </p>
            <p className="text-xs text-text-muted leading-relaxed">
              We sent you a confirmation link. Open it, then sign in.
              {params.to
                ? ' After signing in, go to Apply as organiser to send your application.'
                : ''}
            </p>
            <Link href="/login" className="inline-block text-xs text-accent-readout">
              Go to sign in
            </Link>
          </div>
        ) : (
          <form className="bg-bg-surface border border-border-line rounded p-8 space-y-5">
            <div>
              <label htmlFor="display_name" className={label}>Your name</label>
              <input id="display_name" name="display_name" required autoComplete="name" className={field} />
            </div>
            <div>
              <label htmlFor="email" className={label}>Email address</label>
              <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={field} />
            </div>
            <div>
              <label htmlFor="password" className={label}>Password</label>
              <PasswordInput id="password" name="password" minLength={8} autoComplete="new-password" placeholder="At least 8 characters" className={field} />
            </div>
            <div>
              <label htmlFor="confirm_password" className={label}>Confirm password</label>
              <PasswordInput id="confirm_password" name="confirm_password" minLength={8} autoComplete="new-password" placeholder="Type it again" className={field} />
            </div>

            <label className="flex items-start gap-3 text-xs text-text-muted font-body leading-relaxed cursor-pointer">
              <input type="checkbox" name="is_organiser" className="mt-0.5" />
              <span>
                I run tournaments and want to apply as a Tournament Organiser.
                Organisers are checked and approved by Esporting before they can
                create competitions.
              </span>
            </label>

            <TurnstileWidget />

            <button
              formAction={signup}
              type="submit"
              className="w-full bg-accent-readout hover:bg-accent-readout/80 text-bg-void font-display font-black rounded px-4 py-2.5 text-sm uppercase tracking-widest transition-colors focus:outline-none"
            >
              Create account
            </button>
          </form>
        )}

        {!params.sent && (
          <>
            <div className="flex items-center gap-3 my-5">
              <span className="flex-1 h-px bg-border-line" />
              <span className="text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">or</span>
              <span className="flex-1 h-px bg-border-line" />
            </div>
            <GoogleSignInButton label="Sign up with Google" />
          </>
        )}

        <p className="text-center text-text-muted/60 text-xs mt-6 font-body">
          Already have an account?{' '}
          <Link href="/login" className="text-accent-readout">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
