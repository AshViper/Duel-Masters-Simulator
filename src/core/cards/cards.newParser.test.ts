// 新しい読み取り：字句解析（lexer.ts）と構文解析（grammar.ts）
// 元は別々のテストファイル。ファイルごとに describe（元のファイル名）で包んであるので、補助関数（mk・put・reg など）は同じ名前でもぶつからない
import { describe, expect, it } from 'vitest';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { applyAction, Ctx } from '../engine/engine';
import { evalCondition, keywords } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { ABILITY_SAMPLES, SAMPLE_RACES } from '../testing/abilitySamples';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { conjugate, formatTokens, type Token, tokenize, unknownStats } from './lexer';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import { parseAbilityText } from './textParser';
import type { Condition, ZoneName } from './types';

// ════════════════════════ lexer.test.ts ════════════════════════
describe('lexer', () => {
// 能力テキストの字句解析（lexer.ts）のテスト
const f = (line: string) => formatTokens(tokenize(line));
/** 語の表記だけを並べる（カッコの中は1語） */
const texts = (line: string) => tokenize(line).map((t) => t.text);

describe('語に分ける', () => {
  it('目的語＋動詞：「相手のクリーチャーを1体選び、破壊する」', () => {
    expect(f('相手のクリーチャーを1体選び、破壊する。')).toBe(
      '相手[player:opponent] の[p] クリーチャー[noun:creature] を[p] 1体[count:1体] 選び[verb:選ぶ/renyo] 、 破壊する[verb:破壊する/plain] 。',
    );
  });

  it('誘発と任意：「このクリーチャーが出た時、カードを2枚まで引いてもよい」', () => {
    expect(f('このクリーチャーが出た時、カードを2枚まで引いてもよい。')).toBe(
      'この[demo:this] クリーチャー[noun:creature] が[p] 出た[verb:出る/ta] 時[aux:when] 、 カード[noun:card] を[p] 2枚[count:2枚] まで[aux:until] 引いて[verb:引く/te] もよい[aux:may] 。',
    );
  });

  it('条件と比べる言葉：コスト5以下・2体以上なければ・多ければ', () => {
    expect(f('自分の墓地にあるコスト5以下の呪文')).toBe(
      '自分[player:self] の[p] 墓地[zone:graveyard] に[p] ある[verb:ある/plain] コスト[stat:cost] 5[num:5] 以下[cmp:<=] の[p] 呪文[noun:spell]',
    );
    expect(f('自分のクリーチャーが2体以上なければ')).toBe('自分[player:self] の[p] クリーチャー[noun:creature] が[p] 2体[count:2体] 以上[cmp:>=] なければ[aux:not]');
    expect(f('相手のマナが自分より多ければ')).toBe('相手[player:opponent] の[p] マナ[noun:mana] が[p] 自分[player:self] より[p] 多ければ[cmp:more/ba]');
  });

  it('数：符号つきのパワー・∞・○枚目', () => {
    expect(tokenize('パワーを+3000する')[2]).toMatchObject({ kind: 'number', n: 3000, sign: '+' });
    expect(tokenize('パワーを-∞する')[2]).toMatchObject({ kind: 'number', n: Infinity, sign: '-' });
    expect(tokenize('山札の上から1枚目を')[4]).toMatchObject({ kind: 'count', n: 1, unit: '枚', ordinal: true });
    expect(tokenize('ターンの後、もう1度ターンを行う')).toContainEqual(expect.objectContaining({ kind: 'count', n: 1, unit: '度' }));
  });

  it('種族を手札または墓地から召喚：「ドルスザクを４体まで、自分の手札または墓地からコストを支払わずに召喚してもよい」', () => {
    expect(f('ドルスザクを４体まで、自分の手札または墓地からコストを支払わずに召喚してもよい。')).toBe(
      'ドルスザク[?katakana] を[p] 4体[count:4体] まで[aux:until] 、 自分[player:self] の[p] 手札[zone:hand] または[conj:or] 墓地[zone:graveyard] から[p] ' +
        'コスト[stat:cost] を[p] 支払わず[verb:支払う/nu] に[p] 召喚して[verb:召喚する/te] もよい[aux:may] 。',
    );
  });

  it('追加ターン：「このターンの後で自分のターンをもう一度行う」（「一度」は「1度」にそろえる）', () => {
    expect(f('このターンの後で自分のターンをもう一度行う。')).toBe(
      'この[demo:this] ターン[noun:turn] の[p] 後[rel:after] で[p] 自分[player:self] の[p] ターン[noun:turn] を[p] もう[adv:more] 1度[count:1度] 行う[verb:行う/plain] 。',
    );
  });

  it('能力のラベル（xB）：「xB能力を与える」と、ラベルで始まるその能力の本文', () => {
    expect(f('このクリーチャーにxB能力を与える')).toBe('この[demo:this] クリーチャー[noun:creature] に[p] xB[label] 能力[noun:ability] を[p] 与える[verb:与える/plain]');
    expect(f('xB次の自分のターンの終わりまで、相手のクリーチャーは攻撃もブロックもできない。')).toBe(
      'xB[label] 次[time:next] の[p] 自分[player:self] の[p] ターン[noun:turn] の[p] 終わり[time:end] まで[aux:until] 、 相手[player:opponent] の[p] クリーチャー[noun:creature] は[p] ' +
        '攻撃[verb:攻撃する/stem] も[p] ブロック[verb:ブロックする/stem] も[p] できない[verb:できる/nai] 。',
    );
    // 長い辞書の語（能力語）はラベルにしない
    expect(tokenize('GR召喚する')[0]).toMatchObject({ kind: 'keyword' });
  });

  it('補足説明つきのキーワード：スーパー・S・トリガー／G・ストライク／ジャストダイバー', () => {
    const kinds = (line: string) => tokenize(line).map((t) => t.kind);
    expect(kinds('スーパー・S・トリガー（このクリーチャーを自分のシールドゾーンから手札に加える時、コストを支払わずにすぐ召喚してもよい。その時自分のシールドが１つもなければ、このクリーチャーにxB能力を与える）')).toEqual(['keyword', 'reminder']);
    expect(kinds('{GS} G・ストライク（このカードを自分のシールドゾーンから手札に加える時、表向きにし、相手のクリーチャーを１体選んでもよい。このターン、そのクリーチャーは攻撃できない）')).toEqual(['icon', 'keyword', 'reminder']);
    expect(f('次の自分のターンのはじめまで、このクリーチャーは相手に選ばれず、攻撃されない')).toBe(
      '次[time:next] の[p] 自分[player:self] の[p] ターン[noun:turn] の[p] はじめ[time:start] まで[aux:until] 、 この[demo:this] クリーチャー[noun:creature] は[p] ' +
        '相手[player:opponent] に[p] 選ばれず[verb:選ぶ/passiveNu] 、 攻撃されない[verb:攻撃する/passiveNai]',
    );
  });

  it('比べる条件：「相手のマナゾーンにあるカードの枚数よりコストが大きいクリーチャーなら」', () => {
    expect(f('相手のクリーチャーが出た時、それが相手のマナゾーンにあるカードの枚数よりコストが大きいクリーチャーなら、持ち主の手札に戻してもよい。')).toBe(
      '相手[player:opponent] の[p] クリーチャー[noun:creature] が[p] 出た[verb:出る/ta] 時[aux:when] 、 それ[demo:it] が[p] 相手[player:opponent] の[p] マナゾーン[zone:mana] に[p] ' +
        'ある[verb:ある/plain] カード[noun:card] の[p] 枚数[noun:amount] より[p] コスト[stat:cost] が[p] 大きい[cmp:big] クリーチャー[noun:creature] なら[aux:if] 、 ' +
        '持ち主[player:holder] の[p] 手札[zone:hand] に[p] 戻して[verb:戻す/te] もよい[aux:may] 。',
    );
  });

  it('無月の門：「〜を2つずつ選び」「それら4枚の上に」', () => {
    expect(f('自分の魔導具をバトルゾーンと墓地から２つずつ選び、このクリーチャーを自分の手札または墓地からそれら４枚の上にコストを支払わずに召喚してもよい。')).toBe(
      '自分[player:self] の[p] 魔導具[?kanji] を[p] バトルゾーン[zone:battle] と[p] 墓地[zone:graveyard] から[p] 2つ[count:2つ] ずつ[p] 選び[verb:選ぶ/renyo] 、 ' +
        'この[demo:this] クリーチャー[noun:creature] を[p] 自分[player:self] の[p] 手札[zone:hand] または[conj:or] 墓地[zone:graveyard] から[p] それら[demo:they] 4枚[count:4枚] の[p] 上[rel:top] に[p] ' +
        'コスト[stat:cost] を[p] 支払わず[verb:支払う/nu] に[p] 召喚して[verb:召喚する/te] もよい[aux:may] 。',
    );
    expect(tokenize('無月の門：自分の魔導具をバトルゾーンに出した時、')[0]).toMatchObject({ kind: 'keyword', keyword: '無月の門' });
  });

  it('全角・半角と空白をそろえる', () => {
    expect(texts('カードを１枚　引く')).toEqual(['カード', 'を', '1枚', '引く']);
    expect(texts('シールドをひとつ選ぶ')).toEqual(['シールド', 'を', '1つ', '選ぶ']);
  });
});

describe('動詞の活用', () => {
  it('する動詞・五段・一段の活用形を作る', () => {
    const m = (lemma: string, cls: Parameters<typeof conjugate>[1]) => Object.fromEntries(conjugate(lemma, cls).map(([s, form]) => [form, s]));
    expect(m('破壊', 'suru')).toMatchObject({ stem: '破壊', renyo: '破壊し', passiveNai: '破壊されない', cannot: '破壊できない', causative: '破壊させる' });
    expect(m('選ぶ', 'godan')).toMatchObject({ renyo: '選び', te: '選んで', ta: '選んだ', cannot: '選べない', causativeRenyo: '選ばせ' });
    expect(m('置く', 'godan')).toMatchObject({ te: '置いて', passiveTa: '置かれた', nu: '置かず' });
    expect(m('戻す', 'godan')).toMatchObject({ renyo: '戻し', te: '戻して', ba: '戻せば' });
    expect(m('加える', 'ichidan')).toMatchObject({ renyo: '加え', passiveTa: '加えられた', nu: '加えず' });
  });

  it('文の中の活用形を読む', () => {
    const verb = (line: string) => tokenize(line).find((t) => t.kind === 'verb') as Extract<Token, { kind: 'verb' }>;
    expect(verb('攻撃できない')).toMatchObject({ lemma: '攻撃する', form: 'cannot' });
    expect(verb('ブロックされない')).toMatchObject({ lemma: 'ブロックする', form: 'passiveNai' });
    expect(verb('コストを支払わずに')).toMatchObject({ lemma: '支払う', form: 'nu' });
    expect(verb('相手に選ばせ、')).toMatchObject({ lemma: '選ぶ', form: 'causativeRenyo' });
    expect(f('召喚したり唱えたりできない')).toBe('召喚したり[verb:召喚する/tari] 唱えたり[verb:唱える/tari] できない[verb:できる/nai]');
    expect(f('ブロックされなかった時')).toBe('ブロックされ[verb:ブロックする/passiveRenyo] なかった[aux:not] 時[aux:when]');
  });
});

describe('カッコ・カード名・能力語', () => {
  it('補足説明（カッコ）は中身も語に分ける。入れ子にも対応', () => {
    const ts = tokenize('アビス・メクレイド5（自分の山札の上から3枚を見る。（これは補足））');
    expect(ts.map((t) => t.kind)).toEqual(['keyword', 'number', 'reminder']);
    const r = ts[2] as Extract<Token, { kind: 'reminder' }>;
    expect(r.children.slice(0, 3).map((t) => t.text)).toEqual(['自分', 'の', '山札']);
    expect(r.children[r.children.length - 1].kind).toBe('reminder');
  });

  it('《カード名》と「キーワード」', () => {
    expect(f('相手は《ボルメテウス・ホワイト・ドラゴン》を選べない')).toBe(
      '相手[player:opponent] は[p] 《ボルメテウス・ホワイト・ドラゴン》[name] を[p] 選べない[verb:選ぶ/cannot]',
    );
    expect(f('「スピードアタッカー」を与える')).toBe('「スピードアタッカー[kw]」 を[p] 与える[verb:与える/plain]');
  });

  it('能力語は1語にまとめる（長いほうを優先）', () => {
    expect(texts('サイバー・メクレイド8する')).toEqual(['サイバー・メクレイド', '8', 'する']);
    expect(texts('■ブロッカー ■W・ブレイカー')).toEqual(['■', 'ブロッカー', '■', 'W・ブレイカー']);
    expect(tokenize('{2W} W・ブレイカー')[0]).toMatchObject({ kind: 'icon', icon: '2W' });
  });

  it('辞書にないカタカナ語（種族など）は1語のまま残し、途中で辞書を引かない', () => {
    expect(f('自分のドラゴン・ゾンビを1体')).toBe('自分[player:self] の[p] ドラゴン・ゾンビ[?katakana] を[p] 1体[count:1体]');
    // 「シールド」で切らない
    expect(texts('ウルトラシールド・プラス')).toEqual(['ウルトラシールド・プラス']);
    // 語の終わりの「・」は区切り
    expect(texts('エグザイル・クリーチャー')).toEqual(['エグザイル', '・', 'クリーチャー']);
  });

  it('位置は、そろえた後の文字列の位置', () => {
    const ts = tokenize('カードを１枚引く');
    expect(ts.map((t) => [t.start, t.end])).toEqual([[0, 3], [3, 4], [4, 6], [6, 8]]);
  });
});

describe('例文集（ユーザーが挙げた文）', () => {
  it.each(ABILITY_SAMPLES.map((s) => [s.slice(0, 40), s]))('辞書にない語は種族名だけ：%s', (_, line) => {
    expect(unknownStats(tokenize(line)).unknownWords.filter((w) => !SAMPLE_RACES.includes(w))).toEqual([]);
  });

  it('区切りなしで並んだキーワードを切る：「スピードアタッカーパワーアタッカー+5000」', () => {
    expect(f('スピードアタッカーパワーアタッカー+5000このクリーチャーが')).toBe(
      'スピードアタッカー[kw] パワーアタッカー[kw] +5000[num:+5000] この[demo:this] クリーチャー[noun:creature] が[p]',
    );
  });

  it('「まだ使っていなければ」「攻撃することができない」「その２体をバトルさせる」', () => {
    expect(f('まだ使っていなければ')).toBe('まだ[adv:yet] 使って[verb:使う/te] いなければ[verb:いる/nakereba]');
    expect(f('攻撃することができない')).toBe('攻撃する[verb:攻撃する/plain] こと[aux:koto] が[p] できない[verb:できる/nai]');
    expect(f('その２体をバトルさせる')).toBe('その[demo:that] 2体[count:2体] を[p] バトルさせる[verb:バトルする/causative]');
  });
});

/** テストに書かれている実際のカードの文（cr('…') sp('…') text: '…' など）を集める */
function corpus(): string[] {
  const lines = new Set<string>();
  const files = [
    ...readdirSync('src/core/cards').filter((x) => x.endsWith('.test.ts') && x !== 'cards.newParser.test.ts').map((x) => `src/core/cards/${x}`),
    'src/core/engine/effects.test.ts',
    'src/core/engine/engine.test.ts',
    'src/core/testing/fixtureCards.ts',
  ];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/(?:\b(?:parseAbilityText|creature|cr|spell|sp|p|face|official|card|mk|make\w*)\(|text: *|\[)'([^'\n]{4,})'/g)) {
      if (!/[ぁ-ん]/.test(m[1])) continue;
      for (const l of m[1].split(/\\n/)) if (l.length > 3) lines.add(l);
    }
  }
  return [...lines];
}

