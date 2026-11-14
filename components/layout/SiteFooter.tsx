'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

// Pages that keep their own chrome: the landing page has its own footer,
// and the sign-in and dashboard screens are not public pages.
const HIDDEN_ON: string[] = ['/login', '/callback', '/dashboard-redirect', '/admin', '/organiser', '/contributor'];

const SOCIALS = [
  { label: 'Twitter / X', href: 'https://x.com/esportinghq' },
  { label: 'Instagram', href: 'https://instagram.com/esportinghq' },
  { label: 'TikTok', href: 'https://tiktok.com/@esportinghq' },
  { label: 'Discord', href: 'https://discord.gg/esportinghq' },
];

const LEGAL = [
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
];

export function SiteFooter() {
  const pathname = usePathname() ?? '';

  if (pathname === '/' || HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  const linkClass =
    'text-text-muted hover:text-accent-primary transition-colors focus-ring rounded px-1 py-0.5';

  return (
    <footer className="relative z-10 mt-auto w-full border-t border-text-primary/[0.08] glass">
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <Link href="/" className="inline-flex w-fit focus-ring rounded" aria-label="EsportingHQ home">
            <Image
              src="/esportinghq-logo-primary.png"
              alt="EsportingHQ"
              width={150}
              height={35}
              className="logo-light h-7 w-auto object-contain"
            />
            <Image
              src="/esportinghq-logo-white.png"
              alt="EsportingHQ"
              width={150}
              height={35}
              className="logo-dark h-7 w-auto object-contain"
            />
          </Link>
          <p className="text-[11px] font-data tracking-widest text-text-muted uppercase">
            Live Scores. Every Game.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-col gap-3 text-sm font-body md:items-end">
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {SOCIALS.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {LEGAL.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
