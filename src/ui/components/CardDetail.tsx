import type { ReactNode } from 'react';
import { CARD_TYPE_LABEL, CIV_LABEL, SUPPORT_LABEL, type CardDefinition } from '../../core/cards/types';
import { CardView } from './CardView';

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

export function CardDetail({ card, onClose, actions }: { card: CardDefinition; onClose: () => void; actions?: ReactNode }) {
  return (
    <Modal onClose={onClose}>
      <div className="detail">
        <CardView card={card} size="lg" />
        <div className="detail-info">
          <h2>{card.name}</h2>
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
          {actions && <div className="detail-actions">{actions}</div>}
        </div>
      </div>
    </Modal>
  );
}
