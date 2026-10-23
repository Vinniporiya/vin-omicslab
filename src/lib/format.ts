const SUP: Record<string, string> = { '-': '\u207b', '0': '\u2070', '1': '\u00b9', '2': '\u00b2', '3': '\u00b3', '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079' };
export const fmtP = (p: number): string => {
  if (p >= 0.001) return p.toFixed(3);
  const [m, e] = p.toExponential(1).split('e');
  return `${m} \u00d7 10${String(Number(e)).split('').map((c) => SUP[c] ?? c).join('')}`;
};
export const fmtNum = (v: number, d = 2): string => (Number.isFinite(v) ? v.toFixed(d) : 'n/a');
export const pct = (v: number, d = 1): string => `${(v * 100).toFixed(d)}%`;
export const thousands = (n: number): string => n.toLocaleString('en-US');
