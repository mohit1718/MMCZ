import { DAY, H, NOW0, YEAR } from '../lib/constants';
import { MON, at, dayAt, dd, fmtD, fmtDT, hash, pad, usd } from '../lib/format';
import { DONE, P_, refs, sIdx } from '../lib/lifecycle';
import { FX, aud, msg, tl } from '../lib/workflow';
import MINERALS from './minerals.json';
import PRODUCERS from './producers.json';
import STAGES from './stages.json';

/* ---------- seed: recurring, reconciled scenarios ---------- */
export const snapW = (t) => {
  const d = new Date(t);
  const h = d.getHours();
  if (h >= 18) {
    d.setHours(17, (d.getMinutes() % 45) + 5, 0, 0);
  } else if (h < 7) {
    d.setDate(d.getDate() - 1);
    d.setHours(17, (d.getMinutes() % 45) + 5, 0, 0);
  }
  return d.getTime();
};

export const hourUp = (t) => {
  let x = Math.ceil(t / H) * H;
  const d = new Date(x);
  if (d.getHours() >= 16) {
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    x = d.getTime();
  } else if (d.getHours() < 8) {
    d.setHours(9, 0, 0, 0);
    x = d.getTime();
  }
  return x;
};

export const DUR = {
  decl: 6,
  req: 5,
  insp: 27,
  assay: 30,
  inv: 3,
  cd1: 38,
  boe: 18,
  clr: 6,
  rel: 3,
};

export const STEPS = {
  decl: ['submitDecl', 'approveDecl'],
  req: ['assign'],
  insp: ['inspect'],
  assay: ['lims', 'submitResult', 'approveEvr'],
  inv: ['sendInv', 'postInv'],
  cd1: ['subCd1', 'okCd1'],
  boe: ['subBoe', 'okBoe'],
  clr: ['clear'],
  rel: ['pack'],
};

export const ACTOR = {
  submitDecl: (c) => P_(c).contact,
  approveDecl: (c) => P_(c).checker,
  assign: () => 'Nyasha Dube',
  inspect: (c) => c.v.a_insp || 'Tinashe Ndlovu',
  lims: () => 'MMCZ Laboratory (LIMS)',
  submitResult: () => 'Chipo Mapfumo',
  approveEvr: () => 'Chipo Mapfumo',
  sendInv: () => 'Tapiwa Sibanda',
  postInv: () => 'Minera ERP',
  subCd1: () => 'Farai Mlambo',
  okCd1: () => 'RBZ CEPECS',
  subBoe: () => 'Farai Mlambo',
  okBoe: () => 'ZIMRA ASYCUDA',
  clear: () => 'Farai Mlambo',
  pack: () => 'Farai Mlambo',
};

export function baseC(o) {
  const p = PRODUCERS[o.pid];
  const id = `MMCZ-${YEAR}-${p.code}-${pad(o.seq)}`;
  const c = {
    id,
    seq: o.seq,
    pid: o.pid,
    code: p.code,
    buyer: o.buyer || p.buyer,
    route: p.route,
    stage: 0,
    sub: 'draft',
    created: 0,
    stageStart: 0,
    hold: null,
    v: {},
    assay: {},
    samples: [],
    docs: {},
    tl: [],
    audit: [],
  };
  const m = MINERALS[p.code];
  Object.assign(c.v, {
    d_qty: o.qty,
    d_grade: m.grade,
    d_period: '',
    d_prod: Math.round((o.qty * 1.6) / 10) * 10,
    d_open: Math.round((o.qty * 0.55) / 10) * 10,
    d_dom: Math.round((o.qty * 0.12) / 10) * 10,
    d_contract: refs(c).contract,
    n_rate: m.rate,
    _ov: o.ov || {},
  });
  c.v.d_close_rec = c.v.d_prod + c.v.d_open - c.v.d_dom - o.qty;
  return c;
}