describe('実際のカードの文', () => {
  it('辞書にない文字は 5% 未満（残りは種族名・カード名など）', () => {
    const lines = corpus();
    expect(lines.length).toBeGreaterThan(300);
    let chars = 0;
    let unknown = 0;
    for (const l of lines) {
      const s = unknownStats(tokenize(l));
      chars += s.chars;
      unknown += s.unknownChars;
    }
    expect(unknown / chars).toBeLessThan(0.05);
  });

  // npm run lexer:report の時だけ動く：未対応の能力語の文がどう分かれるかを vault/reports/lexer-report.md に書き出す
  it.runIf(process.env.npm_lifecycle_event === 'lexer:report')('レポートを書き出す', () => {
    const lines = corpus();
    const freq = new Map<string, number>();
    let chars = 0;
    let unknown = 0;
    for (const l of lines) {
      const s = unknownStats(tokenize(l));
      chars += s.chars;
      unknown += s.unknownChars;
      for (const w of s.unknownWords) freq.set(w, (freq.get(w) ?? 0) + 1);
    }
    const unsupported = [...readFileSync('design/ability-coverage.md', 'utf8').matchAll(/^\| (.+?) \| (.+?) \| (.+?) \|$/gm)]
      .filter((m) => m[1] !== '能力語' && m[1] !== '---')
      .map((m) => ({ word: m[1], reason: m[3], text: m[3].match(/：(.+)$/)?.[1] }));
    const md = [
      '---',
      'tags: [report, generated]',
      `generated: ${new Date().toISOString().slice(0, 10)}`,
      '---',
      '# 字句解析レポート',
      '',
      '> 自動生成（`npm run lexer:report`）。大きいので Claude は grep で引く。',
      '',
      `- テストに書かれたカードの文 ${lines.length} 行・${chars} 文字のうち、辞書にない文字 ${unknown}（${((unknown / chars) * 100).toFixed(1)}%）`,
      '',
      '## 辞書にない語（多い順）',
      '',
      [...freq].sort((a, b) => b[1] - a[1]).slice(0, 80).map(([w, c]) => `${w}(${c})`).join(' · '),
      '',
      '## 例文集（src/core/testing/abilitySamples.ts）',
      '',
      '★は今の読み取り（textParser と grammar）でも、クリーチャーとしても呪文としても手動処理になる行。',
      '',
      ...ABILITY_SAMPLES.flatMap((l) => {
        const manual = parseAbilityText(l, 'creature').manualLines.length > 0 && parseAbilityText(l, 'spell').manualLines.length > 0;
        return [`- ${manual ? '★' : ''}${l}`, `  - \`${formatTokens(tokenize(l))}\``];
      }),
      '',
      '## 未対応の能力語の文の分かれ方（design/ability-coverage.md の「未対応」）',
      '',
      ...unsupported.flatMap((u) => [`### ${u.word}`, `理由：${u.reason}`, ...(u.text ? ['', '`' + formatTokens(tokenize(u.text)) + '`'] : []), '']),
    ].join('\n');
    mkdirSync('vault/reports', { recursive: true });
    writeFileSync('vault/reports/lexer-report.md', md);
  });
});
});

