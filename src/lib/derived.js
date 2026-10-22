import { H } from './constants';
import { N, hrs } from './format';
import { B_, DONE, P_, R_, isDone, refs, sIdx } from './lifecycle';
import { CUR } from './session';
import DOCS from '../data/documentTypes.json';
import STAGES from '../data/stages.json';

/* ---------- derived ---------- */
export const slaH = (db, k) => N((db.sla || {})[k]) || STAGES[sIdx(k)].sla;

export function slaOf(db, c) {
  if (isDone(c)) return null;
  const st = STAGES[c.stage];
  let start = c.stageStart;
  if (st.k === 'cd1' && c.v.c_sub_at && c.v.c_status !== 'Approved') start = c.v.c_sub_at;
  if (st.k === 'boe' && c.v.b_sub_at) start = c.v.b_sub_at;
  if (st.k === 'decl' && c.sub !== 'review') return null;
  if (st.k === 'insp' && c.v.a_when) start = Math.max(c.stageStart, Math.min(c.v.a_when, Date.now()));
  const el = Math.max(0, (Date.now() - start) / H),
    sla = slaH(db, st.k),
    pct = el / sla;
  return {
    el,
    sla,
    pct,
    start,
    cls: pct >= 1 ? 'bad' : pct >= 0.75 ? 'warn' : 'ok',
    label: pct >= 1 ? `SLA breached by ${hrs(el - sla)}` : pct >= 0.75 ? `${hrs(sla - el)} left` : 'Within SLA',
  };
}

export const openExc = (db, c) => db.exc.filter((e) => e.ccrn === c.id && e.status !== 'Closed');

export const prodView = () => CUR.role === 'producer' || CUR.role === 'checker';

export const maskedStatus = (db, c) => {
  if (isDone(c)) return null;
  const e = openExc(db, c);
  const k = STAGES[c.stage].k;
  if (
    e.some((x) => x.type === 'Quantity Mismatch') ||
    (c.hold && c.sub !== 'retest' && k === 'assay' && !e.some((x) => x.type === 'Assay Outside Tolerance'))
  )
    return 'Inspection Under Review';
  if (c.sub === 'attention' || c.sub === 'retest' || e.some((x) => x.type === 'Assay Outside Tolerance'))
    return 'Quality Verification Under Review';
  if (c.hold) return 'Under MMCZ Review';
  return null;
};

export function riskOf(db, c) {
  if (prodView()) return null;
  const e = openExc(db, c);
  if (c.hold)
    return {
      lvl: 'High',
      tone: 'bad',
      text: 'On hold',
    };
  if (e.some((x) => x.sev === 'High'))
    return {
      lvl: 'High',
      tone: 'bad',
      text: 'High risk',
    };
  const s = slaOf(db, c);
  if (e.length || (s && s.cls === 'bad'))
    return {
      lvl: 'Medium',
      tone: 'warn',
      text: 'Attention',
    };
  return null;
}

