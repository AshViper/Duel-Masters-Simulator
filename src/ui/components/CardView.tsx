import type { CSSProperties, DragEvent, MouseEvent, ReactNode } from 'react';
import { CARD_TYPE_LABEL, CIV_LABEL, type CardDefinition, type Civilization } from '../../core/cards/types';
import { useCachedImage } from '../../db/imageCache';

export const CIV_COLOR: Record<Civilization, string> = {
  light: '#f4d35e',
  water: '#4ea8ff',
  darkness: '#9b6bd6',
  fire: '#ff5a4e',
  nature: '#4cc26b',
  zero: '#b8c0cc',
};

export function civGradient(civs: Civilization[]): string {
  if (civs.length === 0) return CIV_COLOR.zero;
  if (civs.length === 1) return CIV_COLOR[civs[0]];
  const step = 100 / civs.length;
  return `linear-gradient(135deg, ${civs.map((c, i) => `${CIV_COLOR[c]} ${i * step}%, ${CIV_COLOR[c]} ${(i + 1) * step}%`).join(', ')})`;
}

/** xs: マナ・シールド / sm: 一覧 / fd: バトルゾーン / hd: 手札 / md・lg: 詳細 */
export type CardSize = 'xs' | 'sm' | 'fd' | 'hd' | 'md' | 'lg';

interface Props {
  card?: CardDefinition;
  faceDown?: boolean;
  tapped?: boolean;
  size?: CardSize;
  power?: number;
  /** 常在効果込みのコスト（元と違えば色付きで表示） */
  cost?: number;
  selected?: boolean;
  highlight?: 'target' | 'attacker' | 'playable' | null;
  badge?: ReactNode;
  onClick?: (e: MouseEvent) => void;
  onContextMenu?: (e: MouseEvent) => void;
  onHover?: (on: boolean) => void;
  draggable?: boolean;
  onDragStart?: (e: DragEvent) => void;
  title?: string;
  testId?: string;
  /** 封印などで無視されているカードを薄く表示する */
  dimmed?: boolean;
}

/** 画像がなくても読めるカード表示。文明ごとのアクセントカラー付き */
export function CardView({ card, faceDown, tapped, size = 'md', power, cost, selected, highlight, badge, onClick, onContextMenu, onHover, draggable, onDragStart, title, testId, dimmed }: Props) {
  const cls = ['card', `card-${size}`, tapped && 'tapped', dimmed && 'dimmed', selected && 'selected', highlight && `hl-${highlight}`, onClick && 'clickable'].filter(Boolean).join(' ');
  // 保存済みの画像（公式カードなど）。ブラウザ内の IndexedDB から読むので通信しない
  const cachedImg = useCachedImage(faceDown ? undefined : card?.imageRef);
  if (faceDown || !card) {
    return (
      <div className={cls + ' face-down'} onClick={onClick} onContextMenu={onContextMenu} title={title} data-testid={testId}>
        <div className="card-back-mark">◆</div>
        {badge}
      </div>
    );
  }
  const style = { '--civ': civGradient(card.civilizations), '--civ-solid': CIV_COLOR[card.civilizations[0] ?? 'zero'] } as CSSProperties;
  const shownPower = power ?? card.power;
  if (cachedImg) {
    const powerChanged = power !== undefined && card.power !== undefined && power !== card.power;
    const costChanged = cost !== undefined && cost !== card.cost;
    return (
      <div className={cls + ' has-image'} style={style} onClick={onClick} onContextMenu={onContextMenu} onMouseEnter={onHover && (() => onHover(true))} onMouseLeave={onHover && (() => onHover(false))} draggable={draggable} onDragStart={onDragStart} title={title ?? card.name} data-testid={testId}>
        <img className="card-full-img" src={cachedImg} alt={card.name} draggable={false} />
        {costChanged && <span className={'img-badge img-cost ' + (cost! < card.cost ? 'down' : 'up')}>{cost}</span>}
        {powerChanged && <span className={'img-badge img-power ' + (power! > card.power! ? 'up' : 'down')}>{power}</span>}
        {card.support !== 'full' && size !== 'xs' && <span className="img-badge img-manual" title="手動処理が必要な効果を含みます">手</span>}
        {badge}
      </div>
    );
  }
  return (
    <div className={cls} style={style} onClick={onClick} onContextMenu={onContextMenu} onMouseEnter={onHover && (() => onHover(true))} onMouseLeave={onHover && (() => onHover(false))} draggable={draggable} onDragStart={onDragStart} title={title ?? card.name} data-testid={testId}>
      <div className="card-frame">
        <div className="card-head">
          <span className={'card-cost' + (cost !== undefined && cost !== card.cost ? (cost < card.cost ? ' down' : ' up') : '')}>{cost ?? card.cost}</span>
          <span className="card-name">{card.name}</span>
        </div>
        {card.imageUrl ? <img className="card-img" src={card.imageUrl} alt="" draggable={false} /> : <div className="card-art">{card.civilizations.map((c) => CIV_LABEL[c]).join('/')}</div>}
        {(size === 'md' || size === 'lg') && (
          <>
            <div className="card-type">
              {card.typeLabel ?? CARD_TYPE_LABEL[card.type]}
              {card.races.length > 0 && ` / ${card.races.join('/')}`}
            </div>
            <div className="card-text">{card.text}</div>
          </>
        )}
        <div className="card-foot">
          {(card.keywords?.shieldTrigger || card.twin?.keywords?.shieldTrigger) && <span className="kw kw-st">S・T</span>}
          {card.twin && <span className="kw kw-twin" title={`ツインパクト：${card.twin.name}`}>T</span>}
          {card.keywords?.blocker && <span className="kw">B</span>}
          {card.support !== 'full' && <span className="kw kw-manual" title="手動処理が必要な効果を含みます">手</span>}
          {shownPower !== undefined && (
            <span className={'card-power' + (power !== undefined && card.power !== undefined && power !== card.power ? (power > card.power ? ' up' : ' down') : '')}>{shownPower}</span>
          )}
        </div>
      </div>
      {badge}
    </div>
  );
}
