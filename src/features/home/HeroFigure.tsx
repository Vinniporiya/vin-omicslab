import { useState } from 'react';
import { useDataset } from '../../data/useDataset';
import { ScatterCanvas } from '../../viz/ScatterCanvas';
import { TypeLegend } from '../../components/science/TypeLegend';
import { DemoStamp } from '../../components/science/badges';
import { thousands } from '../../lib/format';

/** The one orchestrated moment on the page: simulated cells settle into their populations, then respond to hover and isolation. */
export function HeroFigure() {
  const ds = useDataset();
  const [iso, setIso] = useState<number | null>(null);
  if (!ds) return <div className="hero-fig hero-fig-loading" role="status">Simulating cells</div>;
  const L = ds.landscape;
  return (
    <figure className="hero-fig">
      <div className="hero-fig-head"><strong>Figure 1</strong><DemoStamp label="Illustrative, simulated" /></div>
      <ScatterCanvas x={L.x} y={L.y} color={(i) => ds.cellTypes[L.type[i]].color} alpha={(i) => (iso !== null && L.type[i] !== iso ? 0.06 : 0.82)} radius={2.2} aspect={0.74}
        animate axes={['UMAP 1', 'UMAP 2']} tooltip={(i) => `${ds.cellTypes[L.type[i]].label}\nDonor ${ds.donors[L.donor[i]].id} (${ds.donors[L.donor[i]].condition})`} ariaLabel="Simulated single-cell landscape of nine cell populations" />
      <TypeLegend ds={ds} isolate={iso} onIsolate={setIso} />
      <figcaption>Simulated single-cell landscape: {thousands(L.n)} cells from {ds.donors.length} donors in nine populations. Hover a cell, or select a population to isolate it. Illustrative data, not a real result.</figcaption>
    </figure>
  );
}