export function docState(c, k) {
  const R = refs(c),
    p = P_(c);
  switch (k) {
    case 'evr':
      return c.v.evr_at
        ? {
            st: 'Approved',
            no: R.evr,
            at: c.v.evr_at,
            src: 'MMCZ Laboratory',
            ver: 1,
          }
        : {
            st: c.stage >= 3 ? 'In progress' : 'Not started',
            no: R.evr,
            src: 'MMCZ Laboratory',
          };
    case 'inv':
      return c.v.n_no
        ? {
            st: 'Issued',
            no: c.v.n_no,
            at: c.v.n_date,
            src: 'Minera ERP',
            ver: 1,
          }
        : {
            st: c.stage >= 4 ? 'Pending' : 'Not started',
            no: '—',
            src: 'Minera ERP',
          };
    case 'cd1':
      return c.v.c_status === 'Approved'
        ? {
            st: 'Approved',
            no: c.v.c_no,
            at: c.v.c_dec_at,
            src: 'RBZ CEPECS',
            ver: 1,
          }
        : {
            st: c.v.c_status ? 'With RBZ' : 'Not started',
            no: c.v.c_no || '—',
            at: c.v.c_sub_at,
            src: 'RBZ CEPECS',
          };
    case 'boe':
      return c.v.b_status === 'Released'
        ? {
            st: 'Approved',
            no: c.v.b_no,
            at: c.v.b_rel_at,
            src: 'ZIMRA ASYCUDA',
            ver: 1,
          }
        : {
            st: c.v.b_status ? 'With ZIMRA' : 'Not started',
            no: c.v.b_no || '—',
            at: c.v.b_sub_at,
            src: 'ZIMRA ASYCUDA',
          };
    case 'pl':
      return c.docs.pl
        ? {
            st: 'Uploaded',
            no: R.pl,
            at: c.docs.pl.at,
            src: 'Producer',
            ver: c.docs.pl.ver || 1,
          }
        : {
            st: 'Missing',
            no: '—',
            src: 'Producer',
          };
    case 'lic':
      return {
        st: new Date(p.licexp) > new Date() ? 'Valid' : 'Expired',
        no: p.lic,
        at: new Date(p.licIssued).getTime(),
        src: 'MMCZ Licensing',
        ver: 1,
        exp: p.licexp,
      };
    case 'coo':
      return c.docs.coo
        ? {
            st: 'Uploaded',
            no: R.coo,
            at: c.docs.coo.at,
            src: 'Producer · ZNCC',
            ver: 1,
          }
        : {
            st: c.stage >= 7 ? 'Missing' : 'Not started',
            no: '—',
            src: 'Producer · ZNCC',
          };
    case 'cn':
      return c.stage >= 7
        ? {
            st: 'Issued',
            no: R.cn,
            at: (c.v.b_rel_at || c.stageStart) + 20 * 6e4,
            src: R_(c).transporter,
            ver: 1,
          }
        : {
            st: 'Not started',
            no: '—',
            src: 'Transporter',
          };
  }
}

export const DOC_OK = ['Approved', 'Issued', 'Uploaded', 'Valid'];

export const readiness = (c) => {
  const s = DOCS.map((d) => [d[0], docState(c, d[0])]);
  return {
    done: s.filter((x) => DOC_OK.includes(x[1].st)).length,
    tot: s.length,
    missing: s.filter((x) => !DOC_OK.includes(x[1].st)).map((x) => x[0]),
  };
};

export const progressOf = (c) => Math.round((Math.min(c.stage, DONE) / DONE) * 100);

/* plain-language current status per consignment */
export function statusOf(db, c) {
  if (isDone(c))
    return {
      t: 'Released to customer',
      tone: 'ok',
    };
  if (prodView()) {
    const m = maskedStatus(db, c);
    if (m)
      return {
        t: m,
        tone: 'warn',
      };
  }
  if (c.hold)
    return {
      t: 'On hold · ' + (c.sub === 'retest' ? 're-test' : 'review'),
      tone: 'bad',
    };
  const k = STAGES[c.stage].k;
  const s = slaOf(db, c);
  const late = s && s.cls === 'bad';
  const m = {
    decl: {
      draft: 'Draft',
      review: 'Awaiting producer approval',
      returned: 'Returned for correction',
    },
    req: prodView()
      ? {
          '': 'Inspection Requested · awaiting MMCZ scheduling',
          draft: 'Inspection Requested · awaiting MMCZ scheduling',
        }
      : {
          '': 'Awaiting inspector assignment',
          draft: 'Awaiting inspector assignment',
        },
    insp: {
      scheduled: 'Inspection scheduled',
      inprogress: 'Inspection in progress',
    },
    assay: prodView()
      ? {
          received: 'Inspection Completed · assay verification pending',
          results: 'Assay verification in progress',
          evr: 'Assay verification in progress',
        }
      : {
          received: 'Samples at laboratory',
          results: 'Results ready for review',
          attention: 'Outside tolerance',
          evr: 'EVR awaiting approval',
          retest: 'Re-test in progress',
        },
    inv: {
      ready: 'Ready for invoice',
      erp: 'Processing in Minera ERP',
    },
    cd1: {
      draft: 'CD1 to be submitted',
      submitted: 'With RBZ · ' + (c.v.c_status || 'Under Review'),
    },
    boe: {
      draft: 'BOE to be submitted',
      submitted: 'With ZIMRA · assessment',
    },
    clr: {
      readiness: 'Export readiness check',
    },
    rel: {
      pack: 'Ready for document release',
    },
  };
  const t = (m[k] || {})[c.sub] || STAGES[c.stage].name;
  const tone =
    late || c.sub === 'attention'
      ? 'bad'
      : ['returned'].includes(c.sub)
        ? 'warn'
        : k === 'clr' && readiness(c).done < 8
          ? 'warn'
          : 'info';
  return {
    t: late ? t + ' · SLA breached' : t,
    tone,
  };
}

