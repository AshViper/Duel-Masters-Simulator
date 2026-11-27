import { describe, it } from 'vitest';
import { parseAbilityText, splitAbilityLines } from './textParser';

const cases: [string, string, 'creature' | 'spell'][] = [
  ['recital', 'リサイタル５ （この呪文を墓地からコスト５を支払って唱えてもよい。そうして唱えた後、墓地に置くかわりに自分の山札の一番下に置く）', 'spell'],
  ['cyclone', 'サイクロン（このターン、この呪文を唱える直前にクリーチャーを召喚していれば、この呪文を唱えた後、墓地に置くかわりに自分の手札に戻す）', 'spell'],
  ['jan', 'このクリーチャーが出た時、相手とじゃんけんする。', 'creature'],
  ['partial', 'このクリーチャーがバトルゾーンに出た時、カードを1枚引く。その後、相手とじゃんけんする。', 'creature'],
];

describe('scratch3', () => {
  it('prints', () => {
    for (const [name, text, kind] of cases) {
      console.log('====', name);
      console.log('split', JSON.stringify(splitAbilityLines(text)));
      const p = parseAbilityText(text, kind);
      console.log(JSON.stringify({ k: p.keywords, a: p.abilities, alt: p.altPlays, manual: p.manualLines, parsed: p.parsedLines }, null, 1));
    }
  });
});
