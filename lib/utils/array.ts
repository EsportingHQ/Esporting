/**
 * Extract first element from array or return value if not an array.
 * Used throughout the codebase to normalize Supabase nested query results
 * which can return either a single object or array depending on cardinality.
 *
 * @example
 * // Supabase returns: { team: { id: '1', name: 'Team A' } } or { team: [{ id: '1', name: 'Team A' }] }
 * const team = one(data.team); // Always returns { id: '1', name: 'Team A' } or null
 */
export function one<T>(value: T | T[] | null | undefined): T | null {
	if (Array.isArray(value)) return value[0] ?? null;
	return value ?? null;
}