/* who acts next */
export function nextOwner(c) {
  if (isDone(c))
    return {
      who: B_(c).short + ' / ' + B_(c).agent,
      what: 'Download released documents',
    };
  const k = STAGES[c.stage].k;
  if (prodView() && !['decl', 'clr'].includes(k))
    return {
      who: STAGES[c.stage].team,
      what: {
        req: 'Schedule inspection',
        insp: 'Field inspection',
        assay: 'Assay verification',
        inv: 'Issue invoice',
        cd1: 'CD1 with RBZ',
        boe: 'Bill of Entry with ZIMRA',
        rel: 'Release export documents',
      }[k],
    };
  return {
    decl:
      c.sub === 'review'
        ? {
            who: P_(c).checker + ' (Producer Checker)',
            what: 'Approve & submit to MMCZ',
          }
        : {
            who: P_(c).contact + ' (Producer)',
            what: 'Submit declaration for review',
          },
    req: {
      who: 'Nyasha Dube (Inspectorate Coordinator)',
      what: 'Assign an inspector',
    },
    insp: {
      who: (c.v.a_insp || 'Field inspector') + ' (Field Inspector)',
      what: 'Complete inspection on site',
    },
    assay: {
      who: 'Chipo Mapfumo (Laboratory)',
      what:
        c.sub === 'evr'
          ? 'Approve EVR'
          : c.sub === 'attention'
            ? 'Decide: re-test or escalate'
            : 'Test samples and submit result',
    },
    inv: {
      who: 'Tapiwa Sibanda (Finance)',
      what: c.sub === 'erp' ? 'Confirm invoice from Minera ERP' : 'Send invoice request to Minera ERP',
    },
    cd1: {
      who: c.sub === 'submitted' ? 'RBZ (via CEPECS) · Farai Mlambo monitors' : 'Farai Mlambo (Compliance)',
      what: c.sub === 'submitted' ? 'RBZ decision on CD1' : 'Submit CD1 to RBZ CEPECS',
    },
    boe: {
      who: c.sub === 'submitted' ? 'ZIMRA (via ASYCUDA) · Farai Mlambo monitors' : 'Farai Mlambo (Compliance)',
      what: c.sub === 'submitted' ? 'ZIMRA assessment' : 'Submit BOE to ZIMRA ASYCUDA',
    },
    clr:
      readiness(c).done < 8
        ? {
            who: P_(c).contact + ' (Producer)',
            what:
              'Upload ' +
              readiness(c)
                .missing.map((k) => DOCS.find((d) => d[0] === k)[1])
                .join(', '),
          }
        : {
            who: 'Farai Mlambo (Compliance)',
            what: 'Approve export release',
          },
    rel: {
      who: 'Farai Mlambo (Compliance)',
      what: 'Generate final digital export pack',
    },
  }[k];
}

/* visibility */
export function visible(db, s) {
  const all = Object.values(db.cons);
  if (!s) return all;
  const p = s.persona;
  if (p === 'producer' || p === 'checker') return all.filter((c) => c.pid === s.org);
  if (p === 'customer') return all.filter((c) => c.buyer === s.org && c.stage >= 1);
  return all;
}

export const custStage = (c) =>
  isDone(c)
    ? 'Documents released'
    : [
        'Preparing for inspection',
        'Preparing for inspection',
        'Inspection',
        'Quality verification',
        'Export documentation',
        'Export documentation',
        'Export documentation',
        'Customs clearance',
        'Release pending',
      ][c.stage];
