'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useFavorites } from '@/hooks/useFavorites';
import { Star, Moon, Sun, Menu, X, Bell } from 'lucide-react';

export function PublicNav() {
	const pathname = usePathname();
	const { favorites } = useFavorites();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const [theme, setTheme] = useState<'dark' | 'dimmed'>(() => {
		if (typeof window === 'undefined') return 'dark';

		try {
			return localStorage.getItem('esporting_theme') === 'dimmed'
				? 'dimmed'
				: 'dark';
		} catch {
			return 'dark';
		}
	});

	const toggleTheme = () => {
		const nextTheme = theme === 'dark' ? 'dimmed' : 'dark';
		setTheme(nextTheme);
		try {
			if (nextTheme === 'dimmed') {
				document.documentElement.setAttribute('data-theme', 'dimmed');
				localStorage.setItem('esporting_theme', 'dimmed');
			} else {
				document.documentElement.removeAttribute('data-theme');
				localStorage.setItem('esporting_theme', 'dark');
			}
		} catch {}
	};

	const navLinks = [
		{ href: '/', label: 'LIVE SCORES' },
		{ href: '/competitions', label: 'COMPETITIONS' },
		{ href: '/favorites', label: 'FAVORITES', badge: favorites.length },
		{ href: '/news', label: 'NEWS' },
	];

	return (
		<header className="w-full bg-bg-void border-b border-border-line text-sm select-none font-body sticky top-0 z-40">
			<div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
				{/* Logo / Brand */}
				<NextLink
					href="/"
					className="flex items-center gap-2 group focus-ring rounded"
				>
					<div className="w-8 h-8 rounded bg-accent-signal flex items-center justify-center font-display font-black text-lg text-white tracking-tighter">
						E
					</div>
					<div className="flex flex-col">
						<span className="font-display font-bold text-base tracking-wider text-text-primary group-hover:text-accent-readout transition-colors">
							ESPORTING
						</span>
						<span className="text-[9px] font-data text-text-muted leading-none">
							LIVE BROADCAST HUB
						</span>
					</div>
				</NextLink>

				{/* Desktop Navigation Links */}
				<nav
					className="hidden md:flex items-center gap-6 font-display font-medium tracking-wide"
					aria-label="Main Navigation"
				>
					{navLinks.map((link) => {
						const isActive = pathname === link.href;

						return (
							<NextLink
								key={link.href}
								href={link.href}
								aria-current={isActive ? 'page' : undefined}
								className={`flex items-center gap-1.5 text-xs transition-colors focus-ring rounded px-1 py-0.5 ${
									isActive
										? 'text-accent-readout font-bold'
										: 'text-text-muted hover:text-text-primary'
								}`}
							>
								{link.label === 'FAVORITES' && (
									<Star
										className={`w-3.5 h-3.5 ${isActive ? 'text-accent-favorite fill-accent-favorite' : ''}`}
									/>
								)}
								<span>{link.label}</span>
								{link.badge !== undefined && link.badge > 0 && (
									<span className="px-1.5 py-0.2 text-[9px] font-data rounded-full bg-accent-favorite/20 text-accent-favorite font-bold">
										{link.badge}
									</span>
								)}
							</NextLink>
						);
					})}
				</nav>

				{/* Right Action Buttons */}
				<div className="flex items-center gap-2.5">
					{/* Notification settings link */}
					<NextLink
						href="/settings/notifications"
						title="Alert Preferences"
						aria-label="Alert preferences"
						className="p-2 border border-border-line hover:border-accent-readout/40 rounded text-text-muted hover:text-text-primary transition-all focus-ring"
					>
						<Bell className="w-4 h-4" />
					</NextLink>

					{/* Theme switcher toggle */}
					<button
						type="button"
						onClick={toggleTheme}
						title={
							theme === 'dark'
								? 'Switch to Dimmed Theme'
								: 'Switch to Dark Theme'
						}
						aria-label={
							theme === 'dark'
								? 'Switch to Dimmed Theme'
								: 'Switch to Dark Theme'
						}
						className="p-2 border border-border-line hover:border-accent-readout/40 rounded text-text-muted hover:text-text-primary transition-all focus-ring"
					>
						{theme === 'dark' ? (
							<Moon className="w-4 h-4" />
						) : (
							<Sun className="w-4 h-4 text-accent-favorite" />
						)}
					</button>

					{/* Control Panel Link */}
					<NextLink
						href="/login"
						className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-border-line hover:border-accent-readout/40 rounded text-xs font-display font-semibold text-text-muted hover:text-text-primary transition-all focus-ring"
					>
						<span className="w-1.5 h-1.5 rounded-full bg-text-muted"></span>
						<span>CONTROL PANEL</span>
					</NextLink>

					{/* Mobile Menu Toggle Button */}
					<button
						type="button"
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						aria-expanded={mobileMenuOpen}
						aria-label="Toggle navigation menu"
						className="md:hidden p-2 border border-border-line text-text-muted hover:text-text-primary rounded focus-ring"
					>
						{mobileMenuOpen ? (
							<X className="w-5 h-5" />
						) : (
							<Menu className="w-5 h-5" />
						)}
					</button>
				</div>
			</div>

			{/* Mobile Drawer Menu */}
			{mobileMenuOpen && (
				<div className="md:hidden border-t border-border-line bg-bg-surface px-4 py-4 space-y-3 font-display text-xs">
					{navLinks.map((link) => {
						const isActive = pathname === link.href;

						return (
							<NextLink
								key={link.href}
								href={link.href}
								onClick={() => setMobileMenuOpen(false)}
								className={`flex items-center justify-between py-2 border-b border-border-line/40 ${
									isActive
										? 'text-accent-readout font-bold'
										: 'text-text-muted'
								}`}
							>
								<div className="flex items-center gap-2">
									{link.label === 'FAVORITES' && (
										<Star className="w-4 h-4 text-accent-favorite" />
									)}
									<span>{link.label}</span>
								</div>
								{link.badge !== undefined && link.badge > 0 && (
									<span className="px-2 py-0.5 text-[10px] font-data rounded-full bg-accent-favorite/20 text-accent-favorite font-bold">
										{link.badge}
									</span>
								)}
							</NextLink>
						);
					})}

					<NextLink
						href="/login"
						onClick={() => setMobileMenuOpen(false)}
						className="block text-center py-2.5 bg-bg-void border border-border-line rounded font-bold text-text-primary mt-2"
					>
						CONTROL PANEL
					</NextLink>
				</div>
			)}
		</header>
	);
}
