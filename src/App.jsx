import React, { useState, useRef } from 'react';
import { Icon } from './components/Icon';
import { RespondModal, UploadModal } from './components/modals';
import { NotFound } from './components/NotFound';
import { ConfirmationModal } from './components/primitives';
import { baseC, seed } from './data/seed';
import { DocViewer, PACK_KEYS, PdfJob } from './documents/documents';
import { AppHeader } from './layout/AppHeader';
import { Composer, NotificationDrawer } from './layout/NotificationDrawer';
import { SideNavigation } from './layout/SideNavigation';
import { YEAR } from './lib/constants';
import { docState, nextOwner, readiness, slaOf, statusOf, visible } from './lib/derived';
import { saveFile } from './lib/download';
import { MON, N, clone, fmtD, fmtDT, isoD, nf, usd } from './lib/format';
import { B_, M, P_, calcInv, isDone, qtyOf, refs, sIdx, variance } from './lib/lifecycle';
import { userOf } from './lib/masterData';
import { NAV } from './lib/navigation';
import { CUR } from './lib/session';
import { loadDb, saveDb } from './lib/storage';
import { FX, aud, msg, tl } from './lib/workflow';
import { AdminPage } from './pages/admin';
import { CheckerHome, CheckerList, ReviewPage } from './pages/checker';
import { BoePage, Cd1Page, ClearancePage, ComplianceHome } from './pages/compliance';
import { C360 } from './pages/Consignment360';
import { CalendarPage, CoordinatorHome, InspectorsPage, RequestsPage } from './pages/coordinator';
import { CustomerShell, ShipmentPage, ShipmentsPage } from './pages/customer';
import { ExceptionDrawer, ExceptionsPage } from './pages/exceptions';
import { AnalyticsPage, ExecList, ExecutiveHome, ReportsPage } from './pages/executive';
import { FinanceHome, InvoicePage } from './pages/finance';
import { InspectionFlow, InspectorHome } from './pages/inspector';
import { AssayPage, LabHome } from './pages/lab';
import { Login } from './pages/Login';
import { ConsList, DeclarationPage, DocumentsPage, NotifPage, ProducerHome } from './pages/producer';
import DOCS from './data/documentTypes.json';
import SYS from './data/integrationSystems.json';
import PERSONAS from './data/personas.json';
import PRODUCERS from './data/producers.json';
import STAGES from './data/stages.json';

/* ================= APP ================= */
export const ALLOWED = {
  producer: ['declare', 'c360'],
  checker: ['review', 'c360'],
  coordinator: ['c360'],
  inspector: ['inspect', 'c360'],
  lab: ['assay', 'c360'],
  finance: ['invoice', 'c360'],
  compliance: ['cd1d', 'boed', 'clrd', 'c360'],
  executive: ['c360'],
  customer: ['ship'],
  admin: ['c360'],
};

