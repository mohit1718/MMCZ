import React, { useState } from 'react';
import { ApprovalCard, DocumentCard, ExceptionCard, IntegrationCard, ReadinessRing } from '../components/cards';
import { ConsignmentHeader } from '../components/ConsignmentHeader';
import { Icon } from '../components/Icon';
import { NotFound } from '../components/NotFound';
import {
  Banner,
  Card,
  DataTable,
  EmptyState,
  KV,
  KpiCard,
  PageHeader,
  PrimaryCTA,
  SecondaryCTA,
  StatusChip,
  SuccessPanel,
} from '../components/primitives';
import { Composer } from '../layout/NotificationDrawer';
import { H } from '../lib/constants';
import { docState, openExc, readiness, slaOf } from '../lib/derived';
import { N, fmtD, fmtDT, hrs, nf, usd } from '../lib/format';
import { B_, M, P_, R_, calcInv, isDone, qtyOf, refs } from '../lib/lifecycle';
import { userOf } from '../lib/masterData';
import DOCS from '../data/documentTypes.json';
import STAGES from '../data/stages.json';

/* ================= COMPLIANCE ================= */
export function ComplianceHome({ db, s, cons, ctx, kind }) {
  const at = (k, sub) => cons.filter((c) => !isDone(c) && STAGES[c.stage].k === k && (!sub || sub.includes(c.sub)));
  const reg = cons.filter((c) => !isDone(c) && ['cd1', 'boe', 'clr', 'rel'].includes(STAGES[c.stage].k));
  const br = reg.filter((c) => {
    const x = slaOf(db, c);
    return x && x.cls === 'bad';
  });
  const block = (c) => {
    const k = STAGES[c.stage].k;
    if (k === 'cd1')
      return c.sub === 'submitted'
        ? ['With RBZ · ' + c.v.c_status, `Submitted ${fmtDT(c.v.c_sub_at)} · ${slaOf(db, c).label}`]
        : ['CD1 not yet submitted', 'Invoice ' + c.v.n_no + ' is posted'];
    if (k === 'boe')
      return c.sub === 'submitted'
        ? ['With ZIMRA · assessment', 'Submitted ' + fmtDT(c.v.b_sub_at)]
        : ['BOE not yet submitted', 'CD1 approved ' + fmtD(c.v.c_dec_at)];
    if (k === 'clr') {
      const r = readiness(c);
      return r.done < 8
        ? ['Export release blocked', `Missing ${r.missing.map((m) => DOCS.find((d) => d[0] === m)[1]).join(', ')}`]
        : ['Ready for export release', 'All 8 documents complete'];
    }
    return ['Ready for document release', 'Generate the final export pack'];
  };
  const page = (k) =>
    ({
      cd1: 'cd1d',
      boe: 'boed',
      clr: 'clrd',
      rel: 'clrd',
    })[STAGES[k.stage].k];
  const listOf = (keys) => reg.filter((c) => keys.includes(STAGES[c.stage].k));
  const tbl = (L) => (
    <DataTable
      cols={[
        {
          h: 'Consignment',
          r: (c) => [<b className="mono">{c.id}</b>, <span className="sub">{P_(c).short}</span>],
        },
        {
          h: 'Stage',
          r: (c) => STAGES[c.stage].name,
        },
        {
          h: 'What is blocking',
          r: (c) => [<b>{block(c)[0]}</b>, <span className="sub">{block(c)[1]}</span>],
        },
        {
          h: 'SLA',
          r: (c) => {
            const x = slaOf(db, c);
            return x ? (
              <StatusChip tone={x.cls === 'bad' ? 'bad' : x.cls === 'warn' ? 'warn' : 'ok'}>{x.label}</StatusChip>
            ) : (
              '—'
            );
          },
        },
        {
          h: '',
          r: (c) => (
            <SecondaryCTA
              sm={1}
              onClick={(e) => {
                e.stopPropagation();
                ctx.go({
                  page: page(c),
                  id: c.id,
                });
              }}
            >
              Open
            </SecondaryCTA>
          ),
        },
      ]}
      rows={L.map((c) => ({
        ...c,
        key: c.id,
      }))}
      onRow={(c) =>
        ctx.go({
          page: page(c),
          id: c.id,
        })
      }
      empty={<EmptyState tone="ok" icon="check" title="Nothing waiting here" />}
    />
  );
  if (kind)
    return (
      <div className="page">
        <PageHeader
          title={
            {
              cd1: 'CD1 applications',
              boe: 'Bills of Entry',
              clearance: 'Export clearance & release',
            }[kind]
          }
          sub={
            {
              cd1: 'Export declarations to the Reserve Bank of Zimbabwe through CEPECS.',
              boe: 'Customs declarations to ZIMRA through ASYCUDA.',
              clearance: 'Export readiness, release approval and final document packs.',
            }[kind]
          }
        />
        <div className="card">
          {tbl(
            listOf(
              {
                cd1: ['cd1'],
                boe: ['boe'],
                clearance: ['clr', 'rel'],
              }[kind],
            ),
          )}
        </div>
      </div>
    );
  return (
    <div className="page">
      <PageHeader
        eyebrow={`Welcome, ${userOf(s)}`}
        title="Regulatory Dashboard"
        sub="What is blocking CD1, Bill of Entry and export clearance, and who owns it."
      />
      {br.length ? (
        <Banner
          tone="bad"
          icon="clock"
          title={`${br.length} SLA breach${br.length > 1 ? 'es' : ''}`}
          text={br.map((c) => `${c.id}: ${STAGES[c.stage].name} ${slaOf(db, c).label}`).join(' · ')}
          actions={
            <PrimaryCTA
              onClick={() =>
                ctx.go({
                  page: page(br[0]),
                  id: br[0].id,
                })
              }
            >
              {'Open '}
              {br[0].id.slice(-9)}
            </PrimaryCTA>
          }
        />
      ) : null}
      <div className="kpis">
        <KpiCard
          label="CD1 Awaiting Submission"
          value={at('cd1', ['draft']).length}
          tone={at('cd1', ['draft']).length ? 'warn' : ''}
          onClick={() =>
            ctx.go({
              page: 'cd1',
            })
          }
        />
        <KpiCard label="CD1 with RBZ" value={at('cd1', ['submitted']).length} tone="info" />
        <KpiCard label="CD1 Queries" value={cons.filter((c) => c.v.c_status === 'Query').length} />
        <KpiCard
          label="BOE Awaiting Submission"
          value={at('boe', ['draft']).length}
          tone={at('boe', ['draft']).length ? 'warn' : ''}
          onClick={() =>
            ctx.go({
              page: 'boe',
            })
          }
        />
        <KpiCard label="BOE with ZIMRA" value={at('boe', ['submitted']).length} tone="info" />
        <KpiCard
          label="Export Clearance Pending"
          value={at('clr').length + at('rel').length}
          tone={at('clr').length + at('rel').length ? 'warn' : ''}
          onClick={() =>
            ctx.go({
              page: 'clearance',
            })
          }
        />
        <KpiCard label="SLA Breaches" value={br.length} tone={br.length ? 'bad' : 'ok'} />
      </div>
      <Card
        title="Regulatory work queue"
        sub="Every consignment in CD1, Bill of Entry, clearance or release, with the exact blocker."
      >
        {tbl(reg)}
      </Card>
      <div className="grid2">
        <Card title="Missing documents">
          {(() => {
            const L = reg.filter((c) => readiness(c).missing.some((k) => docState(c, k).st === 'Missing'));
            return L.length ? (
              <ul className="lst">
                {L.map((c) => {
                  const ms = readiness(c)
                    .missing.filter((k) => docState(c, k).st === 'Missing')
                    .map((k) => DOCS.find((d) => d[0] === k)[1]);
                  return (
                    <li key={c.id}>
                      <span
                        style={{
                          color: 'var(--bad)',
                        }}
                      >
                        <Icon n="file" />
                      </span>
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <b
                          style={{
                            display: 'block',
                            fontSize: '13.5px',
                          }}
                        >
                          {ms.join(', ')}
                        </b>
                        <small className="muted mono">
                          {c.id}
                          {' · owner '}
                          {P_(c).contact}
                        </small>
                      </div>
                      <SecondaryCTA
                        sm={1}
                        icon="send"
                        onClick={() =>
                          ctx.compose({
                            ccrn: c.id,
                            kind: 'Notify',
                            subject: `Action needed: ${ms[0]} for ${c.id}`,
                            body: `Export release for ${c.id} is waiting for your ${ms.join(', ')}. Please upload it in the producer portal.`,
                          })
                        }
                      >
                        Notify
                      </SecondaryCTA>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState tone="ok" icon="check" title="No missing documents" />
            );
          })()}
        </Card>
        <Card title="Regulatory exceptions">
          {(() => {
            const L = db.exc.filter((e) => e.owner === 'Compliance' && e.status !== 'Closed');
            return L.length ? (
              <div className="col">
                {L.map((e) => (
                  <ExceptionCard key={e.id} db={db} e={e} compact={1} onOpen={(x) => ctx.openExc(x.id)} />
                ))}
              </div>
            ) : (
              <EmptyState tone="ok" icon="shield" title="No open regulatory exceptions" />
            );
          })()}
        </Card>
      </div>
    </div>
  );
}

export function RegStatusRow({ states, cur }) {
  return (
    <div
      className="row"
      style={{
        gap: '4px',
      }}
    >
      {states.map((x) => (
        <span
          key={x}
          className={
            'chip ' +
            (x === cur
              ? x === 'Approved' || x === 'Released'
                ? 'ok'
                : x === 'Rejected'
                  ? 'bad'
                  : x === 'Query'
                    ? 'warn'
                    : 'info'
              : 'lite')
          }
          style={
            x === cur
              ? null
              : {
                  color: 'var(--ink-3)',
                  fontWeight: 500,
                }
          }
        >
          {x}
        </span>
      ))}
    </div>
  );
}

export function SlaPanel({ db, c, start, owner, party }) {
  const x = slaOf(db, c);
  if (!x) return null;
  const pct = Math.min(100, x.pct * 100);
  return (
    <div
      className="card flat"
      style={{
        padding: '14px 16px',
        borderColor: x.cls === 'bad' ? 'var(--bad)' : undefined,
      }}
    >
      <div className="row">
        <b>Service level</b>
        <span className="grow" />
        <StatusChip tone={x.cls === 'bad' ? 'bad' : x.cls === 'warn' ? 'warn' : 'ok'} icon="clock">
          {x.label}
        </StatusChip>
      </div>
      <div
        className="prog"
        style={{
          marginTop: '10px',
        }}
      >
        <div className="bar">
          <i
            style={{
              width: pct + '%',
              background: x.cls === 'bad' ? 'var(--bad)' : x.cls === 'warn' ? 'var(--warn)' : 'var(--ok)',
            }}
          />
        </div>
      </div>
      <div
        style={{
          marginTop: '10px',
        }}
      >
        <KV
          cls="two"
          rows={[
            ['Submitted', fmtDT(start)],
            ['SLA threshold', `${x.sla} h (${party})`],
            ['Elapsed', hrs(x.el)],
            ['Responsible owner', owner],
          ]}
        />
      </div>
    </div>
  );
}

export function Cd1Page({ db, s, ctx, id }) {
  const c = db.cons[id];
  const [busy, setBusy] = useState(false);
  const [esc, setEsc] = useState(false);
  const flash = ctx.flashFor('cd1');
  if (!c) return <NotFound ctx={ctx} />;
  if (flash)
    return [
      <ConsignmentHeader db={db} c={c} />,
      <div className="page narrow">
        <SuccessPanel
          {...flash}
          actions={[
            <PrimaryCTA
              onClick={() =>
                ctx.go({
                  page: 'boed',
                  id: c.id,
                })
              }
            >
              Prepare Bill of Entry
            </PrimaryCTA>,
            <SecondaryCTA
              onClick={() =>
                ctx.go({
                  page: 'home',
                })
              }
            >
              Back to dashboard
            </SecondaryCTA>,
          ]}
        />
      </div>,
    ];
  const inStage = STAGES[c.stage] && STAGES[c.stage].k === 'cd1';
  const x = calcInv(c);
  const p = P_(c);
  const up = db.integ.rbz !== 'down';
  const lic = new Date(p.licexp) > new Date();
  const checks = [
    [!!c.v.n_no, 'Invoice posted', c.v.n_no ? `${c.v.n_no} · ${usd(c.v.n_amount)}` : 'Waiting for Finance'],
    [true, 'Export value matches verified quantity', `${nf(x.q)} MT × ${usd(x.r)} = ${usd(x.gross)}`],
    [lic, 'Export licence valid', `${p.lic} until ${fmtD(p.licexp)}`],
    [true, 'Buyer and sales contract on file', `${B_(c).short} · ${c.v.d_contract}`],
    [true, 'Exporter bank confirmed', `${p.bank}, ${p.branch}`],
  ];
  const submit = () => {
    if (!up) {
      ctx.toast('RBZ CEPECS is unavailable. The CD1 was not submitted; try again shortly.', 'bad');
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      ctx.act('subCd1', c.id, null, null, 1);
      ctx.toast(`CD1 submitted to RBZ CEPECS. Reference ${refs(c).cep}.`, 'ok');
    }, 900);
  };
  const refresh = () => {
    if (!up) {
      ctx.toast('RBZ CEPECS is unavailable. Try again shortly.', 'bad');
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const stale = c.v.c_sub_at < Date.now() - 40 * H && !c.v.c_esc;
      if (stale) {
        ctx.toast('RBZ CEPECS: still Under Review. No decision yet.', '');
        return;
      }
      ctx.act('okCd1', c.id, null, 'cd1');
    }, 900);
  };
  const sub = c.sub === 'submitted';
  return [
    <ConsignmentHeader db={db} c={c} onOpen={() => ctx.openC(c.id)} />,
    <div className="page">
      <PageHeader
        eyebrow={[
          <button
            className="crumb"
            onClick={() =>
              ctx.go({
                page: 'cd1',
              })
            }
          >
            CD1
          </button>,
          ' / Stage 6 of 9',
        ]}
        title="CD1 export declaration"
        sub="Auto-populated from the verified consignment and the posted invoice. Check, then submit to the Reserve Bank."
      />
      {inStage && sub && slaOf(db, c).cls === 'bad' ? (
        <Banner
          tone="bad"
          icon="clock"
          title={`CD1 with RBZ ${slaOf(db, c).label}`}
          text={`Submitted ${fmtDT(c.v.c_sub_at)}. RBZ has not decided within the 48-hour service level. Owner: Farai Mlambo (MMCZ Compliance). Escalate to RBZ Exchange Control.`}
          actions={
            <PrimaryCTA icon="flag" onClick={() => setEsc(true)}>
              Escalate
            </PrimaryCTA>
          }
        />
      ) : null}
      {!inStage && c.v.c_status === 'Approved' ? (
        <Banner tone="ok" title="CD1 approved by RBZ" text={`${c.v.c_no} · ${c.v.c_ref} · ${fmtDT(c.v.c_dec_at)}`} />
      ) : null}
      <div className="split">
        <div
          className="col"
          style={{
            gap: '20px',
          }}
        >
          <ApprovalCard title="Validation" sub="Checked before submission" checks={checks} />
          <Card title="CD1 details" sub="Auto-populated">
            <KV
              rows={[
                ['CD1 number', c.v.c_no || refs(c).cd1],
                ['Exporter', p.name],
                ['Buyer', `${B_(c).name}, ${B_(c).country}`],
                ['Mineral', `${M(c).name} · HS ${M(c).hs}`],
                ['Quantity', nf(x.q) + ' MT'],
                ['Invoice', c.v.n_no],
                ['Invoice value (export)', usd(x.gross)],
                ['Payment terms', 'Cash against documents, 30 days'],
                ['Export licence', p.lic],
                ['Exporter bank', `${p.bank}, ${p.branch}`],
                ['Shipment', R_(c).mode],
                ['Destination', B_(c).country],
              ]}
            />
          </Card>
        </div>
        <aside className="sticky-r">
          <IntegrationCard
            db={db}
            sys="rbz"
            status={c.v.c_status || 'draft'}
            note="RBZ CEPECS remains the authoritative record of the CD1."
            rows={[
              ['Reference', c.v.c_ref || '—'],
              ['Submitted', c.v.c_sub_at ? fmtDT(c.v.c_sub_at) : '—'],
              ['Decision date', c.v.c_dec_at ? fmtDT(c.v.c_dec_at) : '—'],
              ['Query / response', c.v.c_query || 'None'],
            ]}
          >
            <RegStatusRow
              states={['Draft', 'Submitted', 'Under Review', 'Query', 'Approved', 'Rejected']}
              cur={c.v.c_status || 'Draft'}
            />
            {inStage ? (
              <div className="col">
                {!sub ? (
                  <PrimaryCTA
                    lg={1}
                    block={1}
                    icon="send"
                    busy={busy}
                    disabled={!checks.every((x) => x[0] === true)}
                    onClick={submit}
                  >
                    Submit to RBZ CEPECS
                  </PrimaryCTA>
                ) : (
                  <SecondaryCTA lg={1} block={1} icon="refresh" busy={busy} onClick={refresh}>
                    Refresh Status
                  </SecondaryCTA>
                )}
              </div>
            ) : null}
          </IntegrationCard>
          {inStage && sub ? (
            <SlaPanel db={db} c={c} start={c.v.c_sub_at} owner="Farai Mlambo · MMCZ Compliance" party="RBZ" />
          ) : null}
        </aside>
      </div>
      {esc ? (
        <Composer
          db={db}
          s={s}
          ctx={ctx}
          init={{
            ccrn: c.id,
            kind: 'Escalate',
            to: 'RBZ Exchange Control · CEPECS desk',
            subject: `Escalation: CD1 ${c.v.c_no} pending beyond SLA`,
            body: `CD1 ${c.v.c_no} (CEPECS ${c.v.c_ref}) for ${P_(c).name} was submitted on ${fmtDT(c.v.c_sub_at)} and is still Under Review. The shipment has a vessel cut-off at ${R_(c).port}. Please advise on the decision or any outstanding query.`,
          }}
          onClose={() => setEsc(false)}
        />
      ) : null}
    </div>,
  ];
}

export function boeChecks(c) {
  const p = P_(c);
  const lic = new Date(p.licexp) > new Date();
  const licDisp = new Date(p.licexp).getTime() >= N(c.v.d_dispatch);
  return [
    [!!c.v.n_no, 'Invoice approved', c.v.n_no || 'Invoice not posted'],
    [
      c.v.c_status === 'Approved' ? true : c.v.c_status ? 'wait' : false,
      'CD1 approved',
      c.v.c_status === 'Approved'
        ? `${c.v.c_no} · ${fmtD(c.v.c_dec_at)}`
        : c.v.c_status
          ? 'Pending with RBZ'
          : 'Not submitted',
    ],
    [
      lic ? (licDisp ? true : 'wait') : false,
      'Export licence valid',
      `${p.lic} until ${fmtD(p.licexp)}${lic && !licDisp ? ' · expires before dispatch' : ''}`,
    ],
    [!!c.v.evr_at, 'EVR approved', c.v.evr_no || 'Pending'],
    [!!c.v.i_qty, 'Verified quantity matches', `BOE ${nf(qtyOf(c))} MT = verified ${nf(c.v.i_qty)} MT`],
    [!!c.docs.pl, 'Packing list available', refs(c).pl],
  ];
}

export function BoePage({ db, s, ctx, id }) {
  const c = db.cons[id];
  const [busy, setBusy] = useState(false);
  const flash = ctx.flashFor('boe');
  if (!c) return <NotFound ctx={ctx} />;
  if (flash)
    return [
      <ConsignmentHeader db={db} c={c} />,
      <div className="page narrow">
        <SuccessPanel
          {...flash}
          actions={[
            <PrimaryCTA
              onClick={() =>
                ctx.go({
                  page: 'clrd',
                  id: c.id,
                })
              }
            >
              Check export readiness
            </PrimaryCTA>,
            <SecondaryCTA
              onClick={() =>
                ctx.go({
                  page: 'home',
                })
              }
            >
              Back to dashboard
            </SecondaryCTA>,
          ]}
        />
      </div>,
    ];
  const inStage = STAGES[c.stage] && STAGES[c.stage].k === 'boe';
  const p = P_(c),
    x = calcInv(c),
    R = refs(c);
  const up = db.integ.zimra !== 'down';
  const ch = boeChecks(c);
  const ok = ch.every(
    (z) => (z[0] !== false && z[0] !== 'wait') || (z[1] === 'Export licence valid' && z[0] === 'wait'),
  );
  const blocked =
    !ch[1][0] || ch[1][0] === 'wait'
      ? `Bill of Entry cannot be submitted because CD1 approval is still ${c.v.c_status ? 'pending with RBZ' : 'not submitted'}.`
      : !ch[0][0]
        ? 'Bill of Entry cannot be submitted because the invoice has not been posted in Minera ERP.'
        : ch[2][0] === false
          ? `Bill of Entry cannot be submitted because export licence ${p.lic} has expired.`
          : !ch[3][0]
            ? 'Bill of Entry cannot be submitted because the EVR has not been approved.'
            : null;
  const submit = () => {
    if (blocked) {
      ctx.toast(blocked, 'bad');
      return;
    }
    if (!up) {
      ctx.toast('ZIMRA ASYCUDA is unavailable. The Bill of Entry was not lodged; try again shortly.', 'bad');
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      ctx.act('subBoe', c.id, null, null, 1);
      ctx.toast(`Bill of Entry ${R.boe} lodged with ZIMRA ASYCUDA.`, 'ok');
    }, 900);
  };
  const refresh = () => {
    if (!up) {
      ctx.toast('ZIMRA ASYCUDA is unavailable. Try again shortly.', 'bad');
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      ctx.act('okBoe', c.id, null, 'boe');
    }, 900);
  };
  const sub = c.sub === 'submitted';
  return [
    <ConsignmentHeader db={db} c={c} onOpen={() => ctx.openC(c.id)} />,
    <div className="page">
      <PageHeader
        eyebrow={[
          <button
            className="crumb"
            onClick={() =>
              ctx.go({
                page: 'boe',
              })
            }
          >
            Bill of Entry
          </button>,
          ' / Stage 7 of 9',
        ]}
        title="Bill of Entry"
        sub="Export customs declaration to ZIMRA. Quantity and value follow the verified consignment."
      />
      {inStage && !sub && blocked ? <Banner tone="bad" title="Submission blocked" text={blocked} /> : null}
      {inStage && !sub && !blocked && ch[2][0] === 'wait' ? (
        <Banner
          tone="warn"
          title="Export licence expires before dispatch"
          text={`${p.lic} expires ${fmtD(p.licexp)}; planned dispatch is ${fmtD(c.v.d_dispatch)}. Confirm renewal with the producer.`}
        />
      ) : null}
      {!inStage && c.v.b_status === 'Released' ? (
        <Banner tone="ok" title="Released by ZIMRA" text={`${c.v.b_no} · ${fmtDT(c.v.b_rel_at)}`} />
      ) : null}
      <div className="split">
        <div
          className="col"
          style={{
            gap: '20px',
          }}
        >
          <ApprovalCard title="Pre-submission checklist" checks={ch} />
          <Card title="Bill of Entry details" sub="Auto-populated">
            <KV
              rows={[
                ['Exporter', p.name],
                ['Consignee', B_(c).name],
                ['Commodity', M(c).name],
                ['HS code', M(c).hs],
                ['Quantity', nf(x.q) + ' MT'],
                ['Value', usd(x.gross)],
                ['Currency', 'USD'],
                ['Origin', 'Zimbabwe'],
                ['Destination', B_(c).country],
                ['Customs office', R_(c).office],
                ['Invoice', c.v.n_no],
                ['CD1', c.v.c_no ? c.v.c_no + ' · ' + (c.v.c_status || '') : '—'],
                ['Export licence', p.lic],
                ['Packing list', R.pl],
              ]}
            />
          </Card>
        </div>
        <aside className="sticky-r">
          <IntegrationCard
            db={db}
            sys="zimra"
            status={c.v.b_status || 'draft'}
            note="ZIMRA ASYCUDA remains the authoritative customs record."
            rows={[
              ['BOE number', c.v.b_no || '—'],
              ['Submitted', c.v.b_sub_at ? fmtDT(c.v.b_sub_at) : '—'],
              ['Status', c.v.b_status || 'Draft'],
              ['Release date', c.v.b_rel_at ? fmtDT(c.v.b_rel_at) : '—'],
              ['Customs remarks', c.v.b_rem || '—'],
            ]}
          >
            {inStage ? (
              !sub ? (
                <PrimaryCTA lg={1} block={1} icon="send" busy={busy} disabled={!!blocked} onClick={submit}>
                  Submit to ZIMRA ASYCUDA
                </PrimaryCTA>
              ) : (
                <SecondaryCTA lg={1} block={1} icon="refresh" busy={busy} onClick={refresh}>
                  Refresh Status
                </SecondaryCTA>
              )
            ) : null}
          </IntegrationCard>
          {inStage && sub ? (
            <SlaPanel db={db} c={c} start={c.v.b_sub_at} owner="Farai Mlambo · MMCZ Compliance" party="ZIMRA" />
          ) : null}
        </aside>
      </div>
    </div>,
  ];
}

