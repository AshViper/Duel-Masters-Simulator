import { useState } from 'react';
import { SLEEVE_PRESETS, STD_SLEEVE, useSleeveCss, useSleeves } from '../sleeves';

/** スリーブの見本1枚 */
function Swatch({ id, label, on, onPick, onDelete }: { id: string | undefined; label: string; on: boolean; onPick: () => void; onDelete?: () => void }) {
  const current = useSleeves((s) => s.current);
  const css = useSleeveCss(id ?? current);
  return (
    <div className={'sleeve-swatch' + (on ? ' on' : '')} role="button" title={label} onClick={onPick} style={{ backgroundImage: css }} data-testid="sleeve-swatch">
      <span className="look-tag">{label}</span>
      {onDelete && (
        <button
          className="look-del"
          title="この画像を削除"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('このスリーブ画像を削除しますか？（使っているデッキは標準に戻ります）')) onDelete();
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

/**
 * スリーブを選ぶ。value が undefined は「全体の標準に従う」（inherit を渡した時だけ選べる）。
 * 追加した画像はどのデッキからも選べる共通の置き場に入る。
 */
export function SleevePicker({ value, onChange, inherit }: { value: string | undefined; onChange: (id: string | undefined) => void; inherit?: boolean }) {
  const { uploads, addUpload, removeUpload } = useSleeves();
  const [err, setErr] = useState('');
  return (
    <div className="sleeve-picker">
      <div className="sleeve-grid">
        {inherit && <Swatch id={undefined} label="全体の標準" on={value === undefined} onPick={() => onChange(undefined)} />}
        <Swatch id={STD_SLEEVE} label="標準" on={value === STD_SLEEVE} onPick={() => onChange(STD_SLEEVE)} />
        {SLEEVE_PRESETS.map((p) => (
          <Swatch key={p.id} id={p.id} label={p.label} on={value === p.id} onPick={() => onChange(p.id)} />
        ))}
        {uploads.map((k, i) => (
          <Swatch key={k} id={k} label={`画像${i + 1}`} on={value === k} onPick={() => onChange(k)} onDelete={() => void removeUpload(k).then(() => value === k && onChange(inherit ? undefined : STD_SLEEVE))} />
        ))}
        <label className="sleeve-swatch add" title="好きな画像をスリーブにする（この端末に保存）">
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f)
                void addUpload(f).then(
                  (key) => {
                    setErr('');
                    onChange(key);
                  },
                  (x: Error) => setErr(x.message),
                );
            }}
          />
          ＋
        </label>
      </div>
      {err && <small className="ng">{err}</small>}
    </div>
  );
}
