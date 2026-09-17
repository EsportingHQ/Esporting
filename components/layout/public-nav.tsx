'use client';

import { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useFavorites } from '@/hooks/useFavorites';
import Image from 'next/image';
import { Star, Moon, Sun, Menu, X, Bell } from 'lucide-react';

export function PublicNav() {
  const pathname = usePathname();
  const { favorites } = useFavorites();
  const [theme, setTheme] = useState<'dark' | 'dimmed'>('dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('esporting_theme');
      if (saved === 'dimmed') {
        setTheme('dimmed');
      }
    } catch (e) {}
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

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
    } catch (e) {}
  };

  const navLinks = [
    { href: '/feed', label: 'LIVE SCORES' },
    { href: '/competitions', label: 'COMPETITIONS' },
    { href: '/favorites', label: 'FAVORITES', badge: favorites.length },
    { href: '/news', label: 'NEWS' },
  ];

  return (
    <>
      <header className="w-full glass-strong border-b border-white/[0.08] text-sm select-none font-body sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo / Brand */}
          <NextLink href="/" className="flex items-center group focus-ring rounded-xl py-1 px-1">
            <Image
              src="/esportinghq-logo-white.png"
              alt="EsportingHQ Logo"
              width={180}
              height={42}
              priority
              className="h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </NextLink>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 font-display font-semibold tracking-wide bg-white/[0.03] p-1.5 rounded-full border border-white/[0.06] backdrop-blur-md" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;

              return (
                <NextLink
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2 text-xs transition-all duration-200 rounded-full px-4 py-2 min-h-[36px] ${
                    isActive
                      ? 'bg-accent-primary/20 text-white font-bold border border-accent-primary/40 shadow-[0_0_15px_rgba(217,70,239,0.2)]'
                      : 'text-text-muted hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {link.label === 'FAVORITES' && (
                    <Star className={`w-3.5 h-3.5 ${isActive ? 'text-accent-favorite fill-accent-favorite' : 'text-text-muted'}`} />
                  )}
                  <span>{link.label}</span>
                  {link.badge !== undefined && link.badge > 0 && (
                    <span className="px-1.5 py-0.5 text-[9px] font-data rounded-full bg-accent-favorite/25 text-accent-favorite font-bold border border-accent-favorite/30">
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
              className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-accent-primary/40 text-text-muted hover:text-white transition-all duration-200 focus-ring min-h-[42px] min-w-[42px] flex items-center justify-center shadow-sm"
            >
              <Bell className="w-4 h-4" />
            </NextLink>

            {/* Theme switcher toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Dimmed Theme' : 'Switch to Dark Theme'}
              aria-label={theme === 'dark' ? 'Switch to Dimmed Theme' : 'Switch to Dark Theme'}
              className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-accent-primary/40 text-text-muted hover:text-white transition-all duration-200 focus-ring min-h-[42px] min-w-[42px] flex items-center justify-center shadow-sm"
            >
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-accent-favorite" />}
            </button>

            {/* Launch App / Dashboard Link */}
            <NextLink
              href="/login"
              className="hidden sm:inline-flex items-center justify-center btn-primary px-5 py-2.5 text-xs font-display font-bold tracking-wider rounded-xl min-h-[42px]"
            >
              LAUNCH APP
            </NextLink>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2.5 border border-white/[0.08] bg-white/[0.03] text-text-muted hover:text-white rounded-xl focus-ring min-h-[42px] min-w-[42px] flex items-center justify-center relative z-50 transition-all"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Menu Content */}
      <div
        className={`fixed top-16 left-0 right-0 z-40 md:hidden glass-strong border-b border-white/[0.1] shadow-2xl transition-all duration-300 ease-in-out transform origin-top ${
          mobileMenuOpen ? 'scale-y-100 opacity-100 visible' : 'scale-y-0 opacity-0 invisible'
        }`}
      >
        <div className="px-5 py-6 space-y-3 font-display text-sm">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;

            return (
              <NextLink
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-accent-primary/20 text-white font-bold border-accent-primary/40 shadow-[0_0_15px_rgba(217,70,239,0.15)]'
                    : 'text-text-muted hover:text-white bg-white/[0.02] border-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {link.label === 'FAVORITES' && <Star className="w-4 h-4 text-accent-favorite fill-accent-favorite" />}
                  <span>{link.label}</span>
                </div>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-data rounded-full bg-accent-favorite/25 text-accent-favorite font-bold border border-accent-favorite/30">
                    {link.badge}
                  </span>
                )}
              </NextLink>
            );
          })}

          <NextLink
            href="/login"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-center py-3.5 mt-4 btn-primary rounded-xl font-bold text-white text-xs tracking-wider uppercase min-h-[44px]"
          >
            LAUNCH APP
          </NextLink>
        </div>
      </div>
    </>
  );
}
