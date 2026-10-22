import { useState, useEffect } from 'react';
import { ApprovalCard, ConsignmentCard, DocumentCard, TaskCard } from '../components/cards';
import { ConsignmentHeader } from '../components/ConsignmentHeader';
import { Icon } from '../components/Icon';
import {
  Banner,
  Card,
  EmptyState,
  FilterBar,
  Ghost,
  KV,
  KpiCard,
  PageHeader,
  PrimaryCTA,
  SecondaryCTA,
  Seg,
  StatusChip,
  SuccessPanel,
} from '../components/primitives';
import { YEAR } from '../lib/constants';
import { docState, readiness } from '../lib/derived';
import { MON, N, dayAt, fmtD, fmtDT, initials, isoD, nf } from '../lib/format';
import { B_, M, P_, isDone, qtyOf } from '../lib/lifecycle';
import { orgName, routeLabel, userOf } from '../lib/masterData';
import { myMsgs } from '../lib/navigation';
import BUYERS from '../data/buyers.json';
import DOCS from '../data/documentTypes.json';
import MINERALS from '../data/minerals.json';
import PERSONAS from '../data/personas.json';
import PRODUCERS from '../data/producers.json';
import ROUTES from '../data/routes.json';
import STAGES from '../data/stages.json';

/* ================= PRODUCER ================= */
export function producerTasks(db, s, cons) {
  const T = [];
  cons.forEach((c) => {
    if (isDone(c)) return;
    const k = STAGES[c.stage].k;
    if (k === 'decl' && c.sub === 'draft')
      T.push({
        t: 'Submit Declaration',
        ic: 'send',
        pri: 'Medium',
        c,
        d: `${nf(c.v.d_qty)} MT ${M(c).name} to ${B_(c).short}. Draft is complete and ready to submit.`,
        due: 'Due today',
        dt: 'warn',
        a: 'Open Declaration',
        go: {
          page: 'declare',
          id: c.id,
        },
        tone: 'warn',
      });
    if (k === 'decl' && c.sub === 'returned')
      T.push({
        t: 'Correct Returned Declaration',
        ic: 'refresh',
        pri: 'High',
        c,
        d: c.v.k_note || 'Your checker returned this declaration.',
        due: 'Due today',
        dt: 'bad',
        a: 'Correct Declaration',
        go: {
          page: 'declare',
          id: c.id,
        },
        tone: 'bad',
      });
    if (c.v.q_open && !c.v.q_done)
      T.push({
        t: 'Respond to Inspection Query',
        ic: 'msg',
        pri: 'High',
        c,
        d: 'Inspector requested weighbridge ticket for Lots 13–24.',
        due: 'Due today',
        dt: 'bad',
        a: 'Respond',
        respond: 1,
        tone: 'bad',
      });
    if (k === 'clr' && !c.docs.coo)
      T.push({
        t: 'Upload Missing Document',
        ic: 'upload',
        pri: 'High',
        c,
        d: 'Certificate of Origin required. Export release is blocked until it is uploaded.',
        due: 'Due tomorrow',
        dt: 'warn',
        a: 'Upload Document',
        upload: 'coo',
        tone: 'bad',
      });
    if (k === 'insp' && c.sub === 'scheduled' && !c.v.a_conf)
      T.push({
        t: 'Confirm Inspection Date',
        ic: 'calendar',
        pri: 'Medium',
        c,
        d: `MMCZ inspector ${c.v.a_insp} is scheduled at ${P_(c).mine} on ${fmtDT(c.v.a_when)}. Confirm the site will be ready.`,
        due: 'Before ' + fmtDT(c.v.a_when),
        dt: 'warn',
        a: 'Confirm Date',
        confirm: 1,
        tone: '',
      });
  });
  return T;
}

export function runTask(ctx, t) {
  if (t.go) ctx.go(t.go);
  else if (t.upload) ctx.upload(t.c.id, t.upload);
  else if (t.respond) ctx.respondQuery(t.c.id);
  else if (t.confirm) ctx.confirmInsp(t.c.id);
}

