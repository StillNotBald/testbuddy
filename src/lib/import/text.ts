/** Text helpers: plain-text sanitising and number parsing. Pure, no DOM needed. */

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®',
  hellip: '…', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const cp = e.charAt(1).toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

export function normalizeNewlines(s: string): string {
  return s.replace(/\r\n?/g, '\n');
}

/**
 * For fields that TestBuddy stores as plain text (title, step description, step expected result):
 * HTML tags and light markdown are removed, block tags become newlines, entities are decoded.
 * Order matters: tags are stripped BEFORE entities are decoded, so "&lt;b&gt;" survives as the literal "<b>".
 */
export function toPlainText(input: string): string {
  let s = normalizeNewlines(input);
  s = s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|h[1-6])>/gi, '\n').replace(/<li[^>]*>/gi, '- ').replace(/<\/li>/gi, '\n');
  s = s.replace(/<\/?[a-z][^>]*>/gi, '');
  s = decodeEntities(s);
  s = s
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\[([^\]\n]+)\]\((https?:[^)\s]+)\)/g, '$1 ($2)');
  return s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Rich-text fields are kept as written; only newlines and outer whitespace are normalised. */
export function toRichText(input: string): string {
  return normalizeNewlines(input).trim();
}

/** "1h 30m 15s", "90s", "2m" -> seconds. Returns undefined when nothing parses. */
export function parseEstimate(input: string | undefined): number | undefined {
  if (!input) return undefined;
  let total = 0;
  let hit = false;
  for (const m of input.matchAll(/(\d+(?:\.\d+)?)\s*(h|m|s)/gi)) {
    hit = true;
    total += parseFloat(m[1] ?? '0') * { h: 3600, m: 60, s: 1 }[(m[2] ?? 's').toLowerCase() as 'h' | 'm' | 's'];
  }
  return hit ? Math.round(total) : undefined;
}

export function normalizeSourceKey(raw: string | undefined): string {
  const t = (raw ?? '').trim();
  if (/^\d+$/.test(t)) return `C${t}`;
  if (/^c\d+$/i.test(t)) return `C${t.slice(1)}`;
  return t;
}
