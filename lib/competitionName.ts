export function combineCompetitionName(
    seriesName: string | null | undefined,
    instanceName: string,
): string {
    const series = (seriesName ?? '').trim();
    if (!series) return instanceName;
    if (instanceName.toLowerCase().includes(series.toLowerCase())) return instanceName;
    return `${series} — ${instanceName}`;
}