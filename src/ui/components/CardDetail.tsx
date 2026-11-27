import type { ReactNode } from 'react';
import { CARD_TYPE_LABEL, CIV_LABEL, SUPPORT_LABEL, type CardDefinition } from '../../core/cards/types';
import { CardView } from './CardView';
import { faceKind, OFFICIAL_PREFIX } from '../../core/cards/officialConvert';
import { parseAbilityText } from '../../core/cards/textParser';

/** 公式カードのうち、自動処理できず手動で処理する能力の行 */
export function manualLines(card: CardDefinition): string[] {
  if (!card.id.startsWith(OFFICIAL_PREFIX) || card.support === 'full') return [];
  return [...parseAbilityText(card.text, faceKind(card)).manualLines, ...(card.twin ? parseAbilityText(card.twin.text, 'spell').manualLines : [])];
}

export function Modal({ children, onClose, wide }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={'modal' + (wide ? ' wide' : '')} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="閉じる">
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

/** カードの情報（画像・名前・数値・能力テキスト）。モーダルと常時表示のパネルで共用 */
function CardInfoBody({ card, actions, panel }: { card: CardDefinition; actions?: ReactNode; panel?: boolean }) {
  const manual = manualLines(card);
  return (
    <div className={panel ? 'card-info' : 'detail'}>
      <CardView card={card} size="lg" />
      <div className="detail-info">
        <h2>{card.name}</h2>
        {panel && actions && <div className="detail-actions">{actions}</div>}
        <table>
          <tbody>
            <tr><th>コスト</th><td>{card.cost}</td></tr>
            <tr><th>文明</th><td>{card.civilizations.map((c) => CIV_LABEL[c]).join(' / ')}</td></tr>
            <tr><th>タイプ</th><td>{card.typeLabel ?? CARD_TYPE_LABEL[card.type]}</td></tr>
            {card.races.length > 0 && <tr><th>種族</th><td>{card.races.join(' / ')}</td></tr>}
            {card.power !== undefined && <tr><th>パワー</th><td>{card.power}</td></tr>}
            {card.set && <tr><th>収録</th><td>{card.set}</td></tr>}
            {card.rarity && <tr><th>レアリティ</th><td>{card.rarity}</td></tr>}
            <tr><th>処理</th><td className={`support-${card.support}`}>{SUPPORT_LABEL[card.support]}</td></tr>
          </tbody>
        </table>
        <pre className="detail-text">{card.text}</pre>
        {card.twin && (
          <>
            <h3>呪文側：{card.twin.name}（コスト{card.twin.cost}・{card.twin.civilizations.map((c) => CIV_LABEL[c]).join(' / ')}）</h3>
            <pre className="detail-text">{card.twin.text}</pre>
          </>
        )}
        {manual.length > 0 && (
          <div className="detail-manual">
            <h3>手動で処理する能力</h3>
            <p className="muted">次の能力は自動では読み取れませんでした。対戦中にこの能力の場面になると判断パネルで止まるので、手動で処理してから「処理完了」を押してください（タイミングの分からない能力は、盤面の右クリックメニューで処理してください）。</p>
            <ul>{manual.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </div>
        )}
        {!panel && actions && <div className="detail-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function CardDetail({ card, onClose, actions }: { card: CardDefinition; onClose: () => void; actions?: ReactNode }) {
  return (
    <Modal onClose={onClose}>
      <CardInfoBody card={card} actions={actions} />
    </Modal>
  );
}

/** 画面の右に常に置くカード詳細のパネル（デッキ構築・図鑑） */
export function CardInfoPanel({ card, actions, hint }: { card: CardDefinition | null; actions?: ReactNode; hint?: ReactNode }) {
  return (
    <aside className="info-panel panel" data-testid="card-info">
      <div className="panel-title">
        CARD INFO<span>カード詳細</span>
      </div>
      {card ? (
        <CardInfoBody card={card} actions={actions} panel />
      ) : (
        <div className="info-empty">
          <div className="info-empty-mark">◆</div>
          {hint ?? <p>カードにマウスを乗せるか、クリックすると詳細がここに出ます。</p>}
        </div>
      )}
    </aside>
  );
}
