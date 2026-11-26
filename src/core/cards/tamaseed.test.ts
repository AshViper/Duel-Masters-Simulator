// タマシード：呪文でもクリーチャーでもない独自の種類
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { battleCards, canPlay } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { applyParsedEffects, convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import type { ZoneName } from './types';

const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '', race: 'テスト', abilities: [] as string[] };
const seed = convertOfficialCard({ id: 't-seed', detailUrl: '', faces: [{ ...base, name: 'テストのタマシード', type: 'タマシード', civilization: '火', cost: '2', power: '' }] });
const creatureSeed = convertOfficialCard({ id: 't-cseed', detailUrl: '', faces: [{ ...base, name: 'クリーチャーのタマシード', type: 'タマシード/クリーチャー', civilization: '火', cost: '2', power: '2000' }] });
const fire = convertOfficialCard({ id: 't-fire', detailUrl: '', faces: [{ ...base, name: '火のマナ', type: 'クリーチャー', civilization: '火', cost: '1', power: '1000' }] });
const reg = buildRegistry([...SAMPLE_CARDS, seed, creatureSeed, fire]);

function put(s: GameState, player: PlayerId, cardId: string, zone: ZoneName): string {
  const iid = `t${s.nextIid++}`;
  s.cards[iid] = { iid, cardId, owner: player, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
  s.players[player].zones.deck.unshift(iid);
  new Ctx(s, reg).moveCard(iid, zone);
  return iid;
}

describe('タマシード', () => {
  it('呪文でもクリーチャーでもない種類として読む（タマシード/クリーチャーはクリーチャー）', () => {
    expect(seed).toMatchObject({ type: 'tamaseed', power: undefined });
    expect(creatureSeed.type).toBe('creature');
    // 以前の版で呪文として保存したタマシードも直す
    expect(applyParsedEffects({ ...seed, type: 'spell' }).type).toBe('tamaseed');
  });

  it('使うとバトルゾーンに残り、クリーチャーとしては数えない', () => {
    let s = createGame({ players: [{ name: 'A', deck: Array(40).fill('S01-043') }, { name: 'B', deck: Array(40).fill('S01-043') }], seed: 1, firstPlayer: 0 }, reg);
    put(s, 0, fire.id, 'mana');
    put(s, 0, fire.id, 'mana');
    const iid = put(s, 0, seed.id, 'hand');
    expect(canPlay(s, reg, 0, iid)).toBe(true);
    const r = applyAction(s, { type: 'PLAY_CARD', player: 0, iid }, reg);
    expect(r.error).toBeUndefined();
    s = r.state;
    expect(s.cards[iid].zone).toBe('battle');
    expect(battleCards(s, reg, 0)).not.toContain(iid);
  });
});
