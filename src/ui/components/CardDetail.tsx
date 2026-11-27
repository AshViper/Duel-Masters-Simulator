import { useMemo, useState, type ReactNode } from 'react';
import { useCachedImage } from '../../db/imageCache';
import { useApp } from '../../store/appStore';
import { FOIL_LABEL, useCardLooks, type Foil } from '../cardLooks';
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
        <CardLookEditor card={card} />
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

/** 見た目の選択肢の1枚（画像のサムネイル） */
function ArtThumb({ imgKey, label, on, onPick, onDelete }: { imgKey?: string; label: string; on: boolean; onPick: () => void; onDelete?: () => void }) {
  const url = useCachedImage(imgKey);
  return (
    <div className={'look-art' + (on ? ' on' : '')} role="button" title={label} onClick={onPick} data-testid="look-art">
      {url ? <img src={url} alt={label} draggable={false} /> : <span>枠</span>}
      <span className="look-tag">{label}</span>
      {onDelete && (
        <button
          className="look-del"
          title="この画像を削除"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('この画像を削除しますか？')) onDelete();
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

/**
 * カードの見た目（カード名ごと）：イラストの版を選ぶ・自分の画像を足す・キラ加工をかける。
 * 同名で別IDのカード（公式の別イラスト版）を保存してあれば、その絵も選べる。
 */
function CardLookEditor({ card }: { card: CardDefinition }) {
  const cards = useApp((s) => s.cards);
  const look = useCardLooks((s) => s.looks[card.name]);
  const { setArt, setFoil, addUpload, removeUpload } = useCardLooks.getState();
  const [err, setErr] = useState('');
  // 同名カードの画像（自分自身を含む。同じ画像は1つにまとめる）
  const variants = useMemo(() => {
    const seen = new Set<string>();
    const out: { key: string; label: string }[] = [];
    for (const c of [card, ...cards.filter((c) => c.name === card.name && c.id !== card.id)]) {
      if (!c.imageRef || seen.has(c.imageRef)) continue;
      seen.add(c.imageRef);
      out.push({ key: c.imageRef, label: [c.rarity, c.set?.replace(/^公式 /, '')].filter(Boolean).join(' ') || c.id.replace(/^dm:/, '') });
    }
    return out;
  }, [cards, card]);
  const art = look?.art;
  const isOn = (key: string | undefined) => (key === card.imageRef ? !art || art === key : art === key);
  return (
    <div className="look-editor" data-testid="look-editor">
      <h3>見た目（この名前のカードすべてに反映）</h3>
      <div className="look-arts">
        {!card.imageRef && <ArtThumb label="標準" on={!art} onPick={() => setArt(card.name, undefined)} />}
        {variants.map((v) => (
          <ArtThumb key={v.key} imgKey={v.key} label={v.key === card.imageRef ? `標準 ${v.label}` : v.label} on={isOn(v.key)} onPick={() => setArt(card.name, v.key === card.imageRef ? undefined : v.key)} />
        ))}
        {(look?.uploads ?? []).map((k, i) => (
          <ArtThumb key={k} imgKey={k} label={`自分の画像${i + 1}`} on={art === k} onPick={() => setArt(card.name, k)} onDelete={() => void removeUpload(card.name, k)} />
        ))}
        <label className="look-art add" title="自分の画像を追加（この端末に保存）">
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void addUpload(card.name, f).then(() => setErr(''), (x: Error) => setErr(x.message));
            }}
          />
          ＋
        </label>
      </div>
      {err && <small className="ng">{err}</small>}
      <div className="look-foils">
        <span className="muted small">キラ加工</span>
        {(Object.keys(FOIL_LABEL) as Foil[]).map((f) => (
          <button key={f} className={(look?.foil ?? 'none') === f ? 'on' : ''} onClick={() => setFoil(card.name, f)}>
            {FOIL_LABEL[f]}
          </button>
        ))}
      </div>
    </div>
  );
}
