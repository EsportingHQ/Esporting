/**
 * Map PandaScore or internal game type slug to display type.
 * Used to determine correct icon and styling for matches.
 */
export function mapGameType(
	gameTypeSlug: string | undefined,
): 'football' | 'shooter' | 'br' {
	if (!gameTypeSlug) return 'shooter'; // default fallback
	if (gameTypeSlug === 'football') return 'football';
	if (gameTypeSlug.includes('br') || gameTypeSlug.includes('battle')) return 'br';
	return 'shooter';
}
