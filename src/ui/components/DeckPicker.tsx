import type { CardRegistry } from '../../core/cards/registry';
import { CIV_LABEL, type CardDefinition, type Civilization } from '../../core/cards/types';
import { deckCountLabel, isDeckLegal, type Deck } from '../../core/deck/rules';
import { useApp } from '../../store/appStore';
import { CardView, CIV_COLOR } from './CardView';

/** デッキの代表カード（指定したカード、なければコストが一番高いカード）と文明ごとの枚数 */
export function deckSummary(d: Deck, registry: CardRegistry) {
  const chosen = d.coverCardId && d.cards[d.coverCardId] ? registry[d.coverCardId] : undefined;
  let cover: CardDefinition | undefined;
  const civ = new Map<Civilization, number>();
  for (const [id, n] of Object.entries(d.cards)) {
    const c = registry[id];
    if (!c) continue;
    if (!cover || c.cost > cover.cost || (c.cost === cover.cost && !cover.imageRef && c.imageRef)) cover = c;
    for (const v of c.civilizations) civ.set(v, (civ.get(v) ?? 0) + n);
  }
  return { cover: chosen ?? cover, civ: [...civ.entries()].sort((a, b) => b[1] - a[1]) };
}

export function CivDots({ civ }: { civ: [Civilization, number][] }) {
  return (
    <span className="civ-dots">
      {civ.map(([c, n]) => (
        <span key={c} style={{ ['--c' as string]: CIV_COLOR[c] }} title={`${CIV_LABEL[c]} ${n}枚`}>
          {CIV_LABEL[c]}
          <b>{n}</b>
        </span>
      ))}
    </span>
  );
}

/**
 * デッキを選ぶパネル（対戦開始・オンライン）。上に選んだデッキを大きく、下にデッキの一覧。
 * 構築ルール違反のデッキも選べるが、赤で示す（開始ボタン側で止める）。
 */
export function DeckPicker({ label, value, onChange, disabled, testId, accent }: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  testId?: string;
  accent?: 'cyan' | 'red';
}) {
  const { decks, registry, settings } = useApp();
  const sel = decks.find((d) => d.id === value);
  const summary = sel ? deckSummary(sel, registry) : undefined;
  const legal = !!sel && isDeckLegal(sel, settings.format, registry);
  return (
    <section className={'panel deck-picker' + (accent === 'red' ? ' red' : '')} data-testid={testId}>
      <div className="panel-title">{label}</div>
      <div className="picker-hero">
        <div className="picker-cover">
          {summary?.cover ? <CardView card={summary.cover} size="md" /> : <span className="cover-empty">◆</span>}
        </div>
        <div className="picker-hero-info">
          <b className="picker-name">{sel?.name ?? 'デッキ未選択'}</b>
          {sel && (
            <>
              <span className="muted small">{deckCountLabel(sel, registry)}</span>
              <span className={'legal-chip ' + (legal ? 'ok' : 'ng')}>{legal ? '✓ 使用可能' : '✗ 構築ルール違反'}</span>
              {summary && <CivDots civ={summary.civ} />}
            </>
          )}
        </div>
      </div>
      <div className="picker-list" role="listbox" aria-label={label}>
        {decks.map((d) => {
          const ok = isDeckLegal(d, settings.format, registry);
          const { cover } = deckSummary(d, registry);
          return (
            <button
              key={d.id}
              role="option"
              aria-selected={d.id === value}
              className={'picker-row' + (d.id === value ? ' on' : '') + (ok ? '' : ' bad')}
              onClick={() => onChange(d.id)}
              disabled={disabled}
              data-testid={testId ? `${testId}-${d.id}` : undefined}
            >
              <span className="picker-row-cover">{cover ? <CardView card={cover} size="xs" /> : <span className="cover-empty">◆</span>}</span>
              <span className="picker-row-name">{d.name}</span>
              <span className="picker-row-count">{deckCountLabel(d, registry)}</span>
              <span className={ok ? 'ok' : 'ng'}>{ok ? '✓' : '✗'}</span>
            </button>
          );
        })}
        {decks.length === 0 && <p className="muted small pad">デッキがありません</p>}
      </div>
    </section>
  );
}
