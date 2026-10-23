import type { KeyboardEvent } from 'react';

export interface TabDef { id: string; label: string }
export function Tabs({ tabs, value, onChange, label }: { tabs: TabDef[]; value: string; onChange: (id: string) => void; label: string }) {
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    onChange(n.id);
    (document.getElementById(`tab-${n.id}`) as HTMLElement | null)?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t, i) => (
        <button key={t.id} id={`tab-${t.id}`} role="tab" aria-selected={value === t.id} tabIndex={value === t.id ? 0 : -1}
          className={`tab${value === t.id ? ' is-active' : ''}`} onClick={() => onChange(t.id)} onKeyDown={(e) => onKey(e, i)}>{t.label}</button>
      ))}
    </div>
  );
}
