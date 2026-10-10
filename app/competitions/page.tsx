import { Metadata } from 'next';
import CompetitionsClient from './CompetitionsClient';

export const metadata: Metadata = {
  title: 'Competitions & Tournaments',
  description:
    'Browse active and upcoming esports competitions, tournament brackets, and live standings across FIFA, Call of Duty, and top competitive games.',
  alternates: {
    canonical: '/competitions',
  },
  openGraph: {
    title: 'Competitions & Tournaments | Esporting',
    description:
      'Browse active and upcoming esports competitions, tournament brackets, and live standings.',
    url: 'https://esportinghq.com/competitions',
  },
};

export default function CompetitionsPage() {
  return <CompetitionsClient />;
}
