/** Small, dependency-free statistics library. Numerical Recipes-style special functions. */

export function lgamma(x: number): number {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function betacf(a: number, b: number, x: number): number {
  const FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < 3e-12) break;
  }
  return h;
}

/** Regularised incomplete beta function I_x(a, b). */
export function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Two-sided p-value for a t statistic with (possibly fractional) df. */
export function tTwoSidedP(t: number, df: number): number {
  if (!isFinite(t) || df <= 0) return 1;
  return betai(df / 2, 0.5, df / (df + t * t));
}

export const mean = (a: ArrayLike<number>): number => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : NaN; };
export function variance(a: ArrayLike<number>): number {
  const n = a.length; if (n < 2) return NaN;
  const m = mean(a); let s = 0; for (let i = 0; i < n; i++) s += (a[i] - m) ** 2;
  return s / (n - 1);
}
export const sd = (a: ArrayLike<number>): number => Math.sqrt(variance(a));

export interface TTest { diff: number; t: number; df: number; p: number; meanA: number; meanB: number }
/** Welch two-sample t-test (B minus A). */
export function welch(a: number[], b: number[]): TTest {
  const ma = mean(a), mb = mean(b), va = variance(a), vb = variance(b);
  const sa = va / a.length, sb = vb / b.length;
  const se = Math.sqrt(sa + sb);
  if (!isFinite(se) || se === 0) return { diff: mb - ma, t: 0, df: NaN, p: 1, meanA: ma, meanB: mb };
  const t = (mb - ma) / se;
  const df = (sa + sb) ** 2 / ((sa * sa) / (a.length - 1) + (sb * sb) / (b.length - 1));
  return { diff: mb - ma, t, df, p: tTwoSidedP(t, df), meanA: ma, meanB: mb };
}

/** Benjamini-Hochberg adjusted p-values (input order preserved). */
export function bh(p: number[]): number[] {
  const n = p.length;
  const idx = p.map((_, i) => i).sort((i, j) => p[i] - p[j]);
  const out = new Array<number>(n);
  let prev = 1;
  for (let r = n - 1; r >= 0; r--) {
    const i = idx[r];
    prev = Math.min(prev, (p[i] * n) / (r + 1));
    out[i] = Math.min(1, prev);
  }
  return out;
}

const logChoose = (n: number, k: number): number => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
/** One-sided hypergeometric enrichment P(X >= k): population N, K successes in population, n draws. */
export function hypergeomUpper(k: number, N: number, K: number, n: number): number {
  let p = 0;
  for (let x = k; x <= Math.min(K, n); x++) p += Math.exp(logChoose(K, x) + logChoose(N - K, n - x) - logChoose(N, n));
  return Math.min(1, p);
}

export const logit = (p: number): number => Math.log(p / (1 - p));
export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/** FNV-1a 32-bit hash over a string; used for fingerprints and result hashes (not cryptographic). */
export function fnv(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
