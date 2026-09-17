'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, X, Zap } from 'lucide-react';
import { logout } from '@/lib/actions/auth';

type NavItem = {
	label: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
};

interface DashboardShellProps {
	children: ReactNode;
	nav: NavItem[];
	userEmail: string;
	title: string;
}

export function DashboardShell({ children, nav, userEmail, title }: DashboardShellProps) {
	const pathname = usePathname();
	const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

	// Lock body scroll when mobile sidebar is open
	useEffect(() => {
		if (mobileSidebarOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = 'unset';
		}
		return () => {
			document.body.style.overflow = 'unset';
		};
	}, [mobileSidebarOpen]);

	return (
		<div className="min-h-screen bg-bg-void text-text-primary flex flex-col font-body antialiased relative overflow-x-hidden">
			{/* Ambient background mesh */}
			<div className="gradient-mesh pointer-events-none" aria-hidden="true">
				<div className="mesh-orb" />
			</div>

			{/* Top Header */}
			<header className="glass-strong border-b border-white/[0.08] px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 sticky top-0 z-30 backdrop-blur-xl">
				<div className="flex items-center gap-3 sm:gap-6">
					{/* Mobile Sidebar Toggle */}
					<button
						type="button"
						onClick={() => setMobileSidebarOpen(true)}
						className="md:hidden p-2 text-text-muted hover:text-white rounded-xl focus-ring"
					>
						<Menu className="w-5 h-5" />
					</button>

					<Link
						href="/"
						className="flex items-center gap-2.5 group focus-ring rounded-xl py-1 px-1"
					>
						<div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-primary to-pink-600 flex items-center justify-center font-display font-black text-white shadow-[0_0_15px_rgba(217,70,239,0.35)]">
							<Zap className="w-4 h-4 text-white fill-white/20" />
						</div>
						<span className="font-display font-black text-lg tracking-wider text-white group-hover:text-accent-glow transition-colors">
							ESPORTING<span className="text-accent-primary">HQ</span>
						</span>
					</Link>
					<span className="hidden sm:inline-block bg-accent-primary/15 border border-accent-primary/30 px-3 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider text-accent-glow">
						{title} Control
					</span>
				</div>

				<div className="flex items-center gap-4 text-xs font-body text-text-muted">
					<span className="max-w-[140px] sm:max-w-none truncate font-data text-xs">{userEmail}</span>
					<form>
						<button
							formAction={logout}
							type="submit"
							className="text-text-muted hover:text-state-loss flex items-center gap-1.5 transition-colors cursor-pointer font-display font-semibold uppercase tracking-wider text-xs p-2 rounded-xl hover:bg-white/[0.04]"
						>
							<LogOut className="w-4 h-4" />
							<span className="hidden sm:inline-block">Sign Out</span>
						</button>
					</form>
				</div>
			</header>

			<div className="flex flex-1 overflow-hidden relative z-10">
				{/* Mobile Sidebar Backdrop */}
				{mobileSidebarOpen && (
					<div
						className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md md:hidden"
						onClick={() => setMobileSidebarOpen(false)}
						aria-hidden="true"
					/>
				)}

				{/* Sidebar */}
				<aside
					className={`fixed inset-y-0 left-0 z-50 w-64 glass-strong border-r border-white/[0.08] px-4 py-6 shrink-0 transform transition-transform duration-300 md:relative md:translate-x-0 backdrop-blur-xl ${
						mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
					}`}
				>
					<div className="flex items-center justify-between mb-8 md:hidden">
						<span className="font-display font-bold text-sm tracking-wider text-white uppercase">
							{title} Navigation
						</span>
						<button
							onClick={() => setMobileSidebarOpen(false)}
							className="p-2 text-text-muted hover:text-white rounded-xl"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					<nav className="space-y-1.5">
						{nav.map((item) => {
							const Icon = item.icon;
							const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
							return (
								<Link
									key={item.href}
									href={item.href}
									onClick={() => setMobileSidebarOpen(false)}
									className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-display font-semibold tracking-wide transition-all ${
										isActive
											? 'bg-accent-primary/20 text-white font-bold border border-accent-primary/40 shadow-[0_0_15px_rgba(217,70,239,0.15)]'
											: 'text-text-muted hover:bg-white/[0.04] hover:text-white'
									}`}
								>
									<Icon className={`w-4 h-4 ${isActive ? 'text-accent-glow' : 'text-text-muted'}`} />
									<span>{item.label}</span>
								</Link>
							);
						})}
					</nav>
				</aside>

				{/* Page content */}
				<main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
					{children}
				</main>
			</div>
		</div>
	);
}
