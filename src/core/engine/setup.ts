import type { CardRegistry } from '../cards/registry';
import type { ZoneName } from '../cards/types';
import { Ctx } from './engine';
import { nextRandom } from './rng';
import { DEFAULT_CONFIG, type GameConfig, type GameState, type PlayerId, type PlayerState } from './types';

export interface PlayerSetup {
  name: string;
  /** cardId の配列（展開済みデッキ） */
  deck: string[];
  isCpu?: boolean;
}

export interface NewGameOptions {
  players: [PlayerSetup, PlayerSetup];
  seed?: number;
  /** 省略時はランダムに決める */
  firstPlayer?: PlayerId;
  config?: Partial<GameConfig>;
}

const emptyZones = (): Record<ZoneName, string[]> => ({
  deck: [], hand: [], mana: [], shield: [], battle: [], graveyard: [], hyperspatial: [], grZone: [], seal: [],
});

/** ゲーム開始：デッキ読込 → シャッフル → シールド配置 → 初期手札 → 先攻決定 → ターン開始 */
export function createGame(opts: NewGameOptions, reg: CardRegistry): GameState {
  const config = { ...DEFAULT_CONFIG, ...opts.config };
  const players = opts.players.map((p, i): PlayerState => ({
    id: i as PlayerId,
    name: p.name,
    isCpu: !!p.isCpu,
    zones: emptyZones(),
    chargedThisTurn: false,
    extraTurns: 0,
  })) as [PlayerState, PlayerState];

  const state: GameState = {
    config,
    rngState: (opts.seed ?? Math.floor(Math.random() * 2 ** 31)) | 0,
    nextIid: 1,
    turn: 1,
    activePlayer: 0,
    firstPlayer: 0,
    phase: 'start',
    players,
    cards: {},
    queue: [],
    pending: null,
    combat: null,
    turnStatics: [],
    log: [],
    winner: null,
    gameOverReason: null,
    lastEvents: [],
  };

  opts.players.forEach((p, i) => {
    for (const cardId of p.deck) {
      if (!reg[cardId]) throw new Error(`未登録のカード: ${cardId}`);
      const iid = `c${state.nextIid++}`;
      state.cards[iid] = { iid, cardId, owner: i as PlayerId, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
      players[i].zones.deck.push(iid);
    }
  });

  const ctx = new Ctx(state, reg);
  for (const p of [0, 1] as PlayerId[]) {
    // サイキック・クリーチャーは山札に入れず、超次元ゾーンに置く
    for (const iid of players[p].zones.deck.filter((x) => reg[state.cards[x].cardId].psychic)) ctx.moveCard(iid, 'hyperspatial');
    // GRクリーチャーは山札に入れず、シャッフルして超GRゾーンに置く
    const gr = players[p].zones.deck.filter((x) => /GR/.test(reg[state.cards[x].cardId].typeLabel ?? ''));
    for (let k = gr.length - 1; k > 0; k--) {
      const j = Math.floor(ctx.random() * (k + 1));
      [gr[k], gr[j]] = [gr[j], gr[k]];
    }
    for (const iid of gr) ctx.moveCard(iid, 'grZone');
    // 禁断の鼓動：山札から出してバトルゾーンに置き、シャッフル後に山札の上から封印を付ける
    const forbidden = players[p].zones.deck.filter((iid) => reg[state.cards[iid].cardId].forbidden);
    for (const iid of forbidden) {
      ctx.moveCard(iid, 'battle');
      state.cards[iid].enteredTurn = 0;
    }
    ctx.shuffle(p);
    for (const iid of forbidden) {
      const n = reg[state.cards[iid].cardId].forbidden!.seals;
      for (let i = 0; i < n; i++) ctx.sealCard(iid, true);
      ctx.log(`${reg[state.cards[iid].cardId].name} を封印${state.cards[iid].seals?.length ?? 0}つ付けてバトルゾーンに置いた`, p);
    }
    for (let i = 0; i < config.initialShields; i++) {
      const top = ctx.topOfDeck(p);
      if (top) ctx.moveCard(top, 'shield');
    }
    ctx.draw(p, config.initialHand);
  }
  let first = opts.firstPlayer;
  if (first === undefined) {
    const [v, next] = nextRandom(state.rngState);
    state.rngState = next;
    first = v < 0.5 ? 0 : 1;
  }
  state.firstPlayer = first;
  state.activePlayer = first;
  ctx.log(`先攻：${players[first].name}`, null);
  ctx.enterPhase(config.phaseOrder[0]);
  state.lastEvents = [];
  return state;
}