export function seedC(db, o) {
  const c = baseC(o);
  const si = sIdx(o.stage === 'done' ? null : o.stage);
  const cur = o.stage === 'done' ? DONE : si;
  // back-schedule stage starts
  const starts = [];
  let t = o.start >= 12 ? snapW(at(o.start)) : at(o.start);
  starts[cur] = t;
  for (let i = cur - 1; i >= 0; i--) {
    t = snapW(t - DUR[STAGES[i].k] * H - (hash(c.id + i) % 5) * 7 * 6e4);
    starts[i] = t;
  }
  c.created = starts[0] - 2 * H;
  c.stageStart = starts[0];
  const dispatch = o.dispatch != null ? dayAt(o.dispatch, 8) : starts[0] + 12 * DAY;
  Object.assign(c.v, {
    d_period: `${MON[dd(c.created).getMonth()]} ${YEAR}`,
    d_dispatch: dispatch,
    d_insp: o.inspDate != null ? dayAt(o.inspDate, 10) : starts[0] + 30 * H,
  });
  c.docs.pl = {
    at: c.created + H,
    by: P_(c).contact,
    file: `${refs(c).pl}.pdf`,
  };
  c.docs.auth = {
    at: c.created + H,
    by: P_(c).contact,
    file: `Export_authorisation_${P_(c).lic.replace(/\//g, '-')}.pdf`,
  };
  if (o.coo !== false)
    c.docs.coo = {
      at: c.created + H,
      by: P_(c).contact,
      file: `${refs(c).coo.replace(/\//g, '-')}.pdf`,
    };
  tl(c, c.created, 'Consignment created · ID issued', P_(c).contact, 1);
  aud(c, c.created, P_(c).contact, 'Consignment created', c.id);
  const run = (fx, tt, extra) => {
    const by = ACTOR[fx](c);
    FX[fx](db, c, tt, by, extra);
  };
  const extra = (fx) =>
    fx === 'assign'
      ? {
          inspector: o.insp || (c.code === 'LI' ? 'Tinashe Ndlovu' : 'Munyaradzi Zvobgo'),
          when: c.v.d_insp,
          instr: '',
        }
      : fx === 'inspect'
        ? {
            qty: o.ver || o.qty,
            method: 'Incremental grab sampling (ISO 4552)',
            n: 2,
            photos: 6,
            result: o.result || 'Pass',
            tickets: `${Math.round((o.ver || o.qty) / 24)} weighbridge tickets`,
            remarks: o.iremarks || 'Material stacked and tagged by lot. Seals applied to all sample bags.',
          }
        : undefined;
  for (let i = 0; i < cur; i++) {
    const k = STAGES[i].k;
    const st = STEPS[k];
    const s0 = starts[i],
      s1 = starts[i + 1] || s0 + DUR[k] * H;
    // assignment time sets inspection date for completed ones
    if (k === 'req') {
      c.v.d_insp = hourUp(s1 + 2 * H);
    }
    c.stage = i;
    c.stageStart = s0;
    let prev = s0;
    st.forEach((fx, j) => {
      let tt =
        j === st.length - 1
          ? s1
          : Math.min(s1 - 6e5, Math.max(prev + 12 * 6e4, snapW(s0 + ((s1 - s0) * (j + 1)) / (st.length + 0.5))));
      prev = tt;
      run(fx, tt, extra(fx));
    });
  }
  c.stage = cur;
  c.stageStart = starts[cur];
  if (cur < DONE) c.sub = o.sub || 'draft';
  (o.cur || []).forEach(([fx, hAgo, ex]) => {
    run(fx, Math.max(c.stageStart + 10 * 6e4, hAgo >= 12 ? snapW(at(hAgo)) : at(hAgo)), ex || extra(fx));
  });
  if (o.after) o.after(db, c);
  c.tl.sort((a, b) => a.at - b.at);
  db.cons[c.id] = c;
  return c;
}

