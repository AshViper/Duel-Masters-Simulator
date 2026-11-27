import { describe, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseAbilityText } from './textParser';

interface Row {
  ability: string;
  card: string;
  officialName?: string;
  type?: string;
  support?: string;
  text?: string;
  twinText?: string;
}

const OUT = 'C:/Users/student/AppData/Local/Temp/opencode/manual-lines.json';

describe('line analysis', () => {
  it('measures', () => {
    const rows = JSON.parse(readFileSync('C:/Users/student/AppData/Local/Temp/opencode/coverage.json', 'utf8')) as Row[];
    const seen = new Map<string, { line: string; count: number; abilities: string[]; kind: string }>();
    let full = 0;
    for (const row of rows) {
      const text = row.text;
      if (!text) continue;
      const kind = row.type === 'spell' ? 'spell' : 'creature';
      const p = parseAbilityText(text, kind);
      if (!p.manualLines.length) full++;
      for (const line of p.manualLines) {
        const key = `${kind}|${line}`;
        const cur = seen.get(key);
        if (cur) cur.count += 1;
        else seen.set(key, { line, count: 1, abilities: [row.ability], kind });
      }
    }
    const list = [...seen.values()].sort((a, b) => b.count - a.count);
    writeFileSync(OUT, JSON.stringify(list, null, 2), 'utf8');
    console.log('cards', rows.length, 'full', full, 'unique manual lines', list.length);
    console.log('top:');
    for (const x of list.slice(0, 80)) console.log(x.count, '|', x.line.slice(0, 130));
  });
});
