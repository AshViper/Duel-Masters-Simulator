import { CARD_TYPES, CARD_TYPE_LABEL, CIVILIZATIONS, CIV_LABEL, type CardDefinition } from '../../core/cards/types';
import type { CardQuery } from '../../core/cards/registry';
import { CIV_COLOR } from './CardView';

/** カード検索フォーム（デッキ構築・図鑑で共用） */
export function CardFilter({ q, onChange, cards, full }: { q: CardQuery; onChange: (q: CardQuery) => void; cards: CardDefinition[]; full?: boolean }) {
  const sets = [...new Set(cards.map((c) => c.set).filter(Boolean))] as string[];
  const rarities = [...new Set(cards.map((c) => c.rarity).filter(Boolean))] as string[];
  const toggleCiv = (c: (typeof CIVILIZATIONS)[number]) => {
    const cur = q.civilizations ?? [];
    onChange({ ...q, civilizations: cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c] });
  };
  const num = (v: string) => (v === '' ? undefined : Number(v));
  return (
    <div className="filter">
      <input placeholder="カード名" value={q.name ?? ''} onChange={(e) => onChange({ ...q, name: e.target.value })} data-testid="search-name" />
      <input placeholder="テキスト・能力" value={q.text ?? ''} onChange={(e) => onChange({ ...q, text: e.target.value })} />
      <input placeholder="種族" value={q.race ?? ''} onChange={(e) => onChange({ ...q, race: e.target.value })} />
      <div className="civ-toggles">
        {CIVILIZATIONS.map((c) => (
          <button
            key={c}
            className={'civ-btn' + (q.civilizations?.includes(c) ? ' on' : '')}
            style={{ ['--c' as string]: CIV_COLOR[c] }}
            onClick={() => toggleCiv(c)}
          >
            {CIV_LABEL[c]}
          </button>
        ))}
      </div>
      <div className="row">
        <label>
          コスト
          <input type="number" min={0} className="num" value={q.costMin ?? ''} onChange={(e) => onChange({ ...q, costMin: num(e.target.value) })} />〜
          <input type="number" min={0} className="num" value={q.costMax ?? ''} onChange={(e) => onChange({ ...q, costMax: num(e.target.value) })} />
        </label>
        <select value={q.types?.[0] ?? ''} onChange={(e) => onChange({ ...q, types: e.target.value ? [e.target.value as (typeof CARD_TYPES)[number]] : [] })}>
          <option value="">全タイプ</option>
          {CARD_TYPES.map((t) => (
            <option key={t} value={t}>{CARD_TYPE_LABEL[t]}</option>
          ))}
        </select>
      </div>
      {full && (
        <div className="row">
          <select value={q.set ?? ''} onChange={(e) => onChange({ ...q, set: e.target.value || undefined })}>
            <option value="">全収録パック</option>
            {sets.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={q.rarity ?? ''} onChange={(e) => onChange({ ...q, rarity: e.target.value || undefined })}>
            <option value="">全レアリティ</option>
            {rarities.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}
      <button className="link" onClick={() => onChange({})}>条件をクリア</button>
    </div>
  );
}
