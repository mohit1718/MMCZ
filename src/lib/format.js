import { H, NOW0 } from './constants';

/* ---------- helpers ---------- */
export const pad = (n, w = 6) => String(n).padStart(w, '0');

export const clone = (o) => JSON.parse(JSON.stringify(o));

export function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed) {
  let s = seed || 7;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

export const N = (x) => (x === '' || x == null || isNaN(+x) ? 0 : +x);

export const nf = (x, d) =>
  x === '' || x == null || isNaN(+x)
    ? '—'
    : (+x).toLocaleString('en-US', {
        minimumFractionDigits: d || 0,
        maximumFractionDigits: d == null ? 3 : d,
      });

export const money = (x) =>
  x === '' || x == null || isNaN(+x)
    ? '—'
    : (+x).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

export const usd = (x) => 'US$ ' + money(x);

export const usdc = (x) => {
  x = N(x);
  return x >= 1e6
    ? 'US$\u00a0' + (x / 1e6).toFixed(x >= 1e8 ? 0 : 1) + 'M'
    : x >= 1e3
      ? 'US$\u00a0' + (x / 1e3).toFixed(x >= 1e5 ? 0 : 1) + 'K'
      : 'US$\u00a0' + Math.round(x);
};

export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const dd = (t) => new Date(t);

export const fmtD = (t) => {
  if (!t) return '—';
  const d = dd(t);
  return isNaN(d) ? String(t) : `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
};

export const fmtT = (t) => {
  const d = dd(t);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};

export const fmtDT = (t) => (t ? `${fmtD(t)}, ${fmtT(t)}` : '—');

export const fmtDs = (t) => {
  if (!t) return '—';
  const d = dd(t);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
};

export const isoD = (t) => {
  const d = dd(t);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

export const sameDay = (a, b) => isoD(a) === isoD(b);

export const ago = (t) => {
  const m = Math.round((Date.now() - t) / 6e4);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 48) return h + ' h ago';
  return Math.round(h / 24) + ' days ago';
};

export const hrs = (h) =>
  h < 1
    ? Math.round(h * 60) + ' min'
    : h < 48
      ? Math.round(h * 10) / 10 + ' h'
      : Math.round((h / 24) * 10) / 10 + ' days';

export const initials = (n) =>
  String(n || '')
    .replace(/[^A-Za-z .]/g, '')
    .split(/[ .]+/)
    .filter(Boolean)
    .map((x) => x[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const at = (hAgo) => NOW0 - hAgo * H;

export const dayAt = (dOff, h, m = 0) => {
  const d = new Date(NOW0);
  d.setDate(d.getDate() + dOff);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};
