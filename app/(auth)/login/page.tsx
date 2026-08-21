import { login } from "@/lib/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-void">
      <div className="w-full max-w-md px-4">
        {/* Logo / Branding */}
        <div className="text-center mb-10">
          <h1 className="font-display font-black text-4xl tracking-widest uppercase text-text-primary">
            ESPORTING
          </h1>
          <p className="text-xs font-data text-text-muted mt-1 tracking-wider uppercase">
            BROADCAST CONTROL ACCESS
          </p>
        </div>

        {/* Error Banner */}
        {params.error && (
          <div className="bg-state-alert/10 border border-state-alert/30 text-state-alert rounded px-4 py-3 mb-6 text-xs font-body">
            {params.error === "invite_failed"
              ? "Invite link expired or invalid. Contact your administrator."
              : decodeURIComponent(params.error)}
          </div>
        )}

        {/* Form */}
        <form className="bg-bg-surface border border-border-line rounded p-8 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-display font-bold text-text-muted mb-1.5 uppercase tracking-wider"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full bg-bg-void border border-border-line rounded px-4 py-2.5 text-text-primary placeholder-text-muted/40 focus:outline-none focus:border-accent-readout text-sm font-body transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-display font-bold text-text-muted mb-1.5 uppercase tracking-wider"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full bg-bg-void border border-border-line rounded px-4 py-2.5 text-text-primary placeholder-text-muted/40 focus:outline-none focus:border-accent-readout text-sm font-body transition-colors"
            />
          </div>

          <button
            formAction={login}
            type="submit"
            className="w-full bg-accent-readout hover:bg-accent-readout/80 text-bg-void font-display font-black rounded px-4 py-2.5 text-sm uppercase tracking-widest transition-colors focus:outline-none"
          >
            SIGN IN
          </button>
        </form>

        <p className="text-center text-text-muted/50 text-xs mt-6 font-body">
          Access is by invitation only. Contact your administrator for access.
        </p>
      </div>
    </div>
  );
}