export function successFor(fx, d, c) {
  const no = nextOwner(c);
  const v = variance(c);
  switch (fx) {
    case 'submitDecl':
      return {
        title: 'Declaration submitted for review',
        text: `${c.id} is with ${P_(c).checker} for approval.`,
        done: ['Declaration locked for editing', `${P_(c).checker} notified`],
        next: no,
      };
    case 'approveDecl':
      return {
        title: 'Approved and submitted to MMCZ',
        text: `Inspection request ${c.v.ir_no} created for ${fmtD(c.v.d_insp)} at ${P_(c).mine}.`,
        done: ['MMCZ Inspectorate notified', 'Producer notified'],
        next: no,
      };
    case 'assign':
      return {
        title: 'Inspection assigned',
        text: `Inspection assigned successfully to ${c.v.a_insp} for ${fmtDT(c.v.a_when)}. Producer and inspector have been notified.`,
        done: ['Inspector notified', 'Producer notified', 'Calendar updated'],
        next: {
          who: c.v.a_insp + ' (Field Inspector)',
          what: 'Inspector confirms and starts the inspection',
        },
      };
    case 'inspect': {
      const e = d.exc.find((x) => x.ccrn === c.id && x.type === 'Quantity Mismatch' && x.status !== 'Closed');
      return {
        title: 'Inspection completed',
        text: `Verified ${nf(c.v.i_qty)} MT against ${nf(c.v.d_qty)} MT declared (${v.pct > 0 ? '+' : ''}${v.pct.toFixed(1)}%). Result: ${c.v.i_result}.${e ? ` Revenue assurance exception ${e.id} raised for ${usd(e.impact)}.` : ''}`,
        done: [
          'Inspection completed',
          `${c.samples.length} samples sent to laboratory`,
          ...(e ? ['Exception raised'] : []),
        ],
        next: {
          who: 'MMCZ Laboratory · Chipo Mapfumo',
          what: 'Test samples and approve the EVR',
        },
      };
    }
    case 'approveEvr':
      return {
        title: `EVR ${c.v.evr_no} approved`,
        text: 'The Export Verification Report is generated and shared with the producer.',
        done: ['EVR generated', 'Finance notified', 'Producer notified'],
        next: no,
      };
    case 'postInv':
      return {
        title: `Invoice ${c.v.n_no} posted in Minera ERP`,
        text: `${usd(c.v.n_amount)} for ${nf(qtyOf(c))} MT. Minera ERP remains the system of record.`,
        done: ['Invoice number linked to consignment', 'Invoice PDF stored', 'Producer notified'],
        next: no,
      };
    case 'okCd1':
      return {
        title: 'CD1 approved by RBZ',
        text: `${c.v.c_no} · CEPECS ${c.v.c_ref} · ${usd(c.v.c_value)}`,
        done: ['Approved CD1 stored', 'Bill of Entry unlocked'],
        next: no,
      };
    case 'okBoe':
      return {
        title: 'Bill of Entry released by ZIMRA',
        text: `${c.v.b_no} assessed and released. No physical examination required.`,
        done: ['Customs record stored', `Consignment note ${refs(c).cn} issued`],
        next: no,
      };
    case 'clear':
      return {
        title: 'Export release approved',
        text: `Customs exit ${c.v.x_exit} recorded. The export pack is locked for release.`,
        done: ['Export pack locked', 'Customs exit recorded'],
        next: no,
      };
    case 'pack':
      return {
        title: 'Final digital export pack generated',
        text: `${c.v.p_no}: cover page, 8 documents and audit certificate. Released to ${B_(c).name} and ${B_(c).agent}.`,
        done: ['Pack generated', 'Customer access granted', 'Producer notified'],
        next: no,
        pack: 1,
      };
  }
  return null;
}

