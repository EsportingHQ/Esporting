// Parsing helpers for the bulk team import.

export type ParsedTeam = { name: string; players: string[] };

/**
 * Reads a pasted list or spreadsheet export. Accepted line shapes:
 *   1. Fnatic: Kori, Ezra, Jett
 *   Fnatic<TAB>Kori<TAB>Ezra<TAB>Jett          (pasted from Excel / Sheets)
 *   Fnatic,Kori,Ezra,Jett                      (CSV)
 * Leading numbers like "1." or "2)" are ignored.
 */
export function parseTeamList(text: string): ParsedTeam[] {
  const teams: ParsedTeam[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s*\d+\s*[.)]\s*/, '').trim();
    if (!line) continue;

    let parts: string[];
    const colon = line.indexOf(':');
    if (colon > 0) {
      parts = [line.slice(0, colon), ...line.slice(colon + 1).split(/[,;\t]/)];
    } else if (line.includes('\t')) {
      parts = line.split('\t');
    } else {
      parts = line.split(/[,;]/);
    }
    const cells = parts.map((p) => p.trim().replace(/^"|"$/g, '').trim()).filter(Boolean);
    if (cells.length === 0) continue;
    const [name, ...players] = cells;
    // skip a header row such as "Team, Player 1, Player 2"
    if (teams.length === 0 && /^team(\s*name)?$/i.test(name)) continue;
    teams.push({ name, players: dedupe(players) });
  }
  return teams;
}

function dedupe(list: string[]): string[] {
  const seen = new Set<string>();
  return list.filter((p) => {
    const k = p.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** "Gen.G Esports" and "gen g esports.svg" should match. */
export function matchKey(value: string): string {
  return value
    .replace(/\.[a-z0-9]+$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/** Removes anything executable from an SVG so it is safe to host. */
export function sanitiseSvg(source: string): string | null {
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (doc.querySelector('parsererror')) return null;
  const root = doc.documentElement;
  if (root.nodeName.toLowerCase() !== 'svg') return null;

  doc.querySelectorAll('script, foreignObject, iframe, object, embed').forEach((n) => n.remove());
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      else if ((name === 'href' || name === 'xlink:href') && !value.startsWith('#') && !value.startsWith('data:image/')) {
        el.removeAttribute(attr.name);
      } else if (value.startsWith('javascript:')) el.removeAttribute(attr.name);
    }
  });
  return new XMLSerializer().serializeToString(doc);
}