export function ClearancePage({ db, s, ctx, id }) {
  const c = db.cons[id];
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(false);
  const flash = ctx.flashFor('clr');
  if (!c) return <NotFound ctx={ctx} />;
  const r = readiness(c);
  const k = isDone(c) ? 'done' : STAGES[c.stage].k;
  if (flash)
    return [
      <ConsignmentHeader db={db} c={c} />,
      <div className="page narrow">
        <SuccessPanel
          {...flash}
          actions={
            flash.pack ? (
              [
                <PrimaryCTA icon="eye" onClick={() => ctx.viewDoc(c.id, 'pack')}>
                  View export pack
                </PrimaryCTA>,
                <SecondaryCTA icon="download" onClick={() => ctx.downloadPack(c.id)}>
                  Download PDF
                </SecondaryCTA>,
              ]
            ) : (
              <PrimaryCTA onClick={() => ctx.clearFlash()}>Continue to document release</PrimaryCTA>
            )
          }
        />
      </div>,
    ];
  const missNames = r.missing.map((m) => DOCS.find((d) => d[0] === m)[1]);
  const gen = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      ctx.act('pack', c.id, null, 'clr');
    }, 1100);
  };
  return [
    <ConsignmentHeader db={db} c={c} onOpen={() => ctx.openC(c.id)} />,
    <div className="page">
      <PageHeader
        eyebrow={[
          <button
            className="crumb"
            onClick={() =>
              ctx.go({
                page: 'clearance',
              })
            }
          >
            Export Clearance
          </button>,
          ' / Stage ',
          k === 'rel' ? 9 : 8,
          ' of 9',
        ]}
        title={k === 'rel' ? 'Document release' : k === 'done' ? 'Export pack released' : 'Export readiness'}
        sub={
          k === 'rel'
            ? 'Generate the final digital export pack and release it to the customer and agent.'
            : k === 'done'
              ? `Released ${fmtDT(c.v.p_at)} to ${B_(c).short} and ${B_(c).agent}.`
              : 'All mandatory documents must be complete before export release.'
        }
      />
      {k === 'clr' && r.done < r.tot ? (
        <Banner
          tone="bad"
          title="Export release is blocked"
          text={`${missNames.join(', ')} ${r.missing.length > 1 ? 'have' : 'has'} not been uploaded by ${P_(c).name}. Owner: ${P_(c).contact} (Producer).`}
          actions={
            <SecondaryCTA
              icon="send"
              onClick={() =>
                ctx.compose({
                  ccrn: c.id,
                  kind: 'Notify',
                  subject: `Action needed: ${missNames[0]} for ${c.id}`,
                  body: `Export release for ${c.id} is waiting for your ${missNames.join(', ')}. Please upload it in the producer portal today so the consignment can leave on schedule.`,
                })
              }
            >
              Notify producer
            </SecondaryCTA>
          }
        />
      ) : null}
      <div className="split">
        <div
          className="col"
          style={{
            gap: '20px',
          }}
        >
          <Card title="Export readiness">
            <ReadinessRing c={c} />
          </Card>
          <div className="docs">
            {DOCS.map((d) => (
              <DocumentCard
                key={d[0]}
                c={c}
                k={d[0]}
                onView={(x) => ctx.viewDoc(c.id, x)}
                onDownload={(x) => ctx.downloadDoc(c.id, x)}
                onUpload={(x) => ctx.upload(c.id, x)}
                canUpload={false}
              />
            ))}
          </div>
        </div>
        <aside className="sticky-r">
          {k === 'clr' ? (
            <ApprovalCard
              title="Approve export release"
              sub="Confirms customs exit and unlocks document release."
              checks={[
                [r.done === r.tot, 'Export pack complete', `${r.done} of ${r.tot} documents`],
                [c.v.b_status === 'Released', 'Bill of Entry released', c.v.b_no],
                [c.v.c_status === 'Approved', 'CD1 approved', c.v.c_no],
                [!openExc(db, c).some((e) => e.sev === 'High'), 'No high-risk exceptions open', ''],
              ]}
              blocked={r.done < r.tot ? `Upload of ${missNames.join(', ')} is outstanding.` : null}
              primary={
                <PrimaryCTA
                  lg={1}
                  icon="check"
                  disabled={r.done < r.tot}
                  onClick={() => ctx.act('clear', c.id, null, 'clr')}
                >
                  Approve Export Release
                </PrimaryCTA>
              }
            />
          ) : k === 'rel' ? (
            <Card title="Final digital export pack" sub={`${refs(c).pack} · cover page plus ${r.tot} documents`}>
              <ul className="chk">
                {DOCS.map((d) => (
                  <li key={d[0]}>
                    <span className="ck">
                      <Icon n="check" c="sm" s="2.6" />
                    </span>
                    <div>
                      <b>{d[1]}</b>
                      <small className="mono">{docState(c, d[0]).no}</small>
                    </div>
                  </li>
                ))}
              </ul>
              <div
                className="col"
                style={{
                  marginTop: '14px',
                }}
              >
                <PrimaryCTA lg={1} block={1} icon="package" busy={busy} onClick={gen}>
                  Generate Final Digital Export Pack
                </PrimaryCTA>
                <span className="help">
                  {'Released to '}
                  {B_(c).short}
                  {' and '}
                  {B_(c).agent}
                  {' through the shipment portal.'}
                </span>
              </div>
            </Card>
          ) : k === 'done' ? (
            <Card title="Released pack" sub={refs(c).pack}>
              <KV
                cls="two"
                rows={[
                  ['Generated', fmtDT(c.v.p_at)],
                  ['By', c.v.p_by],
                  ['Customs exit', c.v.x_exit],
                  ['Released to', B_(c).short],
                ]}
              />
              <div
                className="col"
                style={{
                  marginTop: '14px',
                }}
              >
                <PrimaryCTA icon="eye" onClick={() => ctx.viewDoc(c.id, 'pack')}>
                  View export pack
                </PrimaryCTA>
                <SecondaryCTA icon="download" onClick={() => ctx.downloadPack(c.id)}>
                  Download PDF
                </SecondaryCTA>
              </div>
            </Card>
          ) : (
            <Banner title="Not at export clearance yet" text={'Currently at ' + STAGES[c.stage].name + '.'} />
          )}
          <Card title="Route">
            <div
              className="ds-route"
              style={{
                fontSize: '13px',
              }}
            >
              {R_(c).nodes.map((n, i) => (
                <React.Fragment key={n}>
                  {i ? <Icon n="right" c="sm" /> : null}
                  <span>{n}</span>
                </React.Fragment>
              ))}
            </div>
            <div
              style={{
                marginTop: '12px',
              }}
            >
              <KV
                cls="two"
                rows={[
                  ['Border', R_(c).border],
                  ['Port', R_(c).port],
                  ['Vessel', R_(c).vessel],
                  ['Transporter', R_(c).transporter],
                ]}
              />
            </div>
          </Card>
        </aside>
      </div>
    </div>,
  ];
}
