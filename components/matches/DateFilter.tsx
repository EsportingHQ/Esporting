'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export function DateFilter() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const pathname = usePathname();

	const value = searchParams.get('date') ?? '';

	return (
		<input
			type="date"
			value={value}
			onChange={(e) => {
				const params = new URLSearchParams(searchParams);

				if (e.target.value) params.set('date', e.target.value);
				else params.delete('date');

				const query = params.toString();
				router.push(query ? `${pathname}?${query}` : pathname);
			}}
			className="rounded border border-border-line bg-bg-surface px-3 py-2 text-sm text-text-primary"
		/>
	);
}
