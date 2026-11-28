import { BadgeCheck, Users, Hourglass } from 'lucide-react';

export type OrganiserTier = 'trial' | 'community' | 'business';

export const TIER_INFO: Record<
	OrganiserTier,
	{ label: string; short: string; blurb: string; cls: string }
> = {
	business: {
		label: 'Verified Business',
		short: 'Verified',
		blurb: 'CAC-registered company, checked by Esporting. No limits.',
		cls: 'border-accent-cyan/40 text-accent-cyan bg-accent-cyan/10',
	},
	community: {
		label: 'Community Organiser',
		short: 'Community Organiser',
		blurb: 'A club, school or community group Esporting has checked. No limits.',
		cls: 'border-accent-primary/40 text-accent-glow bg-accent-primary/10',
	},
	trial: {
		label: 'Trial Organiser',
		short: 'Unverified organiser',
		blurb: 'New organiser. One live tournament at a time, up to 8 teams each.',
		cls: 'border-text-primary/15 text-text-muted bg-text-primary/[0.04]',
	},
};

export function TierBadge({
	tier,
	className = '',
}: {
	tier: OrganiserTier | string | null | undefined;
	className?: string;
}) {
	if (!tier || !(tier in TIER_INFO)) return null;
	const t = tier as OrganiserTier;
	const Icon = t === 'business' ? BadgeCheck : t === 'community' ? Users : Hourglass;
	return (
		<span
			className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 border rounded-full text-[11px] font-display font-semibold tracking-wide ${TIER_INFO[t].cls} ${className}`}
		>
			<Icon className="w-3 h-3" />
			{TIER_INFO[t].short}
		</span>
	);
}
