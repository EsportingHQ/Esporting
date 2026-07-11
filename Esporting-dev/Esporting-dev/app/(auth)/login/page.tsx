import { login } from '@/lib/actions/auth';

export default function LoginPage({
	searchParams,
}: {
	searchParams: { error?: string };
}) {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-950">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-white">Esporting</h1>
					<p className="text-gray-400 mt-2">Dashboard Login</p>
				</div>

				{searchParams.error && (
					<div
						className="bg-red-500/10 border border-red-500/20 text-red-400
                          rounded-lg px-4 py-3 mb-6 text-sm"
					>
						{searchParams.error === 'invite_failed'
							? 'Invite link expired or invalid. Contact your admin.'
							: searchParams.error}
					</div>
				)}

				<form className="bg-gray-900 rounded-xl border border-gray-800 p-8 space-y-5">
					<div>
						<label
							htmlFor="email"
							className="block text-sm font-medium text-gray-300 mb-1.5"
						>
							Email
						</label>
						<input
							id="email"
							name="email"
							type="email"
							required
							autoComplete="email"
							placeholder="you@example.com"
							className="w-full bg-gray-800 border border-gray-700 rounded-lg
                         px-4 py-2.5 text-white placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-green-500
                         focus:border-transparent text-sm"
						/>
					</div>

					<div>
						<label
							htmlFor="password"
							className="block text-sm font-medium text-gray-300 mb-1.5"
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
							className="w-full bg-gray-800 border border-gray-700 rounded-lg
                         px-4 py-2.5 text-white placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-green-500
                         focus:border-transparent text-sm"
						/>
					</div>

					<button
						formAction={login}
						type="submit"
						className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold
                       rounded-lg px-4 py-2.5 text-sm transition-colors
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                       focus:ring-offset-gray-900"
					>
						Sign in
					</button>
				</form>

				<p className="text-center text-gray-600 text-xs mt-6">
					Access is by invitation only. Contact your administrator for
					access.
				</p>
			</div>
		</div>
	);
}
