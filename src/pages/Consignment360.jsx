import React, { useState } from 'react';
import { ActivityTimeline, DocumentCard, ExceptionCard, IntegrationCard, ReadinessRing } from '../components/cards';
import { ConsignmentHeader } from '../components/ConsignmentHeader';
import { Icon } from '../components/Icon';
import { LifecycleStepper } from '../components/Lifecycle';
import { NotFound } from '../components/NotFound';
import {
  Banner,
  Card,
  DataTable,
  EmptyState,
  Ghost,
  KV,
  PageHeader,
  PrimaryCTA,
  SecondaryCTA,
  Tabs,
} from '../components/primitives';
import { nextOwner, openExc, readiness, slaOf, statusOf } from '../lib/derived';
import { fmtD, fmtDT, nf, usd, usdc } from '../lib/format';
import { B_, COMM, M, P_, R_, VAT, assayRows, calcInv, isDone, qtyOf, refs, variance } from '../lib/lifecycle';
import { routeLabel } from '../lib/masterData';
import { NAV } from '../lib/navigation';
import { RegStatusRow } from './compliance';
import DOCS from '../data/documentTypes.json';
import PERSONAS from '../data/personas.json';
import STAGES from '../data/stages.json';

/* ================= CONSIGNMENT 360 ================= */
export function C360({ db, s, cons, ctx, id, tab0 }) {
  const c = db.cons[id];
  const ext = PERSONAS[s.persona].ext;
  const [tab, setTab] = useState(tab0 || 'Overview');
  if (!c || !cons.some((x) => x.id === id)) return <NotFound ctx={ctx} />;
  const R = refs(c),
    x = calcInv(c),
    r = readiness(c),
    st = statusOf(db, c),
    no = nextOwner(c),
    sl = slaOf(db, c),
    ex = openExc(db, c);
  const tabs = ext
    ? ['Overview', 'Timeline', 'Documents']
    : [
        'Overview',
        'Timeline',
        'Documents',
        'Inspection',
        'Assay',
        'Commercial',
        'Regulatory',
        ...(s.persona === 'executive' || s.persona === 'compliance' || s.persona === 'admin' ? ['Audit'] : []),
      ];
  const task = myTaskRoute(s, c);
  const missDocs =
    STAGES[c.stage] && STAGES[c.stage].k === 'clr' && r.done < 8
      ? `Export pack ${r.done}/8: ${r.missing.map((k) => DOCS.find((d) => d[0] === k)[1]).join(', ')} missing`
      : null;
  const blocked = ext
    ? missDocs
    : c.hold
      ? `On hold: ${c.hold.reason}`
      : c.sub === 'attention'
        ? 'Assay result outside tolerance'
        : sl && sl.cls === 'bad'
          ? `${STAGES[c.stage].name} ${sl.label}`
          : STAGES[c.stage] && STAGES[c.stage].k === 'clr' && r.done < 8
            ? `Export pack ${r.done}/8: ${r.missing.map((k) => DOCS.find((d) => d[0] === k)[1]).join(', ')} missing`
            : null;
  const sum = (
    <div
      className="grid2"
      style={{
        gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
      }}
    >
      <Card title="Consignment">
        <KV
          cls="two"
          rows={[
            ['Producer', P_(c).short],
            ['Mine', P_(c).mine],
            ['Declared', nf(c.v.d_qty) + ' MT'],
            ['Verified', c.v.i_qty ? nf(c.v.i_qty) + ' MT' : 'Pending'],
            ['Buyer', B_(c).short],
            ['Destination', B_(c).country],
          ]}
        />
      </Card>
      {ext ? null : (
        <Card title="Commercial">
          <KV
            cls="two"
            rows={[
              ['Rate', usd(x.r) + '/MT'],
              ['Export value', usdc(x.gross)],
              ['Invoice', c.v.n_no || 'Pending'],
              ['Invoice total', c.v.n_amount ? usd(c.v.n_amount) : '—'],
            ]}
          />
        </Card>
      )}
      <Card title="Regulatory">
        <KV
          cls="two"
          rows={[
            ['CD1', c.v.c_status || 'Not started'],
            ['CD1 ref', c.v.c_ref || '—'],
            ['Bill of Entry', c.v.b_status || 'Not started'],
            ['Customs exit', c.v.x_exit || '—'],
          ]}
        />
      </Card>
      <Card title="Export pack">
        <div
          className="row"
          style={{
            gap: '14px',
            flexWrap: 'nowrap',
          }}
        >
          <span
            className="ring"
            style={{
              '--p': Math.round((r.done / r.tot) * 100),
              '--rc': r.done === r.tot ? 'var(--ok)' : 'var(--blue)',
              width: '60px',
              height: '60px',
            }}
            data-l={r.done + '/' + r.tot}
          />
          <div>
            <b>{isDone(c) ? 'Released' : r.done === r.tot ? 'Complete' : 'In progress'}</b>
            <div
              className="muted"
              style={{
                fontSize: '12.5px',
              }}
            >
              {isDone(c) ? R.pack : r.missing.length + ' outstanding'}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
  let body;
  if (tab === 'Overview')
    body = (
      <div
        className="col"
        style={{
          gap: '20px',
        }}
      >
        {sum}
        {!ext && ex.length ? (
          <div className="col">
            <h3
              style={{
                fontSize: '16px',
              }}
            >
              Open exceptions
            </h3>
            <div className="tasks">
              {ex.map((e) => (
                <ExceptionCard key={e.id} db={db} e={e} onOpen={(y) => ctx.openExc(y.id)} />
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid2">
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
                  ['Port of loading', R_(c).port],
                  ['Discharge', R_(c).discharge],
                  ['Expected dispatch', fmtD(c.v.d_dispatch)],
                ]}
              />
            </div>
          </Card>
          <Card title="Recent activity" right={<Ghost onClick={() => setTab('Timeline')}>Full timeline</Ghost>}>
            <ActivityTimeline items={c.tl.filter((t) => !ext || t.ext)} limit={5} />
          </Card>
        </div>
      </div>
    );
  else if (tab === 'Timeline')
    body = (
      <Card>
        <ActivityTimeline items={c.tl.filter((t) => !ext || t.ext)} />
      </Card>
    );
  else if (tab === 'Documents')
    body = (
      <div
        className="col"
        style={{
          gap: '20px',
        }}
      >
        <Card>
          <ReadinessRing c={c} />
          {isDone(c) ? (
            <div
              className="row"
              style={{
                marginTop: '14px',
              }}
            >
              <PrimaryCTA icon="eye" onClick={() => ctx.viewDoc(c.id, 'pack')}>
                View final export pack
              </PrimaryCTA>
              <SecondaryCTA icon="download" onClick={() => ctx.downloadPack(c.id)}>
                Download PDF
              </SecondaryCTA>
            </div>
          ) : null}
        </Card>
        <div className="docs">
          {DOCS.map((d) => (
            <DocumentCard
              key={d[0]}
              c={c}
              k={d[0]}
              canUpload={s.persona === 'producer'}
              onView={(k) => ctx.viewDoc(c.id, k)}
              onDownload={(k) => ctx.downloadDoc(c.id, k)}
              onUpload={(k) => ctx.upload(c.id, k)}
            />
          ))}
        </div>
      </div>
    );
  else if (tab === 'Inspection')
    body = c.v.ir_no ? (
      <div className="grid2">
        <Card title={'Request & assignment'}>
          <KV
            cls="two"
            rows={[
              ['Request', c.v.ir_no],
              ['Requested date', fmtD(c.v.d_insp)],
              ['Inspector', c.v.a_insp || 'Unassigned'],
              ['Scheduled', c.v.a_when ? fmtDT(c.v.a_when) : '—'],
              ['Assigned by', c.v.a_by || '—'],
              ['Instructions', c.v.a_instr || '—'],
            ]}
          />
        </Card>
        <Card title="Field inspection">
          {c.v.i_at ? (
            <KV
              cls="two"
              rows={[
                ['Inspection', c.v.insp_no],
                ['Completed', fmtDT(c.v.i_at)],
                ['Declared', nf(c.v.d_qty) + ' MT'],
                ['Verified', nf(c.v.i_qty) + ' MT'],
                [
                  'Variance',
                  (() => {
                    const v = variance(c);
                    return v ? `${nf(v.diff)} MT / ${v.pct.toFixed(1)}%` : '—';
                  })(),
                ],
                ['Result', c.v.i_result],
                ['Sampling', c.v.i_method],
                ['Samples', c.samples.map((s) => s.id.slice(-3) + ' (' + s.seal + ')').join(', ')],
                ['Evidence', `${c.v.i_photos} photos · GPS ${c.v.i_gps}`],
                ['Remarks', c.v.i_remarks || '—'],
              ]}
            />
          ) : (
            <EmptyState icon="clip" title="Not inspected yet" />
          )}
        </Card>
      </div>
    ) : (
      <div className="card">
        <EmptyState
          icon="clip"
          title="No inspection request yet"
          text="Created when the producer checker submits the declaration."
        />
      </div>
    );
  else if (tab === 'Assay')
    body = c.v.lims_at ? (
      <Card title="Assay results" sub={`From LIMS · ${fmtDT(c.v.lims_at)}`}>
        <DataTable
          cols={[
            {
              h: 'Parameter',
              r: (r) => <b>{r.lab}</b>,
            },
            {
              h: 'Declared',
              n: 1,
              r: (r) => r.d,
            },
            {
              h: 'Tested',
              n: 1,
              r: (r) => r.t,
            },
            {
              h: 'Tolerance',
              n: 1,
              r: (r) => '± ' + r.tol,
            },
            {
              h: 'Result',
              r: (r) => (
                <span className={'res ' + (r.st === 'pass' ? 'ok' : r.st === 'attn' ? 'warn' : 'bad')}>
                  {r.st === 'pass' ? 'Pass' : r.st === 'attn' ? 'Attention' : 'Fail'}
                </span>
              ),
            },
          ]}
          rows={assayRows(c).map((r) => ({
            ...r,
            key: r.k,
          }))}
        />
      </Card>
    ) : (
      <div className="card">
        <EmptyState icon="flask" title="No assay results yet" />
      </div>
    );
  else if (tab === 'Commercial')
    body = (
      <div className="grid2">
        <Card title="Invoice calculation">
          <KV
            cls="two"
            rows={[
              ['Verified quantity', nf(x.q) + ' MT'],
              ['Rate', usd(x.r)],
              ['Gross export value', usd(x.gross)],
              ['Commission (' + COMM + '%)', usd(x.comm)],
              ['Other charges', usd(x.fee)],
              ['VAT (' + VAT + '%)', usd(x.vat)],
              ['Invoice total', usd(x.total)],
              ['Sales contract', c.v.d_contract],
            ]}
          />
        </Card>
        <IntegrationCard
          db={db}
          sys="erp"
          status={c.v.n_status || 'not sent'}
          rows={[
            ['Invoice number', c.v.n_no || '—'],
            ['Invoice date', c.v.n_date ? fmtD(c.v.n_date) : '—'],
            ['Amount', c.v.n_amount ? usd(c.v.n_amount) : '—'],
            ['ERP status', c.v.n_status || 'Not sent'],
          ]}
          note="Minera ERP remains the system of record."
        />
      </div>
    );
  else if (tab === 'Regulatory')
    body = (
      <div className="grid2">
        <IntegrationCard
          db={db}
          sys="rbz"
          status={c.v.c_status || 'not started'}
          rows={[
            ['CD1 number', c.v.c_no || '—'],
            ['CEPECS reference', c.v.c_ref || '—'],
            ['Submitted', c.v.c_sub_at ? fmtDT(c.v.c_sub_at) : '—'],
            ['Decision', c.v.c_dec_at ? fmtDT(c.v.c_dec_at) : '—'],
          ]}
        >
          <RegStatusRow
            states={['Draft', 'Submitted', 'Under Review', 'Query', 'Approved', 'Rejected']}
            cur={c.v.c_status || 'Draft'}
          />
        </IntegrationCard>
        <IntegrationCard
          db={db}
          sys="zimra"
          status={c.v.b_status || 'not started'}
          rows={[
            ['BOE number', c.v.b_no || '—'],
            ['Submitted', c.v.b_sub_at ? fmtDT(c.v.b_sub_at) : '—'],
            ['Released', c.v.b_rel_at ? fmtDT(c.v.b_rel_at) : '—'],
            ['Customs exit', c.v.x_exit || '—'],
          ]}
        />
      </div>
    );
  else
    body = (
      <Card title="Audit trail" sub="Every change and decision on this consignment">
        <DataTable
          cols={[
            {
              h: 'When',
              r: (a) => (
                <span
                  className="mono"
                  style={{
                    fontSize: '12.5px',
                  }}
                >
                  {fmtDT(a.at)}
                </span>
              ),
            },
            {
              h: 'User / system',
              r: (a) => a.by,
            },
            {
              h: 'Action',
              r: (a) => <b>{a.action}</b>,
            },
            {
              h: 'Detail',
              r: (a) => a.detail,
            },
          ]}
          rows={[...c.audit]
            .sort((a, b) => b.at - a.at)
            .map((a, i) => ({
              ...a,
              key: i,
            }))}
        />
      </Card>
    );
  return [
    <ConsignmentHeader db={db} c={c} ext={ext && s.persona === 'customer'} />,
    <div className="page">
      <PageHeader
        eyebrow={[
          <button
            className="crumb"
            onClick={() =>
              ctx.go({
                page: NAV[s.persona].some((n) => n[0] === 'list') ? 'list' : 'home',
              })
            }
          >
            {NAV[s.persona].some((n) => n[0] === 'list')
              ? ext
                ? 'My Consignments'
                : 'Consignments'
              : NAV[s.persona][0][1]}
          </button>,
          ' / Consignment 360',
        ]}
        title={`${nf(qtyOf(c))} MT ${M(c).name} for ${B_(c).short}`}
        sub={`${P_(c).name} · ${P_(c).mine} · ${routeLabel(c.route)}`}
        actions={[
          ext ? null : (
            <SecondaryCTA
              icon="send"
              onClick={() =>
                ctx.compose({
                  ccrn: c.id,
                  kind: 'Notify',
                })
              }
            >
              Notify
            </SecondaryCTA>
          ),
          <SecondaryCTA
            icon="clock"
            onClick={() =>
              ctx.setDrawer({
                k: 'notif',
                ccrn: c.id,
              })
            }
          >
            Activity
          </SecondaryCTA>,
          task ? (
            <PrimaryCTA icon="arrow" onClick={() => ctx.go(task.r)}>
              {task.l}
            </PrimaryCTA>
          ) : null,
        ]}
      />
      <Card bodyCls="">
        <LifecycleStepper db={db} c={c} />
        <div
          style={{
            marginTop: '18px',
          }}
        >
          {isDone(c) ? (
            <Banner
              tone="ok"
              title="Export completed"
              text={`Documents released ${fmtDT(c.v.p_at)} to ${B_(c).short} and ${B_(c).agent}.`}
            />
          ) : blocked ? (
            <Banner tone="bad" title={'Blocked: ' + blocked} text={`Next: ${no.what} · Owner: ${no.who}`} />
          ) : (
            <Banner
              tone=""
              icon="arrow"
              title={st.t}
              text={`Next: ${no.what} · Owner: ${no.who}${sl ? ' · ' + sl.label : ''}`}
            />
          )}
        </div>
      </Card>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {body}
    </div>,
  ];
}

export function myTaskRoute(s, c) {
  if (isDone(c))
    return s.persona === 'compliance'
      ? {
          l: 'View released pack',
          r: {
            page: 'clrd',
            id: c.id,
          },
        }
      : null;
  const k = STAGES[c.stage].k;
  const p = s.persona;
  const m = {
    producer:
      k === 'decl' && c.sub !== 'review'
        ? ['Open Declaration', 'declare']
        : k === 'clr' && !c.docs.coo
          ? ['Upload Certificate of Origin', 'docs']
          : null,
    checker: k === 'decl' && c.sub === 'review' ? ['Review declaration', 'review'] : null,
    coordinator: k === 'req' ? ['Assign Inspector', 'home'] : null,
    inspector: k === 'insp' ? ['Start Inspection', 'inspect'] : null,
    lab: k === 'assay' ? ['Open assay', 'assay'] : null,
    finance: k === 'inv' ? ['Open invoice', 'invoice'] : null,
    compliance: {
      cd1: ['Open CD1', 'cd1d'],
      boe: ['Open Bill of Entry', 'boed'],
      clr: ['Export readiness', 'clrd'],
      rel: ['Document release', 'clrd'],
    }[k],
  };
  const x = m[p];
  return x
    ? {
        l: x[0],
        r: {
          page: x[1],
          id: c.id,
        },
      }
    : null;
}
