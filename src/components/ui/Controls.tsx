export function Select<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <label className="field"><span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
    </label>
  );
}
export function Segmented<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="field"><span id={`seg-${label}`}>{label}</span>
      <div className="segmented" role="group" aria-labelledby={`seg-${label}`}>
        {options.map((o) => <button key={o.value} type="button" className={value === o.value ? 'is-active' : ''} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>)}
      </div>
    </div>
  );
}