export function ProducerHome({ db, s, cons, ctx }) {
  const tasks = producerTasks(db, s, cons);
  const active = cons.filter((c) => !isDone(c));
  const awaiting = active.filter((c) => c.stage >= 1 && !tasks.some((t) => t.c.id === c.id)).length;
  const ready = cons.filter((c) => c.stage >= 7).length;
  const list = [...active].sort((a, b) => b.stage - a.stage);
  return (
    <div className="page">
      <PageHeader
        eyebrow={['Welcome, ', userOf(s), ' · ', orgName(s)]}
        title="My Export Consignments"
        sub="Everything you have declared for export, where it is now and what MMCZ needs from you."
        actions={
          <PrimaryCTA
            icon="plus"
            lg={1}
            onClick={() =>
              ctx.go({
                page: 'declare',
              })
            }
          >
            New Export Consignment
          </PrimaryCTA>
        }
      />
      <div className="kpis">
        <KpiCard
          label="Active Consignments"
          value={active.length}
          sub="Declared and in progress"
          tone="info"
          onClick={() =>
            ctx.go({
              page: 'list',
            })
          }
        />
        <KpiCard
          label="Action Required"
          value={tasks.length}
          sub="Waiting on you"
          tone={tasks.length ? 'warn' : 'ok'}
        />
        <KpiCard label="Awaiting MMCZ" value={awaiting} sub="Inspection, assay, invoicing or regulators" />
        <KpiCard label="Cleared / Export Ready" value={ready} sub="Customs released or documents issued" tone="ok" />
      </div>
      <section className="col">
        <div className="row">
          <h2
            style={{
              fontSize: '19px',
            }}
          >
            My actions
          </h2>
          <span className="muted">{tasks.length ? tasks.length + ' item' + (tasks.length > 1 ? 's' : '') : ''}</span>
        </div>
        {tasks.length ? (
          <div className="tasks">
            {tasks.map((t, i) => (
              <TaskCard
                key={i}
                title={t.t}
                icon={t.ic}
                pri={t.pri}
                ccrn={t.c.id}
                detail={t.d}
                due={t.due}
                dueTone={t.dt}
                tone={t.tone}
                action={t.a}
                onAction={() => runTask(ctx, t)}
              />
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              tone="ok"
              icon="check"
              title="No actions needed"
              text="MMCZ will notify you when something needs your input."
            />
          </div>
        )}
      </section>
      <section className="col">
        <div className="row">
          <h2
            style={{
              fontSize: '19px',
            }}
          >
            My consignments
          </h2>
          <span className="grow" />
          <Ghost
            icon="right"
            onClick={() =>
              ctx.go({
                page: 'list',
              })
            }
          >
            View all
          </Ghost>
        </div>
        <div className="ccards">
          {list.slice(0, 6).map((c) => (
            <ConsignmentCard key={c.id} db={db} c={c} noRisk={1} onOpen={(x) => ctx.openC(x.id)} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function ConsList({ db, s, cons, ctx, title, sub, ext }) {
  const [f, setF] = useState('active');
  const [q, setQ] = useState('');
  const L = cons
    .filter((c) => f === 'all' || (f === 'active' ? !isDone(c) : isDone(c)))
    .filter(
      (c) =>
        !q || (c.id + P_(c).name + M(c).name + B_(c).name + (c.v.n_no || '')).toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) => b.seq - a.seq);
  return (
    <div className="page">
      <PageHeader title={title} sub={sub} />
      <FilterBar q={q} setQ={setQ} placeholder="Search ID, mineral, buyer">
        <Seg
          value={f}
          onChange={setF}
          opts={[
            ['active', 'Active', cons.filter((c) => !isDone(c)).length],
            ['done', 'Completed', cons.filter(isDone).length],
            ['all', 'All', cons.length],
          ]}
        />
      </FilterBar>
      <div className="ccards">
        {L.length ? (
          L.map((c) => (
            <ConsignmentCard
              key={c.id}
              db={db}
              c={c}
              ext={ext}
              noRisk={PERSONAS[s.persona].ext}
              onOpen={(x) => ctx.openC(x.id)}
            />
          ))
        ) : (
          <div className="card">
            <EmptyState icon="box" title="No consignments match" text="Try another filter or clear the search." />
          </div>
        )}
      </div>
    </div>
  );
}

/* declaration form (new or existing draft) */
export function DeclarationPage({ db, s, cons, ctx, id }) {
  const pid = s.org;
  const p = PRODUCERS[pid];
  const m = MINERALS[p.code];
  const existing = id ? db.cons[id] : null;
  const editable = !existing || (existing.stage === 0 && ['draft', 'returned'].includes(existing.sub));
  const init = existing
    ? {
        qty: existing.v.d_qty,
        buyer: existing.buyer,
        dispatch: isoD(existing.v.d_dispatch),
        insp: isoD(existing.v.d_insp),
        prod: existing.v.d_prod,
        open: existing.v.d_open,
        dom: existing.v.d_dom,
        rec: existing.v.d_close_rec,
        contract: existing.v.d_contract,
        pl: existing.docs.pl && existing.docs.pl.file,
        coo: existing.docs.coo && existing.docs.coo.file,
        auth: existing.docs.auth && existing.docs.auth.file,
        remarks: existing.v.d_remarks || '',
      }
    : {
        qty: '',
        buyer: p.buyer,
        dispatch: isoD(dayAt(10, 8)),
        insp: isoD(dayAt(3, 10)),
        prod: '',
        open: '',
        dom: '',
        rec: '',
        contract: '',
        pl: '',
        coo: '',
        auth: `Export_authorisation_${p.lic.replace(/\//g, '-')}.pdf`,
        remarks: '',
      };
  const [f, setF] = useState(init);
  const [tried, setTried] = useState(false);
  const [ws, setWs] = useState(0);
  const up = (k, v) =>
    setF((o) => ({
      ...o,
      [k]: v,
    }));
  const flash = ctx.flashFor('decl');
  if (flash)
    return (
      <div className="page narrow">
        {existing ? <ConsignmentHeader db={db} c={db.cons[flash.id]} /> : null}
        <SuccessPanel
          {...flash}
          actions={[
            <PrimaryCTA onClick={() => ctx.openC(flash.id)}>View consignment</PrimaryCTA>,
            <SecondaryCTA
              onClick={() =>
                ctx.go({
                  page: 'home',
                })
              }
            >
              Back to home
            </SecondaryCTA>,
          ]}
        />
      </div>
    );
  const close = N(f.prod) + N(f.open) - N(f.dom) - N(f.qty);
  const balanced = f.rec !== '' && Math.abs(close - N(f.rec)) < 0.01 && close >= 0;
  const licOk = new Date(p.licexp) > new Date();
  const miss = [];
  if (!N(f.qty)) miss.push('qty');
  if (!f.dispatch) miss.push('dispatch');
  if (!f.insp) miss.push('insp');
  if (f.prod === '') miss.push('prod');
  if (f.open === '') miss.push('open');
  if (f.rec === '') miss.push('rec');
  if (!f.pl) miss.push('pl');
  const errs = tried ? new Set(miss) : new Set();
  const checks = [
    [N(f.qty) > 0, 'Export quantity entered', N(f.qty) ? nf(f.qty) + ' MT ' + m.name : 'Enter the quantity to export'],
    [
      balanced ? true : f.rec === '' ? false : false,
      'Stock reconciles',
      balanced
        ? `Closing stock ${nf(close)} MT matches your records`
        : f.rec === ''
          ? 'Enter production and stock figures'
          : `Computed ${nf(close)} MT vs records ${nf(f.rec)} MT`,
    ],
    [licOk, 'Export licence valid', `${p.lic} · valid until ${fmtD(p.licexp)}`],
    [!!f.pl, 'Packing list attached', f.pl || 'Required before submission'],
    [f.coo ? true : 'wait', 'Certificate of Origin', f.coo ? f.coo : 'Optional now · required before export release'],
  ];
  const save = (submit) => {
    if (submit && (miss.length || !balanced)) {
      setTried(true);
      ctx.toast(
        miss.length
          ? 'Complete the highlighted fields before submitting.'
          : 'Stock figures do not reconcile. Check production, opening stock and allocations.',
        'bad',
      );
      return;
    }
    ctx.saveDecl(existing && existing.id, f, submit);
  };
  const fld = (k, l, type, extra = {}) => (
    <label className={'fld' + (extra.wide ? ' wide' : '')}>
      <span className="lbl">
        {l}
        {extra.auto ? <span className="auto">Auto</span> : null}
      </span>
      <input
        id={'d-' + k}
        className={'in' + (errs.has(k) ? ' inv' : '') + (type === 'number' ? ' num' : '')}
        type={type || 'text'}
        value={f[k]}
        readOnly={!editable || extra.ro}
        onChange={(e) => up(k, e.target.value)}
        placeholder={extra.ph || ''}
        step="any"
      />
      {errs.has(k) ? (
        <span className="err">Required</span>
      ) : extra.help ? (
        <span className="help">{extra.help}</span>
      ) : null}
    </label>
  );
  const doc = (k, l, req, help) => (
    <div className={'upl' + (f[k] ? ' done' : errs.has(k) ? ' miss' : '')}>
      <span className="fi">
        <Icon n={f[k] ? 'check' : 'file'} />
      </span>
      <div
        style={{
          minWidth: 0,
          flex: 1,
        }}
      >
        <b>
          {l}
          {req
            ? ''
            : [
                ' ',
                <span
                  className="muted"
                  style={{
                    fontWeight: 400,
                  }}
                >
                  (optional now)
                </span>,
              ]}
        </b>
        <small>{f[k] || help}</small>
      </div>
      {editable ? (
        <label
          className="btn sec sm"
          style={{
            cursor: 'pointer',
          }}
        >
          <Icon n="upload" c="sm" />
          {f[k] ? 'Replace' : 'Upload'}
          <input
            type="file"
            hidden
            onChange={(e) => {
              const x = e.target.files[0];
              if (x) up(k, x.name);
            }}
          />
        </label>
      ) : null}
    </div>
  );
  const stepOf = {
    prod: 1,
    open: 1,
    dom: 1,
    qty: 1,
    rec: 1,
    dispatch: 2,
    insp: 2,
    pl: 3,
  };
  const stepOk = [licOk, balanced && N(f.qty) > 0, !!f.dispatch && !!f.insp, !!f.pl];
  const submitW = () => {
    if (miss.length || !balanced) {
      setTried(true);
      const first = Math.min(...miss.map((k) => stepOf[k]), balanced ? 9 : 1);
      if (first < 9) setWs(first);
      ctx.toast(
        miss.length
          ? 'Complete the highlighted fields before submitting.'
          : 'Stock figures do not reconcile. Check production, opening stock and allocations.',
        'bad',
      );
      return;
    }
    ctx.saveDecl(existing && existing.id, f, true);
  };
  const W = [
    ['Producer & Mine', 'From the producer register'],
    ['Production & Stock', 'Reconcile the period'],
    ['Export Details', 'Buyer, route, inspection'],
    ['Documents & Submission', 'Attach and submit'],
  ];
  const tile = (l, v, cls) => (
    <div className={'t' + (cls ? ' ' + cls : '')}>
      <small>{l}</small>
      <b>
        {v === '' || v == null ? '—' : nf(v)}{' '}
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          MT
        </span>
      </b>
    </div>
  );
  const R_p = ROUTES[p.route];
  const body = [
    <Card title={'Producer & mine'} sub="From the MMCZ producer register. Contact MMCZ to change these details.">
      <KV
        rows={[
          ['Producer', p.name],
          ['Producer ID', p.id],
          ['Mine / site', `${p.mine}, ${p.loc}`],
          [
            'Export licence',
            [p.lic, ' ', <StatusChip tone={licOk ? 'ok' : 'bad'}>{licOk ? 'Valid' : 'Expired'}</StatusChip>],
          ],
          ['Licence valid until', fmtD(p.licexp)],
          ['Contact', `${userOf(s)} · ${p.phone}`],
          ['Email', p.email],
          ['Bank', `${p.bank}, ${p.branch}`],
          ['Mineral', m.name],
        ]}
      />
    </Card>,
    <Card
      title={'Production & stock'}
      sub={`Declaration period ${existing ? existing.v.d_period : MON[new Date().getMonth()] + ' ' + YEAR}. Closing stock is calculated and must match your records.`}
    >
      <div className="fgrid">
        {fld('open', 'Opening stock (MT)', 'number')}
        {fld('prod', 'Production (MT)', 'number')}
        {fld('dom', 'Domestic allocation (MT)', 'number')}
        {fld('qty', 'Export allocation (MT)', 'number', {
          ph: 'e.g. 1,250',
          help: 'This is the quantity declared for export',
        })}
        {fld('rec', 'Closing stock per your records (MT)', 'number')}
      </div>
      <div
        className="eqn"
        style={{
          marginTop: '18px',
        }}
      >
        {tile('Opening stock', f.open)}
        <span className="op">+</span>
        {tile('Production', f.prod)}
        <span className="op">−</span>
        {tile('Domestic', f.dom)}
        <span className="op">−</span>
        {tile('Export', f.qty)}
        <span className="op">=</span>
        {tile(
          'Closing stock',
          f.prod === '' && f.open === '' ? '' : close,
          'res ' + (f.rec === '' ? '' : balanced ? 'ok' : 'bad'),
        )}
      </div>
      <div
        style={{
          marginTop: '14px',
        }}
      >
        {f.rec === '' ? (
          <StatusChip>Enter your closing stock to check the balance</StatusChip>
        ) : balanced ? (
          <StatusChip tone="ok" icon="check">
            Balanced ✓ · matches your records
          </StatusChip>
        ) : (
          <Banner
            tone="bad"
            title="Mismatch · attention needed"
            text={`Calculated closing stock is ${nf(close)} MT but your records show ${nf(f.rec)} MT. Correct the figures before submitting.`}
          />
        )}
      </div>
    </Card>,
    [
      <Card title="Export details">
        <div className="fgrid">
          <label className="fld">
            <span className="lbl">Mineral</span>
            <input className="in" readOnly value={m.name} />
          </label>
          <label className="fld">
            <span className="lbl">Grade</span>
            <input className="in" readOnly value={m.grade} />
          </label>
          <label className="fld">
            <span className="lbl">
              {'Quantity '}
              <span className="auto">From stock step</span>
            </span>
            <input
              className="in num"
              readOnly
              value={N(f.qty) ? nf(f.qty) + ' MT' : ''}
              placeholder="Enter export allocation"
            />
          </label>
          <label className="fld">
            <span className="lbl">Buyer</span>
            <select
              id="d-buyer"
              className="in"
              value={f.buyer}
              disabled={!editable}
              onChange={(e) => up('buyer', e.target.value)}
            >
              {Object.values(BUYERS)
                .filter((b) => b.id === p.buyer)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
            <span className="help">Contracted buyer on your export licence</span>
          </label>
          <label className="fld">
            <span className="lbl">
              {'Destination '}
              <span className="auto">Auto</span>
            </span>
            <input className="in" readOnly value={BUYERS[f.buyer].country} />
          </label>
          {fld('dispatch', 'Expected dispatch', 'date')}
          <label className="fld">
            <span className="lbl">
              {'Transport mode '}
              <span className="auto">Auto</span>
            </span>
            <input className="in" readOnly value={R_p.mode} />
          </label>
          <label className="fld wide">
            <span className="lbl">
              {'Route '}
              <span className="auto">Auto</span>
            </span>
            <input className="in" readOnly value={routeLabel(p.route)} />
          </label>
        </div>
      </Card>,
      <Card title="Inspection request" sub="Sent to the MMCZ Inspectorate when your checker approves the declaration.">
        <div className="fgrid">
          <label className="fld">
            <span className="lbl">Inspection location</span>
            <input className="in" readOnly value={`${p.mine}, ${p.loc}`} />
          </label>
          {fld('insp', 'Requested inspection date', 'date', {
            help: 'MMCZ confirms the slot when an inspector is assigned',
          })}
          <label className="fld">
            <span className="lbl">Site contact</span>
            <input className="in" readOnly value={`${userOf(s)} · ${p.phone}`} />
          </label>
        </div>
      </Card>,
    ],
    [
      <Card title="Documents">
        <div
          className="docs"
          style={{
            gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))',
          }}
        >
          {doc('pl', 'Production return & packing list', 1, 'Required · PDF or image')}
          {doc('auth', 'Export authorisation', 1, 'From your licence file')}
          {doc(
            'coo',
            'Commercial document · Certificate of Origin',
            0,
            'Issued by ZNCC · needed before export release',
          )}
        </div>
      </Card>,
      <ApprovalCard
        title="Ready to submit?"
        sub={existing ? existing.id : 'A consignment ID is issued when you save or submit'}
        checks={checks}
      />,
    ],
  ];
  return [
    existing ? <ConsignmentHeader db={db} c={existing} /> : null,
    <div className="page narrow">
      <PageHeader
        eyebrow={
          existing
            ? [
                <button
                  className="crumb"
                  onClick={() =>
                    ctx.go({
                      page: 'list',
                    })
                  }
                >
                  My Consignments
                </button>,
                ' / Declaration',
              ]
            : 'New export declaration'
        }
        title={existing ? 'Export Declaration' : 'New Export Declaration'}
        sub={
          existing
            ? 'Check each step and submit. Your checker approves it before it reaches MMCZ.'
            : 'Four short steps. A unique MMCZ Consignment ID is issued when you save, and follows the consignment to export.'
        }
      />
      {existing && existing.sub === 'returned' ? (
        <Banner tone="warn" title="Returned for correction by your checker" text={existing.v.k_note} />
      ) : null}
      {!editable ? (
        <Banner
          tone=""
          title="Submitted · read only"
          text="This declaration has been submitted. Contact your checker if a change is needed."
        />
      ) : null}
      <div className="wz" role="tablist">
        {W.map(([t, d], i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={ws === i}
            className={(ws === i ? 'on ' : '') + (stepOk[i] && i !== ws ? 'ok' : '')}
            onClick={() => setWs(i)}
          >
            <span>{stepOk[i] && i !== ws ? <Icon n="check" c="sm" s="3" /> : i + 1}</span>
            <span
              style={{
                width: 'auto',
                height: 'auto',
                background: 'none',
                display: 'block',
                borderRadius: 0,
                font: 'inherit',
                color: 'inherit',
                minWidth: 0,
              }}
            >
              <b>{t}</b>
              <small>{d}</small>
            </span>
          </button>
        ))}
      </div>
      {body[ws]}
      <div
        className="row"
        style={{
          justifyContent: 'space-between',
          position: 'sticky',
          bottom: 0,
          background: 'var(--bg)',
          padding: '12px 0 calc(12px + env(safe-area-inset-bottom,0px))',
          borderTop: '1px solid var(--line)',
        }}
      >
        <div className="row">
          {ws > 0 ? (
            <SecondaryCTA lg={1} icon="left" onClick={() => setWs(ws - 1)}>
              Back
            </SecondaryCTA>
          ) : null}
          {editable ? (
            <SecondaryCTA lg={1} onClick={() => save(false)}>
              Save Draft
            </SecondaryCTA>
          ) : null}
        </div>
        {ws < 3 ? (
          <PrimaryCTA lg={1} onClick={() => setWs(ws + 1)}>
            {'Next: '}
            {W[ws + 1][0]}
          </PrimaryCTA>
        ) : editable ? (
          <PrimaryCTA lg={1} icon="send" onClick={submitW}>
            Submit Declaration
          </PrimaryCTA>
        ) : null}
      </div>
      <div className="next">
        <span
          className="avatar"
          style={{
            width: '32px',
            height: '32px',
            fontSize: '11px',
          }}
        >
          {initials(p.checker)}
        </span>
        <div>
          <small>After you submit</small>
          <b>
            {p.checker}
            {' (Checker / Approver) reviews and submits to MMCZ'}
          </b>
          <span
            className="muted"
            style={{
              fontSize: '13px',
            }}
          >
            Then MMCZ schedules your inspection and confirms the date
          </span>
        </div>
      </div>
    </div>,
  ];
}

export function DocumentsPage({ db, s, cons, ctx, ext }) {
  const [sel, setSel] = useState('all');
  const L = cons.filter((c) => sel === 'all' || c.id === sel).filter((c) => !ext || isDone(c));
  const missing = cons.flatMap((c) => DOCS.filter((d) => docState(c, d[0]).st === 'Missing').map((d) => [c, d]));
  return (
    <div className="page">
      <PageHeader
        title="Documents"
        sub={
          ext
            ? 'Documents MMCZ has released for your shipments.'
            : 'Every export document for your consignments, with its status and source.'
        }
      />
      {!ext && missing.length ? (
        <Banner
          tone="bad"
          title={missing.length + ' document' + (missing.length > 1 ? 's need' : ' needs') + ' your upload'}
          text={missing.map(([c, d]) => `${d[1]} for ${c.id}`).join('; ')}
          actions={
            <PrimaryCTA icon="upload" onClick={() => ctx.upload(missing[0][0].id, missing[0][1][0])}>
              Upload Document
            </PrimaryCTA>
          }
        />
      ) : null}
      <FilterBar>
        <label
          className="fld"
          style={{
            minWidth: '260px',
          }}
        >
          <span className="sr">Consignment</span>
          <select id="doc-cons" className="in" value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="all">All consignments</option>
            {cons
              .filter((c) => !ext || isDone(c))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}
                </option>
              ))}
          </select>
        </label>
      </FilterBar>
      {L.length ? (
        L.map((c) => (
          <section key={c.id} className="col">
            <div className="row">
              <span className="cid">{c.id}</span>
              <span className="muted">
                {M(c).name}
                {' · '}
                {nf(qtyOf(c))}
                {' MT'}
              </span>
              <span className="grow" />
              {isDone(c) ? (
                <SecondaryCTA sm={1} icon="download" onClick={() => ctx.downloadPack(c.id)}>
                  Download export pack
                </SecondaryCTA>
              ) : (
                <span
                  className="muted"
                  style={{
                    fontSize: '13px',
                  }}
                >
                  {readiness(c).done}
                  {' of 8 complete'}
                </span>
              )}
            </div>
            <div className="docs">
              {DOCS.map((d) => (
                <DocumentCard
                  key={d[0]}
                  c={c}
                  k={d[0]}
                  canUpload={!ext}
                  onView={(k) => ctx.viewDoc(c.id, k)}
                  onDownload={(k) => ctx.downloadDoc(c.id, k)}
                  onUpload={(k) => ctx.upload(c.id, k)}
                />
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="card">
          <EmptyState
            icon="files"
            title="No released documents yet"
            text="Documents appear here after MMCZ releases the export pack for a shipment."
          />
        </div>
      )}
    </div>
  );
}

export function NotifPage({ db, s, cons, ctx }) {
  const msgs = myMsgs(db, s, cons);
  const [o, setO] = useState(null);
  useEffect(() => () => ctx.markRead(), []);
  return (
    <div className="page narrow">
      <PageHeader title="Notifications" sub="Messages about your consignments from MMCZ and your team." />
      <div className="card">
        <div className="cb">
          {msgs.length ? (
            <ul className="lst">
              {msgs.map((m) => (
                <li
                  key={m.id}
                  style={{
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      marginTop: '8px',
                      flex: 'none',
                      background: m.read ? 'var(--line)' : 'var(--cyan)',
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <b
                      style={{
                        display: 'block',
                      }}
                    >
                      {m.subject}
                    </b>
                    <small className="muted">
                      {fmtDT(m.at)}
                      {' · '}
                      {m.ch}
                    </small>
                    {o === m.id ? (
                      <p
                        className="ink2"
                        style={{
                          whiteSpace: 'pre-wrap',
                          margin: '8px 0 0',
                        }}
                      >
                        {m.body}
                      </p>
                    ) : null}
                  </div>
                  <Ghost onClick={() => setO(o === m.id ? null : m.id)}>{o === m.id ? 'Hide' : 'View Message'}</Ghost>
                  <Ghost onClick={() => ctx.openC(m.ccrn)}>Open</Ghost>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState tone="ok" icon="bell" title="No notifications" text="You're up to date." />
          )}
        </div>
      </div>
    </div>
  );
}
