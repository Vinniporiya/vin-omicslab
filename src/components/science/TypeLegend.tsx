import type { OmicsDataset } from '../../data/dataset';

export function TypeLegend({ ds, isolate, onIsolate, counts }: { ds: OmicsDataset; isolate?: number | null; onIsolate?: (i: number | null) => void; counts?: number[] }) {
  return (
    <ul className="legend" aria-label="Cell types">
      {ds.cellTypes.map((c, i) => {
        const on = isolate === i;
        const inner = <><span className="swatch" style={{ background: c.color }} />{c.short}{counts && <span className="muted" style={{ marginLeft: 6 }}>{counts[i]}</span>}</>;
        return <li key={c.id}>{onIsolate
          ? <button type="button" className={`legend-btn${on ? ' is-active' : ''}`} aria-pressed={on} onClick={() => onIsolate(on ? null : i)} title={`${c.label}. Click to isolate.`}>{inner}</button>
          : <span className="legend-item" title={c.label}>{inner}</span>}</li>;
      })}
    </ul>
  );
}