export function App() {
  const [db, setDbS] = useState(() => loadDb() || seed());
  const dbRef = useRef(db);
  const setDb = (d) => {
    dbRef.current = d;
    setDbS(d);
    saveDb(d);
  };
  const mut = (fn) => {
    const d = clone(dbRef.current);
    const r = fn(d);
    setDb(d);
    return [d, r];
  };
  const [toasts, setToasts] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [modal, setModal] = useState(null);
  const [flash, setFlash] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [job, setJob] = useState(null);
  const toast = (t, tone) => {
    const id = Math.random();
    setToasts((x) => [
      ...x,
      {
        id,
        t,
        tone,
      },
    ]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 5200);
  };
  const s = db.session;
  CUR.role = s ? s.persona : null;
  const route = db.route || {
    page: 'home',
  };
  const toastsEl = (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={'toast ' + (t.tone || '')}>
          <Icon n={t.tone === 'bad' ? 'alert' : t.tone === 'ok' ? 'check' : 'info'} />
          <span>{t.t}</span>
        </div>
      ))}
    </div>
  );
  const login = (persona) => {
    mut((d) => {
      d.session = {
        persona,
        org: PERSONAS[persona].org,
      };
      d.route = {
        page: persona === 'admin' ? 'users' : 'home',
      };
    });
    setFlash(null);
  };
  if (!s)
    return (
      <React.Fragment>
        <Login
          db={db}
          onLogin={login}
          toast={toast}
          onLogo={(v) =>
            mut((d) => {
              d.logo = v;
            })
          }
          onBg={(v) =>
            mut((d) => {
              d.loginBg = v;
            })
          }
        />
        {toastsEl}
      </React.Fragment>
    );
  const user = userOf(s);
  const cons = visible(db, s).sort((a, b) => b.seq - a.seq);
  const go = (r) => {
    mut((d) => {
      d.route = r;
    });
    setFlash(null);
    setNavOpen(false);
    const m = document.querySelector('.main');
    if (m) m.scrollTop = 0;
  };
  const ctx = {
    toast,
    setDrawer,
    user,
    go,
    openC: (id, tab) =>
      go(
        s.persona === 'customer'
          ? {
              page: 'ship',
              id,
            }
          : {
              page: 'c360',
              id,
              tab,
            },
      ),
    flashFor: (k) => (flash && flash.key === k ? flash : null),
    clearFlash: () => setFlash(null),
    act: (fx, id, extra, flashKey, silent) => {
      const [d] = mut((d) => {
        const c = d.cons[id];
        FX[fx](d, c, Date.now(), user, extra);
        c.tl.sort((a, b) => a.at - b.at);
      });
      const c = d.cons[id];
      if (flashKey) {
        const sx = successFor(fx, d, c);
        if (sx)
          setFlash({
            key: flashKey,
            id,
            ...sx,
          });
        else if (!silent) toast('Done.', 'ok');
      } else if (!silent) {
        const sx = successFor(fx, d, c);
        toast(
          sx ? sx.title : fx === 'returnDecl' ? `${id} returned to ${P_(c).contact} for correction.` : 'Saved.',
          'ok',
        );
      }
      const m = document.querySelector('.main');
      if (m && flashKey) m.scrollTop = 0;
    },
    switchTo: (persona, r) => {
      mut((d) => {
        d.session = {
          persona,
          org: PERSONAS[persona].org,
        };
        d.route = r || {
          page: 'home',
        };
      });
      setFlash(null);
      setDrawer(null);
      setModal(null);
    },
    logout: () => {
      mut((d) => {
        d.session = null;
      });
      setDrawer(null);
      setFlash(null);
    },
    compose: (init) =>
      setModal({
        k: 'compose',
        init,
      }),
    sendMsg: (id, m, kind) => {
      mut((d) => {
        const c = d.cons[id];
        if (!c) return;
        const to =
          kind === 'Escalate'
            ? ['executive', 'compliance']
            : PERSONAS[s.persona].ext
              ? ['compliance', 'coordinator']
              : ['producer'];
        msg(d, c, Date.now(), to, m.subject, m.body + `\n\nFrom ${user} (${PERSONAS[s.persona].label})`);
        tl(
          c,
          Date.now(),
          `${kind === 'Escalate' ? 'Escalation' : 'Message'} sent to ${m.to}: ${m.subject}`,
          user,
          0,
          kind === 'Escalate' ? 'warn' : '',
        );
        aud(c, Date.now(), user, kind === 'Escalate' ? 'Escalated' : 'Message sent', m.to);
        if (kind === 'Escalate') {
          c.v.c_esc = 1;
          d.exc
            .filter((e) => e.ccrn === id && e.status !== 'Closed')
            .forEach((e) => {
              e.escalated = 1;
              e.tl.push({
                at: Date.now(),
                by: user,
                text: 'Escalated: ' + m.subject,
              });
            });
        }
      });
      toast(`${kind === 'Escalate' ? 'Escalation' : 'Message'} sent to ${m.to}. Logged on ${id}.`, 'ok');
    },
    addNote: (id, t) => {
      mut((d) => {
        const c = d.cons[id];
        tl(c, Date.now(), 'Note: ' + t, user, 0);
        aud(c, Date.now(), user, 'Note added', t);
      });
      toast('Note added to ' + id + '.', 'ok');
    },
    markRead: () => {
      const ids = new Set(cons.map((c) => c.id));
      if (dbRef.current.msgs.some((m) => !m.read && m.to.includes(s.persona) && ids.has(m.ccrn)))
        mut((d) => {
          d.msgs.forEach((m) => {
            if (m.to.includes(s.persona) && ids.has(m.ccrn)) m.read = 1;
          });
        });
    },
    upload: (id, k) =>
      setModal({
        k: 'upload',
        id,
        doc: k,
      }),
    doUpload: (id, k, file) => {
      const [d] = mut((d) => {
        const c = d.cons[id];
        c.docs[k] = {
          at: Date.now(),
          by: user,
          file,
        };
        const nm = DOCS.find((x) => x[0] === k)[1];
        tl(c, Date.now(), `${nm} uploaded`, user, 1, 'ok');
        aud(c, Date.now(), user, 'Document uploaded', `${nm} · ${file}`);
        d.exc
          .filter((e) => e.ccrn === id && e.type === 'Missing Document' && e.status !== 'Closed')
          .forEach((e) => {
            e.status = 'Closed';
            e.resolution = `${nm} uploaded by ${user}.`;
            e.tl.push({
              at: Date.now(),
              by: user,
              text: 'Closed: document uploaded',
            });
          });
        if (c.stage === sIdx('clr'))
          msg(
            d,
            c,
            Date.now(),
            ['compliance'],
            `Export pack complete – ${c.id}`,
            `${nm} uploaded. Export readiness is ${readiness(c).done} of 8.`,
          );
      });
      const r = readiness(d.cons[id]);
      toast(
        `${DOCS.find((x) => x[0] === k)[1]} uploaded. Export readiness ${r.done} of ${r.tot}${r.done === r.tot ? ' · ready for release' : ''}.`,
        'ok',
      );
    },
    respondQuery: (id) =>
      setModal({
        k: 'respond',
        id,
      }),
    confirmInsp: (id) => {
      mut((d) => {
        const c = d.cons[id];
        const t = Date.now();
        c.v.a_conf = {
          at: t,
          by: user,
        };
        tl(c, t, `Inspection date ${fmtDT(c.v.a_when)} confirmed by producer`, user, 1, 'ok');
        aud(c, t, user, 'Inspection date confirmed', fmtDT(c.v.a_when));
        msg(
          d,
          c,
          t,
          ['coordinator', 'inspector'],
          `Inspection date confirmed – ${id}`,
          `${user} (${P_(c).short}) confirmed the site will be ready on ${fmtDT(c.v.a_when)}.`,
        );
      });
      toast('Inspection date confirmed. MMCZ Inspectorate notified.', 'ok');
    },
    saveDecl: (id, f, submit) => {
      const p = PRODUCERS[s.org];
      let nid = id;
      mut((d) => {
        let c = id ? d.cons[id] : null;
        if (!c) {
          const seqs = Object.values(d.cons)
            .filter((x) => x.code === p.code)
            .map((x) => x.seq);
          const seq = Math.max(...seqs) + 1;
          c = baseC({
            seq,
            pid: s.org,
            qty: N(f.qty),
          });
          c.created = Date.now();
          c.stageStart = Date.now();
          c.v.d_period = `${MON[new Date().getMonth()]} ${YEAR}`;
          tl(c, Date.now(), 'Consignment created · ID issued', user, 1);
          aud(c, Date.now(), user, 'Consignment created', c.id);
          d.cons[c.id] = c;
          nid = c.id;
        }
        Object.assign(c.v, {
          d_qty: N(f.qty),
          d_dispatch: new Date(f.dispatch + 'T08:00').getTime(),
          d_insp: new Date(f.insp + 'T10:00').getTime(),
          d_prod: N(f.prod),
          d_open: N(f.open),
          d_dom: N(f.dom),
          d_close_rec: N(f.rec),
          d_remarks: f.remarks,
        });
        c.buyer = f.buyer;
        [
          ['pl', f.pl],
          ['coo', f.coo],
          ['auth', f.auth],
        ].forEach(([k, v]) => {
          if (v && (!c.docs[k] || c.docs[k].file !== v))
            c.docs[k] = {
              at: Date.now(),
              by: user,
              file: v,
            };
        });
        if (submit) FX.submitDecl(d, c, Date.now(), user);
        else aud(c, Date.now(), user, 'Draft saved');
        d.route = {
          page: 'declare',
          id: c.id,
        };
      });
      if (submit) {
        const d = dbRef.current;
        setFlash({
          key: 'decl',
          id: nid,
          ...successFor('submitDecl', d, d.cons[nid]),
        });
      } else toast(`Draft saved as ${nid}.`, 'ok');
    },
    viewDoc: (id, k) =>
      setViewer({
        id,
        k,
      }),
    downloadDoc: (id, k) => {
      if (job) {
        toast('A document is already being generated.', '');
        return;
      }
      const no = k === 'pack' ? refs(dbRef.current.cons[id]).pack : docState(dbRef.current.cons[id], k).no;
      setJob({
        id,
        keys: [k],
        name: `${String(no).replace(/[\/\s]+/g, '-')}.pdf`,
      });
      toast('Generating PDF…', '');
    },
    downloadPack: (id) => {
      if (job) {
        toast('A document is already being generated.', '');
        return;
      }
      setJob({
        id,
        keys: PACK_KEYS,
        name: `${refs(dbRef.current.cons[id]).pack}_Export_Pack.pdf`,
      });
      toast('Generating export pack (10 pages)…', '');
    },
    downloadCsv: async (kind) => {
      const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const all = Object.values(dbRef.current.cons);
      let rows;
      if (kind === 'exports')
        rows = [
          [
            'Consignment ID',
            'Producer',
            'Mineral',
            'Verified MT',
            'Export value USD',
            'Invoice',
            'Invoice total USD',
            'CD1',
            'BOE',
            'Export pack',
            'Released',
          ],
          ...all
            .filter(isDone)
            .map((c) => [
              c.id,
              P_(c).name,
              M(c).name,
              qtyOf(c),
              calcInv(c).gross,
              c.v.n_no,
              c.v.n_amount,
              c.v.c_no,
              c.v.b_no,
              c.v.p_no,
              fmtDT(c.v.p_at),
            ]),
        ];
      else if (kind === 'ra')
        rows = [
          [
            'Reference',
            'Consignment',
            'Type',
            'Severity',
            'Status',
            'Owner',
            'Expected',
            'Observed',
            'Variance',
            'Impact USD',
            'Raised',
          ],
          ...dbRef.current.exc.map((e) => [
            e.id,
            e.ccrn,
            e.type,
            e.sev,
            e.status,
            e.owner,
            e.expected,
            e.observed,
            e.variance,
            e.impact,
            fmtDT(e.created),
          ]),
        ];
      else if (kind === 'sla')
        rows = [
          ['Consignment', 'Stage', 'Status', 'Elapsed h', 'SLA h', 'SLA status', 'Next owner'],
          ...all
            .filter((c) => !isDone(c))
            .map((c) => {
              const x = slaOf(dbRef.current, c);
              return [
                c.id,
                STAGES[c.stage].name,
                statusOf(dbRef.current, c).t,
                x ? x.el.toFixed(1) : '',
                x ? x.sla : '',
                x ? x.label : '',
                nextOwner(c).who,
              ];
            }),
        ];
      else
        rows = [
          ['Consignment', 'Document', 'Number', 'Status', 'Source', 'Date'],
          ...all.flatMap((c) =>
            DOCS.map((dd) => {
              const x = docState(c, dd[0]);
              return [c.id, dd[1], x.no, x.st, x.src, x.at ? fmtDT(x.at) : ''];
            }),
          ),
        ];
      const blob = new Blob([rows.map((r) => r.map(q).join(',')).join('\r\n')], {
        type: 'text/csv',
      });
      try {
        await saveFile(`MMCZ_${kind}_${isoD(Date.now())}.csv`, blob);
        toast('Report saved.', 'ok');
      } catch (e) {
        toast(
          e.code === 'declined' ? 'Download cancelled.' : e.message || 'Could not save the report.',
          e.code === 'declined' ? '' : 'bad',
        );
      }
    },
    openExc: (id) =>
      setDrawer({
        k: 'exc',
        id,
      }),
    excNote: (id, t) => {
      mut((d) => {
        const e = d.exc.find((x) => x.id === id);
        e.notes.push({
          at: Date.now(),
          by: user,
          text: t,
        });
        e.tl.push({
          at: Date.now(),
          by: user,
          text: 'Note added',
        });
      });
      toast('Investigation note added.', 'ok');
    },
    excAction: (id, a, reason) => {
      const L = {
        accept: 'Accepted with reason',
        return: 'Returned for correction',
        reinspect: 'Re-inspection requested',
        retest: 'Re-test requested',
        amend: 'Amendment requested',
        hold: 'Consignment on hold',
        escalate: 'Escalated',
      };
      mut((d) => {
        const e = d.exc.find((x) => x.id === id);
        const c = d.cons[e.ccrn];
        const t = Date.now();
        e.tl.push({
          at: t,
          by: user,
          text: `${L[a]}: ${reason}`,
        });
        e.notes.push({
          at: t,
          by: user,
          text: `${L[a]}. ${reason}`,
        });
        if (a === 'accept') {
          e.status = 'Closed';
          e.resolution = `Accepted by ${user}: ${reason}`;
          if (c.hold && !d.exc.some((x) => x.ccrn === c.id && x.id !== id && x.status !== 'Closed')) c.hold = null;
          if (e.type === 'Assay Outside Tolerance' && c.sub === 'attention') {
            c.sub = 'results';
          }
          tl(c, t, `Exception ${id} accepted: ${reason}`, user, 0, 'ok');
        } else if (a === 'hold') {
          c.hold = {
            reason,
            at: t,
            by: user,
          };
          e.status = 'Consignment on hold';
          tl(c, t, `Consignment placed on hold (${id})`, user, 0, 'bad');
        } else if (a === 'retest' && STAGES[c.stage] && STAGES[c.stage].k === 'assay') {
          FX.retest(d, c, t, user, reason);
        } else if (a === 'escalate') {
          e.escalated = 1;
          e.status = e.status === 'Open' ? 'Escalated' : e.status;
          msg(d, c, t, ['executive'], `Escalation ${id} – ${e.type}`, `${user}: ${reason}`);
        } else {
          e.status = L[a];
          if (a === 'reinspect') {
            c.hold = {
              reason: 'Re-inspection requested: ' + reason,
              at: t,
              by: user,
            };
          }
        }
        tl(c, t, `${id} · ${L[a]}`, user, 0, a === 'accept' ? 'ok' : 'warn');
        aud(c, t, user, `Exception ${L[a].toLowerCase()}`, `${id}: ${reason}`);
      });
      toast(`${id}: ${L[a]}. Recorded in the audit trail.`, 'ok');
    },
    setInteg: (k, v) => {
      mut((d) => {
        d.integ = {
          ...d.integ,
          [k]: v,
        };
      });
      toast(
        `${SYS[k][0]} ${v === 'down' ? 'connection suspended for maintenance' : 'reconnected'}.`,
        v === 'down' ? 'bad' : 'ok',
      );
    },
    setSla: (k, v) =>
      mut((d) => {
        d.sla = {
          ...(d.sla || {}),
          [k]: Math.max(1, N(v)),
        };
      }),
    setLogo: (v) => {
      mut((d) => {
        d.logo = v;
      });
      toast(v ? 'Logo updated on header, login and documents.' : 'MMCZ logo restored.', 'ok');
    },
    askReset: () =>
      setModal({
        k: 'reset',
      }),
  };
  const P = PERSONAS[s.persona];
  const nav = NAV[s.persona].map((n) => n[0]);
  const ok = nav.includes(route.page) || ALLOWED[s.persona].includes(route.page);
  const pp = {
    db,
    s,
    cons,
    ctx,
  };
  const id = route.id;
  let page;
  if (!ok) page = <NotFound ctx={ctx} denied={1} />;
  else if (route.page === 'c360') page = <C360 key={id} {...pp} id={id} tab0={route.tab} />;
  else
    switch (s.persona) {
      case 'producer':
        page =
          route.page === 'list' ? (
            <ConsList {...pp} title="My Consignments" sub="Every consignment you have declared, with its progress." />
          ) : route.page === 'declare' ? (
            <DeclarationPage key={id || 'new'} {...pp} id={id} />
          ) : route.page === 'docs' ? (
            <DocumentsPage {...pp} />
          ) : route.page === 'notifs' ? (
            <NotifPage {...pp} />
          ) : (
            <ProducerHome {...pp} />
          );
        break;
      case 'checker':
        page =
          route.page === 'review' ? (
            <ReviewPage key={id} {...pp} id={id} />
          ) : ['queue', 'approved', 'returned'].includes(route.page) ? (
            <CheckerList key={route.page} {...pp} kind={route.page} />
          ) : route.page === 'notifs' ? (
            <NotifPage {...pp} />
          ) : (
            <CheckerHome {...pp} />
          );
        break;
      case 'coordinator':
        page =
          route.page === 'requests' ? (
            <RequestsPage {...pp} />
          ) : route.page === 'calendar' ? (
            <CalendarPage {...pp} />
          ) : route.page === 'inspectors' ? (
            <InspectorsPage {...pp} />
          ) : route.page === 'exceptions' ? (
            <ExceptionsPage {...pp} />
          ) : (
            <CoordinatorHome {...pp} />
          );
        break;
      case 'inspector':
        page =
          route.page === 'inspect' ? (
            <InspectionFlow key={id} {...pp} id={id} />
          ) : (
            <InspectorHome key={route.page} {...pp} kind={route.page === 'home' ? null : route.page} />
          );
        break;
      case 'lab':
        page =
          route.page === 'assay' ? (
            <AssayPage key={id} {...pp} id={id} />
          ) : (
            <LabHome key={route.page} {...pp} kind={route.page === 'home' ? null : route.page} />
          );
        break;
      case 'finance':
        page =
          route.page === 'invoice' ? (
            <InvoicePage key={id} {...pp} id={id} />
          ) : route.page === 'exceptions' ? (
            <ExceptionsPage {...pp} />
          ) : (
            <FinanceHome key={route.page} {...pp} kind={route.page === 'home' ? null : route.page} />
          );
        break;
      case 'compliance':
        page =
          route.page === 'cd1d' ? (
            <Cd1Page key={id} {...pp} id={id} />
          ) : route.page === 'boed' ? (
            <BoePage key={id} {...pp} id={id} />
          ) : route.page === 'clrd' ? (
            <ClearancePage key={id} {...pp} id={id} />
          ) : route.page === 'exceptions' ? (
            <ExceptionsPage {...pp} />
          ) : (
            <ComplianceHome key={route.page} {...pp} kind={route.page === 'home' ? null : route.page} />
          );
        break;
      case 'executive':
        page =
          route.page === 'list' ? (
            <ExecList key={route.stage || 'all'} {...pp} stage={route.stage} />
          ) : route.page === 'exceptions' ? (
            <ExceptionsPage {...pp} />
          ) : route.page === 'analytics' ? (
            <AnalyticsPage />
          ) : route.page === 'reports' ? (
            <ReportsPage {...pp} />
          ) : (
            <ExecutiveHome {...pp} />
          );
        break;
      case 'customer':
        page =
          route.page === 'ship' ? (
            <ShipmentPage key={id} {...pp} id={id} />
          ) : route.page === 'docs' ? (
            <DocumentsPage {...pp} ext={1} />
          ) : route.page === 'notifs' ? (
            <NotifPage {...pp} />
          ) : (
            <ShipmentsPage {...pp} />
          );
        break;
      case 'admin':
        page = <AdminPage {...pp} page={route.page === 'home' ? 'users' : route.page} />;
        break;
    }
  const ex = drawer && drawer.k === 'exc' ? db.exc.find((e) => e.id === drawer.id) : null;
  const overlays = [
    drawer && drawer.k === 'notif' ? (
      <NotificationDrawer {...pp} ccrn={drawer.ccrn} onClose={() => setDrawer(null)} />
    ) : null,
    ex ? <ExceptionDrawer db={db} s={s} ctx={ctx} e={ex} onClose={() => setDrawer(null)} /> : null,
    modal && modal.k === 'compose' ? (
      <Composer db={db} s={s} ctx={ctx} init={modal.init} onClose={() => setModal(null)} />
    ) : null,
    modal && modal.k === 'upload' ? (
      <UploadModal db={db} ctx={ctx} id={modal.id} k={modal.doc} onClose={() => setModal(null)} />
    ) : null,
    modal && modal.k === 'respond' ? (
      <RespondModal db={db} ctx={ctx} id={modal.id} user={user} mut={mut} onClose={() => setModal(null)} />
    ) : null,
    modal && modal.k === 'reset' ? (
      <ConfirmationModal
        title="Restore baseline scenarios?"
        text="All consignments, exceptions and messages return to the baseline operating scenarios. Branding is kept."
        confirm="Restore baseline"
        tone="danger"
        onClose={() => setModal(null)}
        onConfirm={() => {
          const d = seed();
          d.session = dbRef.current.session;
          d.route = {
            page: s.persona === 'admin' ? 'users' : 'home',
          };
          d.logo = dbRef.current.logo;
          d.loginBg = dbRef.current.loginBg;
          setDb(d);
          setModal(null);
          setDrawer(null);
          setFlash(null);
          toast('Baseline scenarios restored.', 'ok');
        }}
      />
    ) : null,
    viewer ? <DocViewer db={db} ctx={ctx} id={viewer.id} k={viewer.k} onClose={() => setViewer(null)} /> : null,
    job ? <PdfJob db={db} job={job} toast={toast} onDone={() => setJob(null)} /> : null,
    toastsEl,
  ];
  if (s.persona === 'customer')
    return (
      <React.Fragment>
        <CustomerShell {...pp} route={route}>
          {page}
        </CustomerShell>
        {overlays}
      </React.Fragment>
    );
  return (
    <div className={'app' + (s.persona === 'admin' ? ' admin' : '')}>
      <AppHeader {...pp} onBurger={() => setNavOpen(!navOpen)} />
      <SideNavigation {...pp} route={route} open={navOpen} />
      <main className="main" onClick={() => navOpen && setNavOpen(false)}>
        {page}
      </main>
      {overlays}
    </div>
  );
}
