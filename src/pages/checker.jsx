import { useState } from 'react';
import { ApprovalCard, TaskCard } from '../components/cards';
import { ConsignmentHeader } from '../components/ConsignmentHeader';
import { Icon } from '../components/Icon';
import { NotFound } from '../components/NotFound';
import {
  Banner,
  Card,
  ConfirmationModal,
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
import { DAY } from '../lib/constants';
import { slaOf, statusOf } from '../lib/derived';
import { N, ago, fmtD, fmtDT, nf, sameDay } from '../lib/format';
import { B_, M, P_, isDone } from '../lib/lifecycle';
import { orgName, routeLabel, userOf } from '../lib/masterData';

/* ================= PRODUCER CHECKER ================= */
export function CheckerHome({ db, s, cons, ctx }) {
  const rev = cons.filter((c) => c.stage === 0 && c.sub === 'review');
  const ret = cons.filter((c) => c.stage === 0 && c.sub === 'returned');
  const today = cons.filter((c) => c.v.k_at && sameDay(c.v.k_at, Date.now()));
  const upc = cons.filter((c) => !isDone(c) && (c.stage === 1 || c.stage === 2));
  return (
    <div className="page">
      <PageHeader
        eyebrow={`Welcome, ${userOf(s)} · ${orgName(s)}`}
        title="Declarations for approval"
        sub="Approve declarations before they go to MMCZ. Check stock, licence and documents first."
      />
      <div className="kpis">
        <KpiCard
          label="Awaiting My Approval"
          value={rev.length}
          tone={rev.length ? 'warn' : 'ok'}
          onClick={() =>
            ctx.go({
              page: 'queue',
            })
          }
        />
        <KpiCard
          label="Returned for Correction"
          value={ret.length}
          onClick={() =>
            ctx.go({
              page: 'returned',
            })
          }
        />
        <KpiCard label="Approved Today" value={today.length} tone="ok" />
        <KpiCard label="Upcoming Inspections" value={upc.length} tone="info" />
      </div>
      <section className="col">
        <h2
          style={{
            fontSize: '19px',
          }}
        >
          Awaiting my approval
        </h2>
        {rev.length ? (
          <div className="tasks">
            {rev.map((c) => (
              <TaskCard
                key={c.id}
                title="Review Declaration"
                ccrn={c.id}
                detail={`${nf(c.v.d_qty)} MT ${M(c).name} to ${B_(c).short}. Submitted by ${P_(c).contact} ${ago(c.v.d_sub_at)}.`}
                due={slaOf(db, c) ? slaOf(db, c).label : ''}
                dueTone={slaOf(db, c) && slaOf(db, c).cls === 'bad' ? 'bad' : ''}
                action="Review"
                onAction={() =>
                  ctx.go({
                    page: 'review',
                    id: c.id,
                  })
                }
              />
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              tone="ok"
              icon="check"
              title="Nothing waiting for you"
              text="New declarations from your export team appear here."
            />
          </div>
        )}
      </section>
      <Card title="Upcoming inspections">
        {upc.length ? (
          <DataTable
            cols={[
              {
                h: 'Consignment',
                r: (c) => <b className="mono">{c.id}</b>,
              },
              {
                h: 'Mineral',
                r: (c) => `${M(c).name} · ${nf(c.v.d_qty)} MT`,
              },
              {
                h: 'Inspection',
                r: (c) => (c.v.a_when ? fmtDT(c.v.a_when) : 'Requested ' + fmtD(c.v.d_insp)),
              },
              {
                h: 'Inspector',
                r: (c) => c.v.a_insp || <span className="muted">To be assigned</span>,
              },
              {
                h: 'Status',
                r: (c) => <StatusChip tone={statusOf(db, c).tone}>{statusOf(db, c).t}</StatusChip>,
              },
            ]}
            rows={upc.map((c) => ({
              ...c,
              key: c.id,
            }))}
            onRow={(c) => ctx.openC(c.id)}
          />
        ) : (
          <EmptyState icon="calendar" title="No inspections scheduled" />
        )}
      </Card>
    </div>
  );
}

export function CheckerList({ db, cons, ctx, kind }) {
  const L =
    kind === 'queue'
      ? cons.filter((c) => c.stage === 0 && c.sub === 'review')
      : kind === 'returned'
        ? cons.filter((c) => c.stage === 0 && c.sub === 'returned')
        : cons.filter((c) => c.v.k_at).sort((a, b) => b.v.k_at - a.v.k_at);
  const T = {
    queue: ['Review Queue', 'Declarations submitted by your export team.'],
    approved: ['Approved', 'Declarations you submitted to MMCZ.'],
    returned: ['Returned', 'Declarations sent back for correction.'],
  }[kind];
  return (
    <div className="page">
      <PageHeader title={T[0]} sub={T[1]} />
      <div className="card">
        <DataTable
          cols={[
            {
              h: 'Consignment',
              r: (c) => <b className="mono">{c.id}</b>,
            },
            {
              h: 'Mineral',
              r: (c) => M(c).name,
            },
            {
              h: 'Quantity',
              n: 1,
              r: (c) => nf(c.v.d_qty) + ' MT',
            },
            {
              h: 'Buyer',
              r: (c) => B_(c).short,
            },
            {
              h: kind === 'approved' ? 'Approved' : 'Submitted',
              r: (c) => fmtDT(kind === 'approved' ? c.v.k_at : c.v.d_sub_at),
            },
            {
              h: 'Status',
              r: (c) => <StatusChip tone={statusOf(db, c).tone}>{statusOf(db, c).t}</StatusChip>,
            },
            {
              h: '',
              r: (c) =>
                kind === 'queue' ? (
                  <PrimaryCTA
                    onClick={(e) => {
                      e.stopPropagation();
                      ctx.go({
                        page: 'review',
                        id: c.id,
                      });
                    }}
                  >
                    Review
                  </PrimaryCTA>
                ) : null,
            },
          ]}
          rows={L.map((c) => ({
            ...c,
            key: c.id,
          }))}
          onRow={(c) =>
            kind === 'queue'
              ? ctx.go({
                  page: 'review',
                  id: c.id,
                })
              : ctx.openC(c.id)
          }
          empty={<EmptyState tone="ok" icon="check" title="Nothing here" text="This list is empty." />}
        />
      </div>
    </div>
  );
}

export function ReviewPage({ db, s, ctx, id }) {
  const c = db.cons[id];
  const [ret, setRet] = useState(false);
  const flash = ctx.flashFor('review');
  if (flash)
    return [
      <ConsignmentHeader db={db} c={c} />,
      <div className="page narrow">
        <SuccessPanel
          {...flash}
          actions={
            <PrimaryCTA
              onClick={() =>
                ctx.go({
                  page: 'queue',
                })
              }
            >
              Back to review queue
            </PrimaryCTA>
          }
        />
      </div>,
    ];
  if (!c) return <NotFound ctx={ctx} />;
  const p = P_(c);
  const close = N(c.v.d_prod) + N(c.v.d_open) - N(c.v.d_dom) - N(c.v.d_qty);
  const bal = Math.abs(close - N(c.v.d_close_rec)) < 0.01;
  const lic = new Date(p.licexp) > new Date();
  const pending = c.stage === 0 && c.sub === 'review';
  const checks = [
    [lic, 'Export licence valid', `${p.lic} until ${fmtD(p.licexp)}`],
    [bal, 'Stock reconciles', `Closing ${nf(close)} MT = records ${nf(c.v.d_close_rec)} MT`],
    [
      N(c.v.d_qty) <= N(c.v.d_prod) + N(c.v.d_open) - N(c.v.d_dom),
      'Quantity available',
      `${nf(c.v.d_qty)} MT of ${nf(N(c.v.d_prod) + N(c.v.d_open) - N(c.v.d_dom))} MT available for export`,
    ],
    [!!c.docs.pl, 'Packing list attached', c.docs.pl && c.docs.pl.file],
    [
      c.docs.coo ? true : 'wait',
      'Certificate of Origin',
      c.docs.coo ? c.docs.coo.file : 'Can follow before export release',
    ],
    [!!c.docs.auth, 'Export authorisation attached', c.docs.auth && c.docs.auth.file],
  ];
  const ok = checks.every((x) => x[0] !== false);
  return [
    <ConsignmentHeader db={db} c={c} />,
    <div className="page">
      <PageHeader
        eyebrow={[
          <button
            className="crumb"
            onClick={() =>
              ctx.go({
                page: 'queue',
              })
            }
          >
            Review Queue
          </button>,
          ' / ',
          c.id,
        ]}
        title="Review declaration"
        sub={`Submitted by ${p.contact} ${c.v.d_sub_at ? fmtDT(c.v.d_sub_at) : ''}. Approving sends it to MMCZ and requests the inspection.`}
      />
      {!pending ? (
        <Banner
          title={c.stage > 0 ? 'Already approved' : 'Not awaiting approval'}
          text={
            c.stage > 0 ? `Approved by ${c.v.k_by} on ${fmtDT(c.v.k_at)}.` : 'This declaration is not in your queue.'
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
          <Card title="Declaration summary">
            <KV
              rows={[
                ['Mineral', M(c).name],
                ['Grade', c.v.d_grade],
                ['Quantity', nf(c.v.d_qty) + ' MT'],
                ['Buyer', B_(c).name],
                ['Destination', B_(c).country],
                ['Sales contract', c.v.d_contract],
                ['Expected dispatch', fmtD(c.v.d_dispatch)],
                ['Requested inspection', fmtD(c.v.d_insp)],
                ['Route', routeLabel(c.route)],
              ]}
            />
          </Card>
          <div className="grid2">
            <Card title="Licence validity">
              <div
                className="row"
                style={{
                  gap: '14px',
                }}
              >
                <span
                  className="ring"
                  style={{
                    '--p': lic ? 100 : 0,
                    '--rc': 'var(--ok)',
                    width: '64px',
                    height: '64px',
                  }}
                  data-l={lic ? '✓' : '!'}
                />
                <div>
                  <b
                    style={{
                      display: 'block',
                    }}
                  >
                    {p.lic}
                  </b>
                  <span className="muted">
                    {'Valid until '}
                    {fmtD(p.licexp)}
                    {' · '}
                    {Math.max(0, Math.round((new Date(p.licexp) - Date.now()) / DAY))}
                    {' days left'}
                  </span>
                </div>
              </div>
            </Card>
            <Card title="Stock reconciliation">
              <KV
                cls="two"
                rows={[
                  ['Production', nf(c.v.d_prod) + ' MT'],
                  ['Opening stock', nf(c.v.d_open) + ' MT'],
                  ['Domestic allocation', nf(c.v.d_dom) + ' MT'],
                  ['Export (this consignment)', nf(c.v.d_qty) + ' MT'],
                  ['Closing (computed)', nf(close) + ' MT'],
                  ['Closing (records)', nf(c.v.d_close_rec) + ' MT'],
                ]}
              />
              <div
                style={{
                  marginTop: '12px',
                }}
              >
                <StatusChip tone={bal ? 'ok' : 'bad'} icon={bal ? 'check' : 'alert'}>
                  {bal ? 'Balanced' : 'Does not reconcile'}
                </StatusChip>
              </div>
            </Card>
          </div>
          <Card title="Required documents">
            <div className="col">
              {[
                ['pl', 'Packing list'],
                ['coo', 'Certificate of Origin'],
                ['auth', 'Export authorisation'],
              ].map(([k, l]) => (
                <div key={k} className={'upl' + (c.docs[k] ? ' done' : '')}>
                  <span className="fi">
                    <Icon n={c.docs[k] ? 'check' : 'clock'} />
                  </span>
                  <div
                    style={{
                      minWidth: 0,
                    }}
                  >
                    <b>{l}</b>
                    <small>{c.docs[k] ? c.docs[k].file : 'Not attached yet'}</small>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <aside className="sticky-r">
          <ApprovalCard
            title="Approval"
            sub="All checks must pass before submission to MMCZ."
            checks={checks}
            primary={
              pending ? (
                <PrimaryCTA
                  lg={1}
                  icon="send"
                  disabled={!ok}
                  onClick={() => ctx.act('approveDecl', c.id, null, 'review')}
                >
                  {'Approve & Submit to MMCZ'}
                </PrimaryCTA>
              ) : null
            }
            secondary={
              pending ? (
                <SecondaryCTA lg={1} onClick={() => setRet(true)}>
                  Return for Correction
                </SecondaryCTA>
              ) : null
            }
          />
        </aside>
      </div>
      {ret ? (
        <ConfirmationModal
          title="Return for correction"
          text={`${c.id} goes back to ${p.contact} with your reason.`}
          reason={1}
          reasonLabel="What needs to change?"
          confirm="Return for Correction"
          onClose={() => setRet(false)}
          onConfirm={(r) => {
            setRet(false);
            ctx.act('returnDecl', c.id, r, 'review');
          }}
        />
      ) : null}
    </div>,
  ];
}
