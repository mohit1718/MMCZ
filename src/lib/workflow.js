import { DAY } from './constants';
import { fmtD, fmtDT, hash, nf, pad, rng, usd } from './format';
import { B_, M, P_, QTY_TOL, R_, assayFails, calcInv, qtyOf, rateOf, refs, variance } from './lifecycle';
import PERSONAS from '../data/personas.json';

/* ---------- workflow effects (shared by seed and live actions) ---------- */
export function tl(c, t, text, by, ext, tone) {
  c.tl.push({
    at: t,
    text,
    by: by || 'System',
    ext: ext ? 1 : 0,
    tone: tone || '',
  });
}

export function aud(c, t, by, action, detail) {
  c.audit.push({
    at: t,
    by,
    action,
    detail: detail || '',
  });
}

export function msg(db, c, t, to, subject, body, ch) {
  db.msgs.push({
    id: 'm' + hash(c.id + subject + t) + Math.floor(Math.random() * 1e4),
    at: t,
    to,
    ccrn: c.id,
    subject,
    body,
    ch: ch || 'Email + in-app',
    read: 0,
  });
}

export function advance(c, t) {
  c.stage++;
  c.stageStart = t;
  c.sub = '';
}

export const EX = [];

// exception sink filled by effects that need db
export const FX = {
  submitDecl(db, c, t, by) {
    c.sub = 'review';
    c.v.d_sub_at = t;
    c.v.k_note = '';
    tl(c, t, 'Declaration submitted for internal review', by, 1);
    aud(c, t, by, 'Declaration submitted for review');
    msg(
      db,
      c,
      t,
      ['checker'],
      `Declaration ready for your approval – ${c.id}`,
      `${by} submitted the export declaration for ${nf(c.v.d_qty)} MT ${M(c).name} to ${B_(c).name}. Review and submit to MMCZ.`,
    );
  },
  returnDecl(db, c, t, by, reason) {
    c.sub = 'returned';
    c.v.k_note = reason;
    tl(c, t, 'Declaration returned for correction', by, 1, 'warn');
    aud(c, t, by, 'Returned for correction', reason);
    msg(db, c, t, ['producer'], `Declaration returned for correction – ${c.id}`, `${by}: ${reason}`);
  },
  approveDecl(db, c, t, by) {
    const R = refs(c);
    c.v.k_by = by;
    c.v.k_at = t;
    c.v.ir_no = R.ir;
    advance(c, t);
    tl(c, t, 'Declaration approved and submitted to MMCZ', by, 1, 'ok');
    tl(c, t + 2 * 6e4, `Inspection request ${R.ir} created`, 'System', 1);
    aud(c, t, by, 'Approved & submitted to MMCZ', R.ir);
    msg(
      db,
      c,
      t,
      ['coordinator'],
      `New inspection request – ${c.id}`,
      `${P_(c).name} requests inspection of ${nf(c.v.d_qty)} MT ${M(c).name} at ${P_(c).mine} on ${fmtD(c.v.d_insp)}.`,
    );
  },
  assign(db, c, t, by, a) {
    const R = refs(c);
    Object.assign(c.v, {
      a_insp: a.inspector,
      a_when: a.when,
      a_instr: a.instr || '',
      a_by: by,
      a_at: t,
      insp_no: R.insp,
      a_priority: a.priority || 'Normal',
    });
    advance(c, t);
    c.sub = 'scheduled';
    tl(c, t, `Assigned to ${a.inspector} for ${fmtDT(a.when)}`, by, 0);
    tl(c, t, `Inspection scheduled for ${fmtDT(a.when)}`, 'MMCZ Inspectorate', 1);
    aud(c, t, by, 'Inspector assigned', `${a.inspector} · ${fmtDT(a.when)}`);
    msg(
      db,
      c,
      t + 6e4,
      ['inspector'],
      `Inspection assigned – ${c.id}`,
      `You are assigned to inspect ${nf(c.v.d_qty)} MT ${M(c).name} at ${P_(c).mine}, ${fmtDT(a.when)}.${a.instr ? '\n\nInstructions: ' + a.instr : ''}`,
    );
    msg(
      db,
      c,
      t + 6e4,
      ['producer'],
      `Inspection scheduled – ${c.id}`,
      `MMCZ inspector ${a.inspector} will inspect your consignment at ${P_(c).mine} on ${fmtDT(a.when)}. Please have weighbridge tickets and stockpile tags ready.`,
    );
  },
  startInsp(db, c, t, by) {
    c.sub = 'inprogress';
    c.v.i_start = t;
    tl(c, t, 'Inspection started on site', by, 0);
    aud(c, t, by, 'Inspection started');
  },
  inspect(db, c, t, by, d) {
    const R = refs(c);
    const n = d.n || 2;
    c.samples = [];
    for (let i = 1; i <= n; i++)
      c.samples.push({
        id: `${c.id}-S${pad(i, 2)}`,
        seal: `SL-${(hash(c.id + i) % 90000) + 10000}`,
        qty: c.code === 'LI' ? '2 kg' : '5 kg',
        at: t - (n - i + 1) * 35 * 6e4,
      });
    Object.assign(c.v, {
      i_qty: d.qty,
      i_method: d.method,
      i_n: n,
      i_photos: d.photos,
      i_gps: P_(c).gps,
      i_result: d.result,
      i_remarks: d.remarks || '',
      i_at: t,
      i_by: by,
      i_tickets: d.tickets || '',
      i_docs: d.docs || 'Weighbridge tickets',
    });
    advance(c, t);
    c.sub = 'received';
    tl(c, t, 'Inspection completed', by, 1, 'ok');
    tl(c, t + 40 * 6e4, `${n} samples sent to MMCZ Laboratory`, by, 0);
    aud(c, t, by, 'Inspection submitted', `Verified ${nf(d.qty)} MT · ${d.result}`);
    msg(
      db,
      c,
      t,
      ['lab'],
      `Samples dispatched – ${c.id}`,
      `${n} sealed samples (${c.samples.map((s) => s.id.slice(-3)).join(', ')}) are on the way to the laboratory.`,
    );
    if (d.result === 'Hold / Exception' && !(variance(c) || {}).out) {
      c.hold = {
        reason: 'Inspector placed the consignment on hold: ' + (d.remarks || 'see inspection remarks'),
        at: t,
        by,
      };
      const e0 = newExc(db, c, t, {
        type: 'Inspection Hold',
        sev: 'High',
        owner: 'Inspectorate',
        ownerName: PERSONAS.coordinator.user,
        expected: 'Inspection pass',
        observed: 'Hold raised on site',
        variance: '—',
        impact: 0,
        sources: [`Field inspection ${R.insp}`],
        summary: d.remarks || 'The field inspector raised a hold during the site inspection.',
      });
      tl(c, t + 6e4, `Exception ${e0.id} raised from field inspection`, 'System', 0, 'bad');
    }
    const vr = variance(c);
    if (vr && vr.out) {
      const e = newExc(db, c, t, {
        type: 'Quantity Mismatch',
        sev: 'High',
        owner: 'Inspectorate',
        ownerName: 'Nyasha Dube',
        expected: `${nf(vr.d)} MT declared`,
        observed: `${nf(vr.v)} MT verified`,
        variance: `${nf(vr.diff)} MT / ${vr.pct.toFixed(1)}%`,
        impact: Math.abs(vr.diff) * rateOf(c),
        sources: ['Producer declaration', `Weighbridge tickets, ${P_(c).mine}`, `Field inspection ${R.insp}`],
        summary: `Verified quantity is ${Math.abs(vr.pct).toFixed(1)}% below the declared quantity; tolerance is ±${QTY_TOL}%.`,
      });
      tl(c, t + 6e4, `Revenue assurance exception ${e.id} raised automatically`, 'System', 0, 'bad');
    }
  },
  lims(db, c, t, by) {
    const r = rng(hash(c.id + 'L'));
    M(c).template.forEach(([k, , , d, tol]) => {
      const a =
        c.assay[k] ||
        (c.assay[k] = {
          d,
          t: '',
        });
      if (a.t === '' || a.t == null) {
        const ov = (c.v._ov || {})[k];
        a.t = ov != null ? ov : +(d + (r() - 0.5) * tol * 0.9).toFixed(d < 1 ? 3 : d < 20 ? 2 : 1);
      }
    });
    c.v.lims_at = t;
    const f = assayFails(c);
    c.sub = f.length ? 'attention' : 'results';
    tl(c, t, 'Assay results received from LIMS', by || 'MMCZ Laboratory (LIMS)', 0, f.length ? 'bad' : '');
    aud(c, t, 'LIMS', 'Results read', `${M(c).template.length} parameters`);
    if (f.length) {
      const x = f[0];
      const e = newExc(db, c, t, {
        type: 'Assay Outside Tolerance',
        sev: 'High',
        owner: 'Laboratory',
        ownerName: 'Chipo Mapfumo',
        expected: `${x.lab} ${x.d}${x.u === '%' ? '%' : ' ' + x.u} ± ${x.tol}`,
        observed: `${x.lab} ${x.t}${x.u === '%' ? '%' : ' ' + x.u}`,
        variance: `${x.dev > 0 ? '+' : ''}${(+x.dev).toFixed(2)} ${x.u === '%' ? 'pp' : x.u}`,
        impact: Math.round((qtyOf(c) * rateOf(c) * Math.abs(x.dev)) / x.d),
        sources: [
          'Producer declared grade',
          'MMCZ Laboratory (LIMS)',
          `Samples ${c.samples.map((s) => s.id.slice(-3)).join(', ')}`,
        ],
        summary: `${x.lab} is outside the contract tolerance. Grade-linked value is at risk until re-tested.`,
      });
      tl(c, t + 6e4, `Revenue assurance exception ${e.id} raised automatically`, 'System', 0, 'bad');
    }
  },
  submitResult(db, c, t, by) {
    c.sub = 'evr';
    c.v.r_at = t;
    c.v.r_by = by;
    tl(c, t, 'Assay result submitted for EVR approval', by, 0);
    aud(c, t, by, 'Assay result submitted');
  },
  retest(db, c, t, by, reason) {
    c.sub = 'retest';
    c.hold = {
      reason: reason || 'Re-test of retained samples requested',
      at: t,
      by,
    };
    tl(c, t, 'Consignment on hold: re-test of retained samples requested', by, 0, 'warn');
    aud(c, t, by, 'Re-test requested', reason);
    db.exc
      .filter((e) => e.ccrn === c.id && e.type === 'Assay Outside Tolerance' && e.status !== 'Closed')
      .forEach((e) => {
        e.status = 'Re-test requested';
        e.tl.push({
          at: t,
          by,
          text: 'Re-test of retained samples requested; consignment held',
        });
      });
    msg(
      db,
      c,
      t,
      ['producer'],
      `Quality hold – ${c.id}`,
      `A grade parameter is outside tolerance. MMCZ Laboratory is re-testing retained samples. No action is needed from you yet.`,
    );
  },
  approveEvr(db, c, t, by) {
    const R = refs(c);
    Object.assign(c.v, {
      evr_no: R.evr,
      evr_at: t,
      evr_by: by,
    });
    advance(c, t);
    c.sub = 'ready';
    tl(c, t, `Export Verification Report ${R.evr} approved`, by, 1, 'ok');
    aud(c, t, by, 'EVR approved', R.evr);
    msg(
      db,
      c,
      t,
      ['finance'],
      `Ready for invoicing – ${c.id}`,
      `EVR ${R.evr} approved. Verified quantity ${nf(qtyOf(c))} MT is ready for invoicing.`,
    );
    msg(
      db,
      c,
      t,
      ['producer'],
      `Export Verification Report approved – ${c.id}`,
      `Your EVR ${R.evr} has been approved. MMCZ Finance will now issue the invoice.`,
    );
  },
  sendInv(db, c, t, by) {
    c.v.n_status = 'Processing';
    c.v.n_req_at = t;
    c.v.n_req_by = by;
    c.sub = 'erp';
    tl(c, t, 'Invoice request sent to Minera ERP', by, 0);
    aud(c, t, by, 'Invoice request sent', 'Minera ERP');
  },
  postInv(db, c, t) {
    const R = refs(c),
      x = calcInv(c);
    Object.assign(c.v, {
      n_no: R.inv,
      n_date: t,
      n_amount: x.total,
      n_gross: x.gross,
      n_status: 'Posted',
    });
    advance(c, t);
    c.sub = 'draft';
    tl(c, t, `Invoice ${R.inv} issued`, 'Minera ERP', 1, 'ok');
    aud(c, t, 'Minera ERP', 'Invoice posted', `${R.inv} · ${usd(x.total)}`);
    msg(
      db,
      c,
      t,
      ['producer'],
      `Invoice ${R.inv} issued – ${c.id}`,
      `Invoice ${R.inv} for ${usd(x.total)} has been issued for ${nf(x.q)} MT ${M(c).name}.`,
    );
    msg(
      db,
      c,
      t,
      ['compliance'],
      `Ready for CD1 – ${c.id}`,
      `Invoice ${R.inv} is posted. Prepare the CD1 application.`,
    );
  },
  subCd1(db, c, t, by) {
    const R = refs(c);
    Object.assign(c.v, {
      c_no: R.cd1,
      c_ref: R.cep,
      c_status: 'Under Review',
      c_sub_at: t,
      c_by: by,
      c_value: c.v.c_value || calcInv(c).gross,
    });
    c.sub = 'submitted';
    tl(c, t, `CD1 ${R.cd1} submitted to RBZ CEPECS`, by, 1);
    aud(c, t, by, 'CD1 submitted', R.cep);
  },
  okCd1(db, c, t) {
    c.v.c_status = 'Approved';
    c.v.c_dec_at = t;
    advance(c, t);
    c.sub = 'draft';
    tl(c, t, 'CD1 approved by RBZ', `RBZ CEPECS`, 1, 'ok');
    aud(c, t, 'RBZ CEPECS', 'CD1 approved', c.v.c_ref);
    db.exc
      .filter((e) => e.ccrn === c.id && e.type === 'Overdue Approval' && e.status !== 'Closed')
      .forEach((e) => {
        e.status = 'Closed';
        e.resolution = 'RBZ approved the CD1.';
        e.tl.push({
          at: t,
          by: 'System',
          text: 'Closed automatically: CD1 approved by RBZ',
        });
      });
  },
  subBoe(db, c, t, by) {
    const R = refs(c);
    Object.assign(c.v, {
      b_no: R.boe,
      b_status: 'Submitted',
      b_sub_at: t,
      b_by: by,
    });
    c.sub = 'submitted';
    tl(c, t, `Bill of Entry ${R.boe} lodged with ZIMRA`, by, 1);
    aud(c, t, by, 'BOE submitted', R.boe);
  },
  okBoe(db, c, t) {
    Object.assign(c.v, {
      b_status: 'Released',
      b_rel_at: t,
      b_rem: 'Assessed and released. No physical examination required.',
    });
    advance(c, t);
    c.sub = 'readiness';
    tl(c, t, 'Bill of Entry assessed and released by ZIMRA', 'ZIMRA ASYCUDA', 1, 'ok');
    aud(c, t, 'ZIMRA ASYCUDA', 'BOE released', c.v.b_no);
    tl(c, t + 20 * 6e4, `Consignment note ${refs(c).cn} issued by transporter`, R_(c).transporter, 1);
    if (!c.docs.coo)
      msg(
        db,
        c,
        t,
        ['producer'],
        `Certificate of Origin required – ${c.id}`,
        `Export release is waiting for your Certificate of Origin. Upload it to complete the export pack.`,
      );
  },
  clear(db, c, t, by) {
    const R = refs(c);
    Object.assign(c.v, {
      x_at: t,
      x_by: by,
      x_exit: R.exit,
    });
    advance(c, t);
    c.sub = 'pack';
    tl(c, t, 'Export release approved', by, 1, 'ok');
    aud(c, t, by, 'Export release approved', R.exit);
  },
  pack(db, c, t, by) {
    const R = refs(c);
    Object.assign(c.v, {
      p_no: R.pack,
      p_at: t,
      p_by: by,
    });
    advance(c, t);
    tl(c, t, `Final digital export pack ${R.pack} generated`, by, 1, 'ok');
    tl(c, t + 6e4, `Documents released to ${B_(c).short} and ${B_(c).agent}`, by, 1, 'ok');
    aud(c, t, by, 'Export pack generated & released', R.pack);
    msg(
      db,
      c,
      t,
      ['customer'],
      `Export documents released – ${c.id}`,
      `The export pack ${R.pack} for ${nf(qtyOf(c))} MT ${M(c).name} is available in your shipment portal.`,
    );
    msg(
      db,
      c,
      t,
      ['producer'],
      `Export documents released – ${c.id}`,
      `MMCZ has released the final export pack ${R.pack}.`,
    );
  },
};

export function newExc(db, c, t, o) {
  const n = db.excSeq != null ? db.excSeq++ : 41 + db.exc.filter((e) => !e.seed).length;
  const id = 'RA-2026-' + pad(n, 4);
  const e = {
    id,
    ccrn: c.id,
    status: 'Open',
    created: t,
    due: t + 2 * DAY,
    notes: [],
    tl: [
      {
        at: t,
        by: 'System',
        text: 'Exception raised automatically',
      },
    ],
    ...o,
  };
  db.exc.unshift(e);
  return e;
}
