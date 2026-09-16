'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';
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
		<div className="min-h-screen bg-bg-void text-text-primary flex flex-col font-body antialiased">
			{/* Top header */}
			<header className="bg-bg-void border-b border-border-line px-4 sm:px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-30">
				<div className="flex items-center gap-3 sm:gap-6">
					{/* Mobile Sidebar Toggle */}
					<button
						type="button"
						onClick={() => setMobileSidebarOpen(true)}
						className="md:hidden p-1.5 -ml-1.5 text-text-muted hover:text-text-primary rounded focus-ring"
					>
						<Menu className="w-5 h-5" />
					</button>

					<Link
						href="/"
						className="font-display font-black text-lg sm:text-xl tracking-widest text-text-primary uppercase hover:text-accent-readout transition-colors flex items-center gap-2"
					>
						<span>ESPORTING</span>
					</Link>
					<span className="hidden sm:inline-block bg-accent-readout/10 border border-accent-readout/30 px-2.5 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider text-accent-readout">
						{title} DECK
					</span>
				</div>
				<div className="flex items-center gap-4 text-xs font-data text-text-muted">
					<span className="max-w-[120px] sm:max-w-none truncate">{userEmail}</span>
					<form>
						<button
							formAction={logout}
							type="submit"
							className="text-text-muted hover:text-state-loss flex items-center gap-1.5 transition-colors cursor-pointer font-display font-bold uppercase tracking-wider text-[11px] p-2 -mr-2 min-h-[44px]"
						>
							<LogOut className="w-3.5 h-3.5" />
							<span className="hidden sm:inline-block">Sign out</span>
						</button>
					</form>
				</div>
			</header>

			<div className="flex flex-1 overflow-hidden relative">
				{/* Mobile Sidebar Backdrop */}
				{mobileSidebarOpen && (
					<div
						className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
						onClick={() => setMobileSidebarOpen(false)}
						aria-hidden="true"
					/>
				)}

				{/* Sidebar */}
				<aside
					className={`fixed inset-y-0 left-0 z-50 w-60 bg-bg-surface border-r border-border-line px-4 py-6 shrink-0 transform transition-transform duration-300 md:relative md:translate-x-0 ${
						mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
					}`}
				>
					<div className="flex items-center justify-between mb-8 md:hidden">
						<span className="font-display font-bold text-sm tracking-wider text-text-muted uppercase">
							{title} DECK
						</span>
						<button
							onClick={() => setMobileSidebarOpen(false)}
							className="p-2 -mr-2 text-text-muted hover:text-text-primary rounded"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					<nav className="space-y-1">
						{nav.map((item) => {
							const Icon = item.icon;
							const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
							return (
								<Link
									key={item.href}
									href={item.href}
									onClick={() => setMobileSidebarOpen(false)}
									className={`flex items-center gap-3 px-3 py-3 md:py-2.5 rounded text-xs font-display font-bold uppercase tracking-wider transition-all min-h-[44px] md:min-h-0 ${
										isActive
											? 'bg-accent-readout/10 text-accent-readout border border-accent-readout/20'
											: 'text-text-muted hover:bg-bg-void hover:text-text-primary border border-transparent hover:border-border-line'
									}`}
								>
									<Icon className="w-4 h-4 text-accent-readout" />
									<span>{item.label}</span>
								</Link>
							);
						})}
					</nav>
				</aside>

				{/* Page content */}
				<main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 bg-bg-void">
					{children}
				</main>
			</div>
		</div>
	);
}
