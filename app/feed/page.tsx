import type { Metadata } from 'next';
import HomeClient from '../HomeClient';

export const metadata: Metadata = {
  title: 'Live Matches & Tournament Feed',
  description:
    'Watch live match feeds, real-time score updates, and upcoming esports fixtures.',
  alternates: {
    canonical: '/feed',
  },
  openGraph: {
    title: 'Live Matches & Tournament Feed | Esporting',
    description:
      'Watch live match feeds, real-time score updates, and upcoming esports fixtures.',
    url: 'https://esportinghq.com/feed',
  },
};

export default function FeedPage() {
  return <HomeClient />;
}
