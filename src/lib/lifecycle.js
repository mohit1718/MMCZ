import { YEAR } from './constants';
import { N, hash, pad } from './format';
import BUYERS from '../data/buyers.json';
import MINERALS from '../data/minerals.json';
import PRODUCERS from '../data/producers.json';
import ROUTES from '../data/routes.json';
import STAGES from '../data/stages.json';

export const sIdx = (k) => STAGES.findIndex((s) => s.k === k);

export const DONE = STAGES.length;

export const isDone = (c) => c.stage >= DONE;

export const M = (c) => MINERALS[c.code];

export const P_ = (c) => PRODUCERS[c.pid];

export const B_ = (c) => BUYERS[c.buyer];

export const R_ = (c) => ROUTES[c.route];

export const QTY_TOL = 0.5;

// % quantity tolerance (Document Rules)
export const FEE = 1250,
  COMM = 0.875,
  VAT = 15.5;

export const verified = (c) => N(c.v.i_qty) || null;

export const qtyOf = (c) => verified(c) || N(c.v.d_qty);

export const rateOf = (c) => N(c.v.n_rate) || M(c).rate;

export const calcInv = (c) => {
  const q = qtyOf(c),
    r = rateOf(c),
    gross = q * r,
    comm = Math.round(gross * COMM) / 100,
    fee = FEE,
    vat = Math.round((comm + fee) * VAT) / 100;
  return {
    q,
    r,
    gross,
    comm,
    fee,
    vat,
    total: Math.round((comm + fee + vat) * 100) / 100,
  };
};

export const variance = (c) => {
  const d = N(c.v.d_qty),
    v = N(c.v.i_qty);
  if (!v) return null;
  return {
    d,
    v,
    diff: v - d,
    pct: ((v - d) / d) * 100,
    out: Math.abs(((v - d) / d) * 100) > QTY_TOL,
  };
};

export const assayRows = (c) =>
  M(c).template.map(([k, lab, u, d0, tol]) => {
    const a = c.assay[k] || {
      d: d0,
      t: '',
    };
    const has = a.t !== '' && a.t != null;
    const dev = has ? N(a.t) - N(a.d) : null;
    const st = !has ? 'pending' : Math.abs(dev) <= tol + 1e-9 ? (Math.abs(dev) > tol * 0.8 ? 'attn' : 'pass') : 'fail';
    return {
      k,
      lab,
      u,
      d: a.d,
      t: a.t,
      tol,
      dev,
      st,
    };
  });

export const assayFails = (c) => assayRows(c).filter((r) => r.st === 'fail');

export const refs = (c) => {
  const p = P_(c),
    r = R_(c),
    s = pad(c.seq),
    y = YEAR;
  return {
    ir: `IR-${y}-${s}`,
    insp: `INSP-${y}-${s}`,
    evr: `EVR-${y}-${s}`,
    inv: `INV-${y}-${10000 + c.seq}`,
    cd1: `CD1/${p.bankCode}/${y}/${pad(c.seq, 5)}`,
    cep: `CEP-${String(y).slice(2)}-${pad((hash(c.id + 'cep') % 90000) + 10000, 5)}`,
    boe: `C ${y}/${r.off}/${pad((hash(c.id + 'boe') % 90000) + 10000, 5)}`,
    pl: `PL-${p.short.split(' ')[0].toUpperCase()}-${y}-${pad(c.seq, 4)}`,
    coo: `ZNCC/COO/${y}/${pad(c.seq + 17000, 5)}`,
    cn: `CN-${r.tcode}-${y}-${pad(c.seq, 4)}`,
    exit: `EXIT-${r.off}-${pad((hash(c.id + 'x') % 9000) + 1000, 4)}`,
    pack: `XP-${y}-${s}`,
    contract: `${B_(c).contract}-${y}-${pad(c.seq % 1000, 3)}`,
  };
};