export function seed() {
  const db = {
    cons: {},
    exc: [],
    msgs: [],
    session: null,
    route: {
      page: 'home',
    },
    integ: {
      erp: 'up',
      rbz: 'up',
      zimra: 'up',
      lims: 'up',
    },
    sla: {},
    rates: {},
    v: 4,
    notes: [],
    excBase: 0,
  };
  const S = (o) => seedC(db, o);
  // Scenario F — successful export (completed, released)
  S({
    seq: 861,
    pid: 'PRD-0031',
    qty: 1200,
    ver: 1199,
    stage: 'done',
    start: 52,
  });
  S({
    seq: 118,
    pid: 'PRD-0044',
    qty: 2100,
    ver: 2094,
    stage: 'done',
    start: 120,
  });
  // Scenario E — export blocked: Certificate of Origin missing
  S({
    seq: 869,
    pid: 'PRD-0031',
    qty: 1300,
    ver: 1296,
    stage: 'clr',
    start: 5,
    coo: false,
    sub: 'readiness',
  });
  // BOE with ZIMRA (has a closed invoice-vs-CD1 exception)
  S({
    seq: 120,
    pid: 'PRD-0012',
    qty: 4200,
    ver: 4188,
    stage: 'boe',
    start: 9,
    cur: [['subBoe', 6]],
  });
  // Scenario C — regulatory delay: CD1 with RBZ beyond SLA
  S({
    seq: 125,
    pid: 'PRD-0044',
    qty: 3000,
    ver: 2986,
    stage: 'cd1',
    start: 63,
    cur: [['subCd1', 61]],
  });
  // Gold concentrate: CD1 approved, Bill of Entry ready to lodge
  S({
    seq: 47,
    pid: 'PRD-0058',
    qty: 180,
    ver: 179.6,
    stage: 'boe',
    start: 4,
    sub: 'draft',
  });
  // Awaiting invoice
  S({
    seq: 870,
    pid: 'PRD-0031',
    qty: 1400,
    ver: 1397,
    stage: 'inv',
    start: 2,
    sub: 'ready',
  });
  // Scenario D — assay variance (Cr outside tolerance)
  S({
    seq: 124,
    pid: 'PRD-0012',
    qty: 3200,
    ver: 3195,
    stage: 'assay',
    start: 20,
    ov: {
      cr: 59.8,
    },
    sub: 'received',
    cur: [['lims', 3]],
  });
  // Scenario B — quantity mismatch (5,000 declared / 4,850 verified)
  S({
    seq: 123,
    pid: 'PRD-0012',
    qty: 5000,
    ver: 4850,
    result: 'Conditional',
    iremarks: 'Weighbridge total 4,850 MT across 202 tickets. Stockpile B lots 13–24 lighter than declared.',
    stage: 'assay',
    start: 26,
    sub: 'received',
  });
  // Field inspection scheduled today
  S({
    seq: 126,
    pid: 'PRD-0012',
    qty: 3200,
    stage: 'insp',
    start: 20,
    insp: 'Tinashe Ndlovu',
    sub: 'scheduled',
    after: (db, c) => {
      const old = fmtDT(c.v.a_when);
      c.v.a_when = NOW0 + 3 * H;
      const nw = fmtDT(c.v.a_when);
      c.tl.forEach((x) => {
        x.text = x.text.replace(old, nw);
      });
      db.msgs.forEach((m) => {
        if (m.ccrn === c.id) m.body = m.body.replace(old, nw);
      });
      c.audit.forEach((a) => {
        a.detail = a.detail.replace(old, nw);
      });
      c.v.q_open = {
        at: at(5),
        by: 'Tinashe Ndlovu',
        text: 'Please provide weighbridge tickets for Lots 13–24 before the site visit.',
      };
      tl(c, at(5), 'Inspector requested weighbridge tickets for Lots 13–24', 'Tinashe Ndlovu', 1, 'warn');
      msg(
        db,
        c,
        at(5),
        ['producer'],
        `Inspection query – ${c.id}`,
        'Tinashe Ndlovu (MMCZ Inspectorate): Please provide weighbridge tickets for Lots 13–24 before the site visit.',
      );
    },
  });
  // Awaiting inspector assignment
  S({
    seq: 871,
    pid: 'PRD-0031',
    qty: 1100,
    stage: 'req',
    start: 5,
    inspDate: 2,
  });
  S({
    seq: 127,
    pid: 'PRD-0044',
    qty: 2600,
    stage: 'req',
    start: 11,
    inspDate: 1,
    dispatch: 13,
  });
  // Producer checker queue
  S({
    seq: 874,
    pid: 'PRD-0031',
    qty: 900,
    stage: 'decl',
    start: 4,
    cur: [['submitDecl', 3]],
  });
  // Scenario A — happy path: draft ready to submit
  S({
    seq: 872,
    pid: 'PRD-0031',
    qty: 1250,
    stage: 'decl',
    start: 1,
    sub: 'draft',
    inspDate: 2,
    dispatch: 9,
  });
  // seeded exceptions not produced by effects
  const c120 = db.cons[`MMCZ-${YEAR}-FC-000120`],
    c125 = db.cons[`MMCZ-${YEAR}-FC-000125`],
    c869 = db.cons[`MMCZ-${YEAR}-LI-000869`],
    c127 = db.cons[`MMCZ-${YEAR}-FC-000127`];
  db.exc.push({
    seed: 1,
    id: 'RA-2026-0039',
    ccrn: c120.id,
    type: 'Invoice vs CD1 Mismatch',
    sev: 'Medium',
    status: 'Closed',
    owner: 'Compliance',
    ownerName: 'Farai Mlambo',
    created: c120.v.c_sub_at - 2 * H,
    due: c120.v.c_sub_at + DAY,
    expected: `${usd(4188 * 1650)} (invoice basis)`,
    observed: `${usd(4200 * 1650)} (draft CD1)`,
    variance: `${usd(12 * 1650)} / +0.3%`,
    impact: 12 * 1650,
    sources: ['Minera ERP invoice', refs(c120).inv, 'CD1 draft'],
    summary: 'Draft CD1 used the declared quantity instead of the verified quantity.',
    resolution: 'CD1 amended to the verified value before submission to RBZ.',
    notes: [
      {
        at: c120.v.c_sub_at - H,
        by: 'Farai Mlambo',
        text: 'Amended CD1 export value to US$ 6,910,200.00 (4,188 MT × US$ 1,650).',
      },
    ],
    tl: [
      {
        at: c120.v.c_sub_at - 2 * H,
        by: 'System',
        text: 'Mismatch detected during CD1 validation',
      },
      {
        at: c120.v.c_sub_at - H,
        by: 'Farai Mlambo',
        text: 'Amended and closed',
      },
    ],
  });
  db.exc.push({
    seed: 1,
    id: 'RA-2026-0043',
    ccrn: c125.id,
    type: 'Overdue Approval',
    sev: 'Medium',
    status: 'Open',
    owner: 'Compliance',
    ownerName: 'Farai Mlambo',
    created: c125.v.c_sub_at + 48 * H,
    due: at(-4),
    expected: 'RBZ decision within 48 h',
    observed: `${Math.round((NOW0 - c125.v.c_sub_at) / H)} h with RBZ, no decision`,
    variance: `+${Math.round((NOW0 - c125.v.c_sub_at) / H) - 48} h over SLA`,
    impact: 12400,
    sources: ['RBZ CEPECS status', 'SLA rule: CD1 48 h'],
    summary:
      'CD1 is with RBZ beyond the service level. Vessel cut-off at Durban is at risk; estimated demurrage US$ 12,400.',
    notes: [],
    tl: [
      {
        at: c125.v.c_sub_at + 48 * H,
        by: 'System',
        text: 'SLA breached; exception raised',
      },
    ],
  });
  db.exc.push({
    seed: 1,
    id: 'RA-2026-0044',
    ccrn: c869.id,
    type: 'Missing Document',
    sev: 'Medium',
    status: 'Open',
    owner: 'Producer',
    ownerName: 'Tendai Moyo (PLZ)',
    created: c869.stageStart + H,
    due: at(-14),
    expected: '8 of 8 mandatory documents',
    observed: '7 of 8 (Certificate of Origin missing)',
    variance: '1 document',
    impact: 0,
    sources: ['Document rules: export pack', 'Producer uploads'],
    summary: 'Export release is blocked until the Certificate of Origin is uploaded.',
    notes: [],
    tl: [
      {
        at: c869.stageStart + H,
        by: 'System',
        text: 'Export readiness check failed',
      },
    ],
  });
  db.exc.push({
    seed: 1,
    id: 'RA-2026-0045',
    ccrn: c127.id,
    type: 'Expiring Export Licence',
    sev: 'Low',
    status: 'Open',
    owner: 'Compliance',
    ownerName: 'Farai Mlambo',
    created: at(10),
    due: dayAt(5, 17),
    expected: `Licence valid to expected dispatch (${fmtD(c127.v.d_dispatch)})`,
    observed: `${PRODUCERS['PRD-0044'].lic} expires 24 Oct 2026`,
    variance: `${Math.round((c127.v.d_dispatch - new Date('2026-10-24').getTime()) / DAY)} days short`,
    impact: 0,
    sources: ['Producer master', 'Declaration dispatch date'],
    summary: 'Licence will expire before the planned dispatch date. Renewal is needed before BOE submission.',
    notes: [],
    tl: [
      {
        at: at(10),
        by: 'System',
        text: 'Licence expiry check raised a warning',
      },
    ],
  });
  db.exc.sort((a, b) => b.created - a.created);
  // ids for auto exceptions were assigned in creation order; renumber to keep RA-0041 = quantity mismatch, 0042 = assay variance
  db.exc
    .filter((e) => !e.seed)
    .forEach((e) => {
      e.id = e.type === 'Quantity Mismatch' ? 'RA-2026-0041' : 'RA-2026-0042';
    });
  db.excSeq = 46;
  Object.values(db.cons).forEach((c) =>
    c.tl.forEach((x) => {
      x.text = x.text.replace(/RA-2026-004[12]/, (m) => {
        const e = db.exc.find((e) => e.ccrn === c.id && !e.seed);
        return e ? e.id : m;
      });
    }),
  );
  // history of reads
  db.msgs.forEach((m) => {
    if (m.at < at(30)) m.read = 1;
  });
  return db;
}
