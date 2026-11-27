// Parsing helpers for the bulk team import.

export type ParsedPlayer = { gamertag: string; name?: string };
export type ParsedTeam = { name: string; tag?: string; players: ParsedPlayer[] };

const clean = (p: string) => p.trim().replace(/^"|"$/g, '').trim();

function splitRow(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map(clean);
  return line.split(/[,;]/).map(clean);
}

/**
 * Reads a pasted list or spreadsheet export. Two layouts are accepted.
 *
 * 1. One player per row, with a header (the layout to use for every game):
 *      Team Name, Tag, Player Name, Gamertag / In-game name
 *      Evil Geniuses, EG, Taro Obi, Taro
 *    Header names are matched loosely ("Team", "Tag", "Player", "Gamertag", "IGN", "EA ID").
 *
 * 2. One team per row, players listed after the team name:
 *      1. Fnatic: Kori, Ezra, Jett
 *      Fnatic<TAB>Kori<TAB>Ezra<TAB>Jett
 *      Fnatic,Kori,Ezra,Jett
 *    Leading numbers like "1." or "2)" are ignored.
 */
export function parseTeamList(text: string): ParsedTeam[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const header = splitRow(lines[0]).map((h) => h.toLowerCase());
  const col = (re: RegExp) => header.findIndex((h) => re.test(h));
  const teamCol = col(/^team(\s*name)?$/);
  const gtCol = col(/gamer\s*tag|\bign\b|in[-\s]?game|ea\s*id|\bid\b|nickname|handle/);
  if (teamCol >= 0 && gtCol >= 0) {
    const tagCol = col(/^(team\s*)?(tag|short(\s*code)?|abbr\w*)$/);
    const nameCol = col(/^(player(\s*name)?|full\s*name|real\s*name|name)$/);
    const order: string[] = [];
    const byTeam = new Map<string, ParsedTeam>();
    for (const line of lines.slice(1)) {
      const cells = splitRow(line);
      const tname = cells[teamCol];
      if (!tname) continue;
      const key = tname.toLowerCase();
      let team = byTeam.get(key);
      if (!team) {
        team = { name: tname, players: [] };
        byTeam.set(key, team);
        order.push(key);
      }
      if (tagCol >= 0 && cells[tagCol] && !team.tag) team.tag = cells[tagCol];
      const gamertag = cells[gtCol];
      if (gamertag && !team.players.some((p) => p.gamertag.toLowerCase() === gamertag.toLowerCase())) {
        const pname = nameCol >= 0 ? cells[nameCol] : '';
        team.players.push(pname ? { gamertag, name: pname } : { gamertag });
      }
    }
    return order.map((k) => byTeam.get(k)!);
  }

  const teams: ParsedTeam[] = [];
  for (const raw of lines) {
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
    const cells = parts.map(clean).filter(Boolean);
    if (cells.length === 0) continue;
    const [name, ...players] = cells;
    // skip a header row such as "Team, Player 1, Player 2"
    if (teams.length === 0 && /^team(\s*name)?$/i.test(name)) continue;
    teams.push({ name, players: dedupe(players).map((gamertag) => ({ gamertag })) });
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
