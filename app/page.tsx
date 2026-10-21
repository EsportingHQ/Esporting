import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/LandingPage';

export const metadata: Metadata = {
  title: 'esportinghq — Live Scores. Every Game. (Coming Soon)',
  description:
    "Esportinghq is the fastest way to follow competitive esports — every match, every score, tracked the moment it happens. We're getting ready to go live.",
};

export default function Page() {
  return <LandingPage />;
}