// ════════════════════════ grammar.test.ts ════════════════════════
describe('grammar', () => {
// 能力テキストの構文解析（grammar.ts）と、そのために足したエンジンの処理のテスト。
// 例文集（testing/abilitySamples.ts）で、textParser では手動処理になっていた行を中心に確かめる
const cr = (t: string) => parseAbilityText(t, 'creature');
const sp = (t: string) => parseAbilityText(t, 'spell');

describe('読み取り（textParser で手動だった文）', () => {
  it('種族を手札または墓地から召喚する', () => {
    const p = sp('ドルスザクを４体まで、自分の手札または墓地からコストを支払わずに召喚してもよい。');
    expect(p.manualLines).toEqual([]);
    expect(p.abilities).toEqual([
      {
        when: 'onCast',
        optional: true,
        effects: [{ type: 'playFree', target: { owner: 'self', zone: 'hand', extraZones: ['graveyard'], count: 4, upTo: true, filter: { race: 'ドルスザク', cardType: 'creature' } } }],
      },
    ]);
  });

  it('追加ターン：「後で」「後に」、「もう一度」の位置が違っても同じ', () => {
    for (const t of ['このターンの後で自分のターンをもう一度行う。', 'このターンの後にもう一度自分のターンを行う。', 'このターンの後、自分はもう1度ターンを行う。']) {
      expect(sp(t).abilities[0].effects).toEqual([{ type: 'extraTurn' }]);
    }
  });

  it('スーパー・S・トリガーの追加能力（行の頭の xB）：次の自分のターンの終わりまで、攻撃もブロックもできない', () => {
    const p = sp('カードを１枚引く。\nxB次の自分のターンの終わりまで、相手のクリーチャーは攻撃もブロックもできない。');
    expect(p.manualLines).toEqual([]);
    expect(p.abilities[1]).toEqual({
      when: 'onCast',
      effects: [{ type: 'turnStatic', static: { type: 'grantKeyword', keywords: { cannotAttack: true, cannotBlock: true }, appliesTo: { owner: 'opponent' } }, untilNextTurnEnd: true }],
      condition: { type: 'and', conditions: [{ type: 'opponentTurn' }, { type: 'compare', left: { who: 'self', zone: 'shield' }, op: '<=', right: 0 }] },
    });
  });

  it('「それが〜クリーチャーなら」：誘発の原因の条件', () => {
    expect(cr('相手のクリーチャーが出た時、それが相手のマナゾーンにあるカードの枚数よりコストが大きいクリーチャーなら、持ち主の手札に戻してもよい。').abilities).toEqual([
      {
        when: 'onOtherSummon',
        who: 'opponent',
        optional: true,
        filter: { costAboveOwnerMana: true, cardType: 'creature' },
        effects: [{ type: 'move', target: { owner: 'any', zone: 'battle', count: 'all', ref: 'event' }, to: 'hand' }],
      },
    ]);
  });

  it('シールドを見て墓地に置き、そのプレイヤーは山札から新しいシールドを置く', () => {
    expect(sp('いずれかのプレイヤーのシールドを１つ見る。それを持ち主の墓地に置いてもよい。そうしたら、そのプレイヤーは自身の山札の上から１枚目を裏向きのまま、新しいシールドとしてシールドゾーンに置く。').abilities[0].effects).toEqual([
      { type: 'choose', target: { owner: 'any', zone: 'shield', count: 1 }, reveal: true },
      {
        type: 'optional',
        effects: [
          { type: 'move', target: { owner: 'any', zone: 'battle', count: 'all', ref: 'chosen', anyZone: true }, to: 'graveyard' },
          { type: 'deckTopTo', count: 1, who: 'chosenOwner', to: 'shield' },
        ],
      },
    ]);
  });

  it('自分のクリーチャーと相手のクリーチャーを選んでバトルさせる', () => {
    expect(cr('このクリーチャーをバトルゾーンに出した時、自分のクリーチャーを１体と、相手のクリーチャーを１体、バトルゾーンから選んでもよい。その２体をバトルさせる。').abilities).toEqual([
      {
        when: 'onSummon',
        optional: true,
        effects: [
          { type: 'choose', target: { owner: 'self', zone: 'battle', count: 1 } },
          { type: 'fight', target: { owner: 'opponent', zone: 'battle', count: 1 }, fighter: 'chosen' },
        ],
      },
    ]);
  });

  it('出る時の置換（常在効果）：「ドラゴンではない〜」「「出た時」で始まる能力を持つ〜」', () => {
    expect(cr('ドラゴンではないクリーチャーがバトルゾーンに出る時、バトルゾーンに出るかわりに持ち主の墓地に置かれる').statics).toEqual([
      { type: 'enterInstead', who: 'both', filter: { not: { race: 'ドラゴン' }, cardType: 'creature' }, to: 'graveyard' },
    ]);
    expect(cr('相手の「このクリーチャーがバトルゾーンに出た時」で始まる能力を持つクリーチャーがバトルゾーンに出る時、相手はかわりにそのクリーチャーをマナゾーンに置く。').statics).toEqual([
      { type: 'enterInstead', who: 'opponent', filter: { hasOnSummonAbility: true, cardType: 'creature' }, to: 'mana' },
    ]);
  });

  it('区切りなしで並んだキーワード＋ガチンコ・ジャッジで追加ターン', () => {
    const p = cr('スピードアタッカーパワーアタッカー+5000このクリーチャーが攻撃する時、相手とガチンコ・ジャッジする。自分が勝ったら、このターンの後にもう一度自分のターンを行う。(ガチンコ・ジャッジ：各プレイヤーは自身の山札の上から１枚目を見せ、それを一番下に置く。そのカードのコストが相手以上であれば、自分の勝ちとする)');
    expect(p.manualLines).toEqual([]);
    expect(p.keywords).toMatchObject({ speedAttacker: true, powerAttacker: 5000 });
    expect(p.abilities).toEqual([{ when: 'onAttack', effects: [{ type: 'gachinko', then: [{ type: 'extraTurn' }] }] }]);
  });

  it('ファイナル革命：革命チェンジで出た時、そのターンにまだ使っていなければ', () => {
    expect(cr('ファイナル革命：このクリーチャーが「革命チェンジ」によってバトルゾーンに出た時、そのターン中に他の「ファイナル革命」をまだ使っていなければ、自分の山札の上から４枚を表向きにする。その中から進化ではない多色クリーチャーを、コストの合計が６以下になるように好きな数選び、バトルゾーンに出す。残りを好きな順序で山札の下に置く。').abilities).toEqual([
      {
        when: 'onSummon',
        condition: { type: 'and', conditions: [{ type: 'enteredByRevolution' }, { type: 'not', condition: { type: 'usedThisTurn', key: 'ファイナル革命' } }] },
        effects: [
          { type: 'markUsed', key: 'ファイナル革命' },
          { type: 'lookAtTop', count: 4, pickCount: 99, pickFilter: { nonEvolution: true, multicolor: true, cardType: 'creature' }, pickTo: 'battle', restTo: 'deckBottom', pickMaxTotalCost: 6 },
        ],
      },
    ]);
  });

  it('知らないキーワードの補足説明を能力として読む：ドラゴン・W・ブレイカー', () => {
    const p = cr('ドラゴン・W・ブレイカー（このクリーチャーはシールドを２つブレイクする。各ブレイクの前に、自分の山札の上から１枚目を、裏向きのまま新しいシールドとして自分のシールドゾーンに置くか、表向きにして自分のシールド１つの上に置く）');
    expect(p.manualLines).toEqual([]);
    expect(p.keywords.breaker).toBe(2);
    expect(p.abilities[0]).toMatchObject({ when: 'onBeforeBreak', effects: [{ type: 'chooseOne', options: [{ effects: [{ type: 'deckTopTo', to: 'shield' }] }, { effects: [{ type: 'deckTopTo', to: 'shieldTop' }] }] }] });
  });

  it('相手のカードを表向きにしてシールドの上に置く', () => {
    expect(cr('このクリーチャーがバトルゾーンに出た時、バトルゾーンにある相手のカードを１枚選び、表向きにして持ち主のシールド１つの上に置く。').abilities[0].effects).toEqual([
      { type: 'move', target: { owner: 'opponent', zone: 'battle', count: 1 }, to: 'shieldTop' },
    ]);
  });

  it('離れる時の置換：表向きのシールドを墓地に置く／CRY-S-MAX進化', () => {
    expect(cr('自分のクリーチャーがバトルゾーンを離れる時、かわりにいずれかのシールドゾーンにある表向きのカードを１枚選び、持ち主の墓地に置いてもよい').replacements).toEqual([
      { event: 'leaveBattle', subject: 'anyOwn', instead: 'faceUpShieldToGrave', optional: true },
    ]);
    const p = cr('CRY-S-MAX進化：自分がゲームに負ける時またはこのクリーチャーが離れる時、かわりに自分の表向きのカードを３枚破壊するか、自分のシールドを１つ墓地に置いてもよい。（このクリーチャーは進化元を必要としない。自分のS-MAX進化クリーチャーが２体以上あれば、そのうちの１体を残し、残りをすべて手札に戻す）');
    expect(p.manualLines).toEqual([]);
    expect(p.keywords).toMatchObject({ sMax: true, avertLoss: 3, avertLossShield: 1 });
    expect(p.replacements).toEqual([{ event: 'leaveBattle', subject: 'self', instead: 'avertCost', count: 3, shieldAlt: 1, optional: true }]);
  });

  it('手札にある間の誘発：相手のターンの終わり／クリーチャーが攻撃する時（鬼エンド）', () => {
    expect(cr('相手のターンの終わりに、相手がそのターン中、マナゾーンのカードをタップせずに、クリーチャーを出すか呪文を唱えていて、バトルゾーンに自分の 《流星のガイアッシュ・カイザー》がなければ、このクリーチャーをコストを支払わずに召喚してもよい。').handTriggers).toEqual([
      {
        when: 'opponentTurnEnd',
        condition: {
          type: 'and',
          conditions: [
            { type: 'playedFreeThisTurn', who: 'opponent' },
            { type: 'not', condition: { type: 'compare', left: { who: 'self', zone: 'battle', filter: { nameIncludes: '流星のガイアッシュ・カイザー' } }, op: '>=', right: 1 } },
          ],
        },
      },
    ]);
    const oni = sp('鬼エンド：クリーチャーが攻撃する時、シールドが１つもないプレイヤーがいて、自分のマナゾーンに闇と火文明があれば、この呪文を自分の手札からコストを支払わずに唱えてもよい。');
    expect(oni.manualLines).toEqual([]);
    expect(oni.handTriggers?.[0].when).toBe('anyAttack');
  });

  it('常在効果：出たターンは自分を攻撃できない／マナゾーンから召喚してもよい', () => {
    expect(cr('相手のクリーチャーは出たターン、自分を攻撃できない。').statics).toEqual([
      { type: 'grantKeyword', keywords: { cannotAttackPlayers: true }, appliesTo: { owner: 'opponent', filter: { enteredThisTurn: true } } },
    ]);
    expect(cr('自分のターン中、クリーチャーを１体、自分のマナゾーンから召喚してもよい。').statics).toEqual([
      { type: 'summonFromZone', zone: 'mana', filter: { cardType: 'creature' }, oncePerTurn: true, duringTurn: 'self' },
    ]);
  });

  it('鬼エンド（攻撃の終わりにアンタップ）・このターン攻撃できない・この呪文をシールドに加える', () => {
    expect(cr('鬼エンド：このクリーチャーの攻撃の終わりに、シールドが１つもないプレイヤーがいれば、このクリーチャーをアンタップする。').abilities[0]).toMatchObject({
      when: 'onAttackEnd',
      effects: [{ type: 'selfAction', action: 'untap' }],
      condition: { type: 'or' },
    });
    expect(sp('このターン、クリーチャーは攻撃することができない。').abilities[0].effects).toEqual([
      { type: 'turnStatic', static: { type: 'grantKeyword', keywords: { cannotAttack: true }, appliesTo: { owner: 'any' } } },
    ]);
    expect(sp('この呪文を裏向きにしてシールドに加える。その後、自分のシールドを１枚選び、墓地に置く。').abilities[0].effects).toEqual([
      { type: 'selfAction', action: 'shield' },
      { type: 'move', target: { owner: 'self', zone: 'shield', count: 1 }, to: 'graveyard' },
    ]);
  });

  it('意味の分からないアイコンの付いた行は読まない', () => {
    expect(cr('{l} 自分のターンの終わりに、このクリーチャーをアンタップする。').manualLines).toHaveLength(1);
  });
});

// ───────────────────────── エンジンで動かす ─────────────────────────
const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const mk = (id: string, abilities: string[], o: O = {}) =>
  convertOfficialCard({
    id,
    detailUrl: '',
    faces: [{ ...base, name: id, race: o.race ?? 'テスト', civilization: o.civ ?? '火', type: o.type ?? 'クリーチャー', power: o.power ?? '3000', cost: o.cost ?? '0', abilities }],
  });
const spell = (id: string, abilities: string[], cost = '0') => mk(id, abilities, { type: '呪文', power: '', cost });
const C = {
  vanilla: mk('g-v', [], { power: '2000' }),
  big: mk('g-big', [], { power: '6000' }),
  dolsz: mk('g-dol', [], { race: 'ドルスザク' }),
  dragon: mk('g-drg', [], { race: 'アーマード・ドラゴン' }),
  onSummon: mk('g-os', ['このクリーチャーが出た時、カードを1枚引く。']),
  callDol: spell('g-s1', ['ドルスザクを４体まで、自分の手札または墓地からコストを支払わずに召喚してもよい。']),
  extra: spell('g-s2', ['このターンの後で自分のターンをもう一度行う。']),
  peek: spell('g-s3', ['いずれかのプレイヤーのシールドを１つ見る。それを持ち主の墓地に置いてもよい。そうしたら、そのプレイヤーは自身の山札の上から１枚目を裏向きのまま、新しいシールドとしてシールドゾーンに置く。']),
  toShield: spell('g-s4', ['この呪文を裏向きにしてシールドに加える。その後、自分のシールドを１枚選び、墓地に置く。']),
  paidSpell: spell('g-s5', ['カードを1枚引く。'], '1'),
  lock: mk('g-c1', ['このクリーチャーが出た時、次の自分のターンの終わりまで、相手のクリーチャーは攻撃もブロックもできない。']),
  duel: mk('g-c2', ['このクリーチャーをバトルゾーンに出した時、自分のクリーチャーを１体と、相手のクリーチャーを１体、バトルゾーンから選んでもよい。その２体をバトルさせる。']),
  noDragon: mk('g-c3', ['ドラゴンではないクリーチャーがバトルゾーンに出る時、バトルゾーンに出るかわりに持ち主の墓地に置かれる']),
  manaGate: mk('g-c4', ['相手の「このクリーチャーがバトルゾーンに出た時」で始まる能力を持つクリーチャーがバトルゾーンに出る時、相手はかわりにそのクリーチャーをマナゾーンに置く。']),
  shieldMaker: mk('g-c5', ['このクリーチャーが出た時、自分の山札の上から１枚目を、裏向きのまま新しいシールドとして自分のシールドゾーンに置くか、表向きにして自分のシールド１つの上に置く。']),
  bury: mk('g-c6', ['このクリーチャーがバトルゾーンに出た時、バトルゾーンにある相手のカードを１枚選び、表向きにして持ち主のシールド１つの上に置く。']),
  guard: mk('g-c7', ['自分のクリーチャーがバトルゾーンを離れる時、かわりにいずれかのシールドゾーンにある表向きのカードを１枚選び、持ち主の墓地に置いてもよい']),
  fresh: mk('g-c8', ['相手のクリーチャーは出たターン、自分を攻撃できない。']),
  cry: mk('g-c9', ['CRY-S-MAX進化：自分がゲームに負ける時またはこのクリーチャーが離れる時、かわりに自分の表向きのカードを３枚破壊するか、自分のシールドを１つ墓地に置いてもよい。（このクリーチャーは進化元を必要としない。自分のS-MAX進化クリーチャーが２体以上あれば、そのうちの１体を残し、残りをすべて手札に戻す）']),
  finalRev: mk('g-c10', ['ファイナル革命：このクリーチャーが「革命チェンジ」によってバトルゾーンに出た時、そのターン中に他の「ファイナル革命」をまだ使っていなければ、自分の山札の上から４枚を表向きにする。その中から進化ではない多色クリーチャーを、コストの合計が６以下になるように好きな数選び、バトルゾーンに出す。残りを好きな順序で山札の下に置く。']),
  multi: mk('g-m', [], { civ: '火/自然', cost: '3' }),
  kaiser: mk('g-c11', ['相手のターンの終わりに、相手がそのターン中、マナゾーンのカードをタップせずに、クリーチャーを出すか呪文を唱えていて、バトルゾーンに自分の 《流星のガイアッシュ・カイザー》がなければ、このクリーチャーをコストを支払わずに召喚してもよい。']),
};
const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(C)]);
const filler = Array.from({ length: 40 }, () => 'S01-043');

function put(s: GameState, player: PlayerId, cardId: string, zone: ZoneName): string {
  const iid = `t${s.nextIid++}`;
  s.cards[iid] = { iid, cardId, owner: player, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
  s.players[player].zones.deck.unshift(iid);
  new Ctx(s, reg).moveCard(iid, zone);
  s.cards[iid].enteredTurn = 0;
  return iid;
}
function act(s: GameState, a: Action): GameState {
  const r = applyAction(s, a, reg);
  if (r.error) throw new Error(r.error);
  return r.state;
}
/** 入力待ちに答える */
const respond = (s: GameState, r: { selected?: string[]; accept?: boolean }) => act(s, { type: 'RESPOND', player: s.pending!.player, ...r });
/** エンジンのタスクを直接積んで進める（革命チェンジ・離れる時など、行動から作りにくい場面用） */
function runTask(s: GameState, task: GameState['queue'][number]): GameState {
  s.queue.push(task);
  new Ctx(s, reg).run();
  return s;
}
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 5, firstPlayer: 0 }, reg);
const zone = (s: GameState, p: PlayerId, z: 'hand' | 'graveyard' | 'shield' | 'mana' | 'battle' | 'deck') => s.players[p].zones[z].length;

describe('エンジンで動く', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });

  it('ドルスザクを手札と墓地から選んで召喚する', () => {
    let s = newGame();
    const h1 = put(s, 0, C.dolsz.id, 'hand');
    const h2 = put(s, 0, C.dolsz.id, 'hand');
    const g1 = put(s, 0, C.dolsz.id, 'graveyard');
    const other = put(s, 0, C.vanilla.id, 'hand');
    const card = put(s, 0, C.callDol.id, 'hand');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: card });
    s = respond(s, { accept: true });
    expect(s.pending).toMatchObject({ kind: 'selectCards', max: 3 });
    expect(s.pending?.kind === 'selectCards' && s.pending.candidates).not.toContain(other);
    s = respond(s, { selected: [h1, g1] });
    expect([s.cards[h1].zone, s.cards[g1].zone, s.cards[h2].zone]).toEqual(['battle', 'battle', 'hand']);
  });

  it('追加ターン・マナをタップせずに唱えた呪文を数える', () => {
    let s = newGame();
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: put(s, 0, C.extra.id, 'hand') });
    expect(s.players[0].extraTurns).toBe(1);
    expect(s.players[0].freeSpellsThisTurn).toBe(1);
    put(s, 0, C.vanilla.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: put(s, 0, C.paidSpell.id, 'hand') });
    expect(s.players[0].freeSpellsThisTurn).toBe(1);
    const cond: Condition = { type: 'playedFreeThisTurn', who: 'opponent' };
    expect(evalCondition(s, reg, 1, cond)).toBe(true);
    expect(evalCondition(s, reg, 0, cond)).toBe(false);
  });

  it('次の自分のターンの終わりまで、相手のクリーチャーは攻撃もブロックもできない', () => {
    let s = newGame();
    const foe = put(s, 1, C.vanilla.id, 'battle');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: put(s, 0, C.lock.id, 'hand') });
    expect(keywords(s, reg, foe)).toMatchObject({ cannotAttack: true, cannotBlock: true });
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.activePlayer).toBe(1);
    expect(keywords(s, reg, foe).cannotAttack).toBe(true);
    s = act(s, { type: 'END_TURN', player: 1 });
    expect(keywords(s, reg, foe).cannotAttack).toBe(true);
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(keywords(s, reg, foe).cannotAttack).toBeFalsy();
  });

  it('シールドを見て墓地に置き、持ち主の山札から新しいシールドを置く', () => {
    let s = newGame();
    const before = { shield: zone(s, 1, 'shield'), deck: zone(s, 1, 'deck'), grave: zone(s, 1, 'graveyard') };
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: put(s, 0, C.peek.id, 'hand') });
    const target = s.players[1].zones.shield[0];
    s = respond(s, { selected: [target] });
    s = respond(s, { accept: true });
    expect(s.cards[target].zone).toBe('graveyard');
    expect({ shield: zone(s, 1, 'shield'), deck: zone(s, 1, 'deck'), grave: zone(s, 1, 'graveyard') }).toEqual({ shield: before.shield, deck: before.deck - 1, grave: before.grave + 1 });
  });

  it('この呪文を裏向きにしてシールドに加え、その後シールドを1つ墓地に置く', () => {
    let s = newGame();
    const card = put(s, 0, C.toShield.id, 'hand');
    const shields = zone(s, 0, 'shield');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: card });
    expect(s.cards[card]).toMatchObject({ zone: 'shield', faceUp: false });
    const old = s.players[0].zones.shield.find((x) => x !== card)!;
    s = respond(s, { selected: [old] });
    expect(s.cards[old].zone).toBe('graveyard');
    expect(s.cards[card].zone).toBe('shield');
    expect(zone(s, 0, 'shield')).toBe(shields);
  });

  it('自分のクリーチャーと相手のクリーチャーをバトルさせる', () => {
    let s = newGame();
    const mine = put(s, 0, C.big.id, 'battle');
    const foe = put(s, 1, C.vanilla.id, 'battle');
    put(s, 1, C.big.id, 'battle');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: put(s, 0, C.duel.id, 'hand') });
    s = respond(s, { accept: true });
    s = respond(s, { selected: [mine] });
    s = respond(s, { selected: [foe] });
    expect(s.cards[foe].zone).toBe('graveyard');
    expect(s.cards[mine].zone).toBe('battle');
  });

  it('ドラゴンではないクリーチャーは出るかわりに墓地に置かれる', () => {
    let s = newGame();
    put(s, 1, C.noDragon.id, 'battle');
    const v = put(s, 0, C.vanilla.id, 'hand');
    const d = put(s, 0, C.dragon.id, 'hand');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: v });
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: d });
    expect([s.cards[v].zone, s.cards[d].zone]).toEqual(['graveyard', 'battle']);
  });

  it('相手の「出た時」の能力を持つクリーチャーは、出るかわりにマナゾーンに置かれる', () => {
    let s = newGame();
    put(s, 1, C.manaGate.id, 'battle');
    const os = put(s, 0, C.onSummon.id, 'hand');
    const v = put(s, 0, C.vanilla.id, 'hand');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: os });
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: v });
    expect([s.cards[os].zone, s.cards[v].zone]).toEqual(['mana', 'battle']);
  });

  it('山札の上から表向きにして、自分のシールド1つの上に置く', () => {
    let s = newGame();
    const shields = [...s.players[0].zones.shield];
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: put(s, 0, C.shieldMaker.id, 'hand') });
    s = respond(s, { selected: ['1'] });
    expect(zone(s, 0, 'shield')).toBe(shields.length);
    const top = s.players[0].zones.shield.find((x) => !shields.includes(x))!;
    expect(s.cards[top].faceUp).toBe(true);
    expect(s.cards[top].under).toHaveLength(1);
  });

  it('相手のカードを表向きにして、持ち主のシールド1つの上に置く。離れる時、かわりに表向きのシールドを墓地に置く', () => {
    let s = newGame();
    const foe = put(s, 1, C.vanilla.id, 'battle');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: put(s, 0, C.bury.id, 'hand') });
    expect(s.cards[foe]).toMatchObject({ zone: 'shield', faceUp: true });
    expect(s.cards[foe].under).toHaveLength(1);
    expect(zone(s, 1, 'shield')).toBe(5);
    // 自分のクリーチャーが破壊される時、かわりにその表向きのカードを墓地に置く
    put(s, 0, C.guard.id, 'battle');
    const victim = put(s, 0, C.vanilla.id, 'battle');
    s = runTask(s, { kind: 'leave', iid: victim, to: 'graveyard', cause: 'destroy' });
    s = respond(s, { accept: true });
    expect(s.cards[victim].zone).toBe('battle');
    expect(s.cards[foe].zone).toBe('graveyard');
    // 下にあったシールドが、そのままシールドとして残る
    expect(zone(s, 1, 'shield')).toBe(5);
  });

  it('相手のクリーチャーは出たターン、自分を攻撃できない', () => {
    const s = newGame();
    put(s, 0, C.fresh.id, 'battle');
    const foe = put(s, 1, C.vanilla.id, 'battle');
    expect(keywords(s, reg, foe).cannotAttackPlayers).toBeFalsy();
    s.cards[foe].enteredTurn = s.turn;
    expect(keywords(s, reg, foe).cannotAttackPlayers).toBe(true);
  });

  it('CRY-S-MAX進化：負ける時・離れる時、かわりにシールドを墓地に置ける', () => {
    let s = newGame();
    const cry = put(s, 0, C.cry.id, 'battle');
    const shields = zone(s, 0, 'shield');
    new Ctx(s, reg).gameOver(1, 'テスト');
    expect(s.winner).toBeNull();
    expect(zone(s, 0, 'shield')).toBe(shields - 1);
    // 自分の表向きのカードが3枚以上あれば、破壊するかシールドを墓地に置くかを選ぶ
    const others = [put(s, 0, C.vanilla.id, 'battle'), put(s, 0, C.vanilla.id, 'battle'), put(s, 0, C.big.id, 'battle')];
    s = runTask(s, { kind: 'leave', iid: cry, to: 'graveyard', cause: 'destroy' });
    s = respond(s, { accept: true });
    expect(s.pending).toMatchObject({ kind: 'chooseMode' });
    s = respond(s, { selected: ['1'] });
    expect(s.cards[cry].zone).toBe('battle');
    expect(zone(s, 0, 'shield')).toBe(shields - 2);
    // 表向きのカードを破壊する方：このクリーチャー以外の3枚が破壊される
    s = runTask(s, { kind: 'leave', iid: cry, to: 'graveyard', cause: 'destroy' });
    s = respond(s, { accept: true });
    s = respond(s, { selected: ['0'] });
    expect(s.cards[cry].zone).toBe('battle');
    expect(others.map((x) => s.cards[x].zone)).toEqual(['graveyard', 'graveyard', 'graveyard']);
  });

  it('ファイナル革命：革命チェンジで出た時だけ、各ターン1回、コストの合計が6以下になるように出す', () => {
    let s = newGame();
    // 山札の上4枚：多色（コスト3）を3枚と単色1枚
    const deck = s.players[0].zones.deck;
    const tops = [put(s, 0, C.multi.id, 'deck'), put(s, 0, C.multi.id, 'deck'), put(s, 0, C.multi.id, 'deck'), put(s, 0, C.vanilla.id, 'deck')];
    for (const t of tops) deck.splice(deck.indexOf(t), 1);
    deck.push(...tops);
    // 革命チェンジ以外で出た時は何もしない
    s = runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.finalRev.id, 'hand') });
    expect(s.pending).toBeNull();
    s = runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.finalRev.id, 'hand'), byRevolution: true });
    expect(s.pending).toMatchObject({ kind: 'selectCards' });
    s = respond(s, { selected: tops.slice(0, 3) });
    // 3枚選んでも、コストの合計が6以下になる2枚だけ出る
    expect(tops.slice(0, 3).filter((t) => s.cards[t].zone === 'battle')).toHaveLength(2);
    // 同じターンの2回目は使えない
    s = runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.finalRev.id, 'hand'), byRevolution: true });
    expect(s.pending).toBeNull();
  });
});
});
