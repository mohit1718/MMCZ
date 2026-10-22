import { useState } from 'react';
import { ExceptionCard, IntegrationCard, TaskCard } from '../components/cards';
import { ConsignmentHeader } from '../components/ConsignmentHeader';
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
import { slaOf, statusOf } from '../lib/derived';
import { N, ago, fmtD, fmtDT, initials, nf, sameDay, usd, usdc } from '../lib/format';
import { B_, COMM, M, P_, VAT, assayFails, calcInv, isDone, qtyOf } from '../lib/lifecycle';
import { userOf } from '../lib/masterData';
import PERSONAS from '../data/personas.json';
import STAGES from '../data/stages.json';

/* ================= FINANCE ================= */
export function FinanceHome({ db, s, cons, ctx, kind }) {
  const I = cons.filter((c) => !isDone(c) && STAGES[c.stage].k === 'inv');
  const ready = I.filter((c) => c.sub !== 'erp');
  const proc = I.filter((c) => c.sub === 'erp');
  const posted = cons.filter((c) => c.v.n_no).sort((a, b) => b.v.n_date - a.v.n_date);
  const today = posted.filter((c) => sameDay(c.v.n_date, Date.now()));
  const exc = db.exc.filter((e) => e.owner === 'Finance' && e.status !== 'Closed');
  const invT = (
    <DataTable
      cols={[
        {
          h: 'Invoice',
          r: (c) => <b className="mono">{c.v.n_no}</b>,
        },
        {
          h: 'Consignment',
          r: (c) => <span className="mono">{c.id}</span>,
        },
        {
          h: 'Producer',
          r: (c) => P_(c).short,
        },
        {
          h: 'Quantity',
          n: 1,
          r: (c) => nf(qtyOf(c)) + ' MT',
        },
        {
          h: 'Export value',
          n: 1,
          r: (c) => usd(c.v.n_gross),
        },
        {
          h: 'Invoice total',
          n: 1,
          r: (c) => <b>{usd(c.v.n_amount)}</b>,
        },
        {
          h: 'Date',
          r: (c) => fmtD(c.v.n_date),
        },
        {
          h: 'ERP',
          r: (c) => <StatusChip tone="ok">Posted</StatusChip>,
        },
      ]}
      rows={posted.map((c) => ({
        ...c,
        key: c.id,
      }))}
      onRow={(c) =>
        ctx.go({
          page: 'invoice',
          id: c.id,
        })
      }
    />
  );
  const awT = (
    <DataTable
      cols={[
        {
          h: 'Consignment',
          r: (c) => <b className="mono">{c.id}</b>,
        },
        {
          h: 'Producer',
          r: (c) => P_(c).short,
        },
        {
          h: 'Mineral',
          r: (c) => M(c).name,
        },
        {
          h: 'Verified',
          n: 1,
          r: (c) => nf(qtyOf(c)) + ' MT',
        },
        {
          h: 'EVR',
          r: (c) => c.v.evr_no,
        },
        {
          h: 'Status',
          r: (c) => <StatusChip tone={c.sub === 'erp' ? 'warn' : 'info'}>{statusOf(db, c).t}</StatusChip>,
        },
        {
          h: '',
          r: (c) => (
            <PrimaryCTA
              onClick={(e) => {
                e.stopPropagation();
                ctx.go({
                  page: 'invoice',
                  id: c.id,
                });
              }}
            >
              {c.sub === 'erp' ? 'Check status' : 'Create invoice'}
            </PrimaryCTA>
          ),
        },
      ]}
      rows={I.map((c) => ({
        ...c,
        key: c.id,
      }))}
      onRow={(c) =>
        ctx.go({
          page: 'invoice',
          id: c.id,
        })
      }
      empty={
        <EmptyState
          tone="ok"
          icon="check"
          title="Nothing awaiting invoice"
          text="Consignments appear here when the laboratory approves the EVR."
        />
      }
    />
  );
  if (kind === 'awaiting')
    return (
      <div className="page">
        <PageHeader title="Awaiting invoice" sub="Consignments with an approved EVR." />
        <div className="card">{awT}</div>
      </div>
    );
  if (kind === 'invoices')
    return (
      <div className="page">
        <PageHeader title="Invoices" sub="Posted in Minera ERP, the system of record for MMCZ invoices." />
        <div className="card">{invT}</div>
      </div>
    );
  const first = ready[0] || proc[0];
  const erpUp = db.integ.erp !== 'down';
  return (
    <div className="page">
      <PageHeader
        eyebrow={`Welcome, ${userOf(s)}`}
        title="Finance Dashboard"
        sub="Invoice verified consignments through Minera ERP."
        actions={
          first ? (
            <PrimaryCTA
              lg={1}
              icon="receipt"
              onClick={() =>
                ctx.go({
                  page: 'invoice',
                  id: first.id,
                })
              }
            >
              Process Invoice
            </PrimaryCTA>
          ) : null
        }
      />
      <div className="kpis">
        <KpiCard
          label="Awaiting Invoice"
          value={ready.length}
          tone={ready.length ? 'warn' : 'ok'}
          onClick={() =>
            ctx.go({
              page: 'awaiting',
            })
          }
        />
        <KpiCard label="Awaiting Approval" value={proc.length} sub="Processing in Minera ERP" />
        <KpiCard label="Posted Today" value={today.length} tone="ok" />
        <KpiCard label="Invoice Exceptions" value={exc.length} tone={exc.length ? 'bad' : 'ok'} />
        <KpiCard
          label="Export Value Today"
          value={usdc(today.reduce((a, c) => a + N(c.v.n_gross), 0))}
          sub="Gross value invoiced"
        />
      </div>
      <section className="col">
        <h2
          style={{
            fontSize: '19px',
          }}
        >
          Ready for invoicing
        </h2>
        {I.length ? (
          <div className="tasks">
            {I.map((c) => (
              <TaskCard
                key={c.id}
                title={c.sub === 'erp' ? 'Confirm Invoice from Minera ERP' : 'Create Invoice'}
                ccrn={c.id}
                detail={`${nf(qtyOf(c))} MT ${M(c).name} verified · EVR ${c.v.evr_no} · estimated invoice ${usd(calcInv(c).total)}`}
                due={slaOf(db, c) ? slaOf(db, c).label : ''}
                dueTone={slaOf(db, c) && slaOf(db, c).cls}
                action={c.sub === 'erp' ? 'Check Status' : 'Process Invoice'}
                icon="receipt"
                onAction={() =>
                  ctx.go({
                    page: 'invoice',
                    id: c.id,
                  })
                }
              />
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState tone="ok" icon="check" title="No consignments waiting" text="You're all caught up." />
          </div>
        )}
      </section>
      <div className="split">
        <Card title="Recently posted">
          <DataTable
            cols={[
              {
                h: 'Invoice',
                r: (c) => [<b className="mono">{c.v.n_no}</b>, <span className="sub mono">{c.id}</span>],
              },
              {
                h: 'Producer',
                r: (c) => P_(c).short,
              },
              {
                h: 'Invoice total',
                n: 1,
                r: (c) => [<b>{usd(c.v.n_amount)}</b>, <span className="sub">{fmtD(c.v.n_date)}</span>],
              },
              {
                h: 'ERP',
                r: (c) => <StatusChip tone="ok">Posted</StatusChip>,
              },
            ]}
            rows={posted.slice(0, 6).map((c) => ({
              ...c,
              key: c.id,
            }))}
            onRow={(c) =>
              ctx.go({
                page: 'invoice',
                id: c.id,
              })
            }
          />
        </Card>
        <div
          className="col"
          style={{
            gap: '20px',
          }}
        >
          <IntegrationCard
            db={db}
            sys="erp"
            status={erpUp ? 'last sync 2 min ago' : 'unreachable'}
            rows={[
              ['Requests today', String(proc.length + today.length)],
              ['Posted today', String(today.length)],
              ['Processing', String(proc.length)],
              ['Failed today', '0'],
            ]}
            note="Minera ERP remains the system of record."
          />
          <Card title="Finance exceptions">
            {exc.length ? (
              <div className="col">
                {exc.map((e) => (
                  <ExceptionCard key={e.id} db={db} e={e} compact={1} onOpen={(x) => ctx.openExc(x.id)} />
                ))}
              </div>
            ) : (
              <EmptyState
                tone="ok"
                icon="shield"
                title="No invoice exceptions"
                text="Invoice values reconcile to verified quantities."
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export function InvoicePage({ db, s, ctx, id }) {
  const c = db.cons[id];
  const [busy, setBusy] = useState(false);
  const flash = ctx.flashFor('invoice');
  if (!c) return <NotFound ctx={ctx} />;
  const x = calcInv(c);
  const inStage = STAGES[c.stage] && STAGES[c.stage].k === 'inv';
  const up = db.integ.erp !== 'down';
  if (flash)
    return [
      <ConsignmentHeader db={db} c={c} />,
      <div className="page narrow">
        <SuccessPanel
          {...flash}
          actions={[
            <PrimaryCTA icon="eye" onClick={() => ctx.viewDoc(c.id, 'inv')}>
              View invoice
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
  const send = () => {
    if (!up) {
      ctx.toast('Minera ERP is unavailable. Your invoice request was not sent; try again shortly.', 'bad');
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      ctx.act('sendInv', c.id, null, null, 1);
      ctx.toast('Invoice request accepted by Minera ERP. Refresh to collect the invoice.', 'ok');
    }, 800);
  };
  const refresh = () => {
    if (!up) {
      ctx.toast('Minera ERP is unavailable. Try again shortly.', 'bad');
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      ctx.act('postInv', c.id, null, 'invoice');
    }, 900);
  };
  const lines = [
    ['Verified quantity', nf(x.q) + ' MT', 'From EVR ' + (c.v.evr_no || '')],
    ['Rate', usd(x.r) + ' / MT', 'Contract ' + c.v.d_contract],
    ['Currency', 'USD', ''],
    ['Gross export value', usd(x.gross), 'Basis for commission'],
    ['Tariff / commission', usd(x.comm), `${COMM}% marketing commission`],
    ['Other charges', usd(x.fee), 'Inspection and assay fee'],
    ['Tax', usd(x.vat), `VAT ${VAT}% on commission and charges`],
  ];
  return [
    <ConsignmentHeader db={db} c={c} onOpen={() => ctx.openC(c.id)} />,
    <div className="page">
      <PageHeader
        eyebrow={[
          <button
            className="crumb"
            onClick={() =>
              ctx.go({
                page: 'awaiting',
              })
            }
          >
            Awaiting Invoice
          </button>,
          ' / Stage 5 of 9 · Invoice',
        ]}
        title="Invoice"
        sub="Invoice values follow the verified quantity, never the declared quantity."
      />
      {!inStage && c.v.n_no ? (
        <Banner
          tone="ok"
          title={`Invoice ${c.v.n_no} posted`}
          text={`${usd(c.v.n_amount)} · ${fmtDT(c.v.n_date)} · Minera ERP`}
        />
      ) : null}
      <div className="split">
        <div
          className="col"
          style={{
            gap: '20px',
          }}
        >
          <Card title="Verified consignment">
            <KV
              rows={[
                ['Producer', P_(c).name],
                ['Mineral', `${M(c).name} · ${M(c).grade}`],
                ['Declared quantity', nf(c.v.d_qty) + ' MT'],
                [
                  'Verified quantity',
                  <span
                    style={{
                      color: 'var(--ok)',
                    }}
                  >
                    {nf(qtyOf(c))}
                    {' MT'}
                  </span>,
                ],
                ['EVR', c.v.evr_no ? `${c.v.evr_no} · approved ${fmtD(c.v.evr_at)}` : 'Pending'],
                ['Assay', assayFails(c).length ? 'Outside tolerance' : 'All parameters within tolerance'],
                ['Buyer', B_(c).name],
                ['Sales contract', c.v.d_contract],
              ]}
            />
          </Card>
          <Card title="Invoice calculation">
            <div className="tw">
              <table className="dt">
                <tbody>
                  {lines.map(([a, b, n]) => (
                    <tr key={a}>
                      <td>
                        <b>{a}</b>
                        {n ? <span className="sub">{n}</span> : null}
                      </td>
                      <td className="n">{b}</td>
                    </tr>
                  ))}
                  <tr>
                    <td
                      style={{
                        borderTop: '2px solid var(--ink)',
                      }}
                    >
                      <b
                        style={{
                          fontFamily: 'var(--f-display)',
                          fontSize: '16px',
                        }}
                      >
                        Invoice total
                      </b>
                    </td>
                    <td
                      className="n"
                      style={{
                        borderTop: '2px solid var(--ink)',
                      }}
                    >
                      <b
                        style={{
                          fontFamily: 'var(--f-display)',
                          fontSize: '20px',
                        }}
                      >
                        {usd(x.total)}
                      </b>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
        <aside className="sticky-r">
          <IntegrationCard
            db={db}
            sys="erp"
            status={
              c.v.n_status === 'Posted'
                ? 'last sync ' + ago(c.v.n_date)
                : c.v.n_status === 'Processing'
                  ? 'request sent ' + ago(c.v.n_req_at)
                  : 'ready'
            }
            note="Minera ERP remains the system of record."
            rows={[
              ['Invoice number', c.v.n_no || '—'],
              ['Invoice date', c.v.n_date ? fmtD(c.v.n_date) : '—'],
              ['Invoice amount', c.v.n_amount ? usd(c.v.n_amount) : '—'],
              [
                'Invoice PDF',
                c.v.n_no ? (
                  <button className="crumb" onClick={() => ctx.viewDoc(c.id, 'inv')}>
                    {c.v.n_no}.pdf
                  </button>
                ) : (
                  '—'
                ),
              ],
              [
                'ERP status',
                <StatusChip tone={c.v.n_status === 'Posted' ? 'ok' : c.v.n_status === 'Processing' ? 'warn' : ''}>
                  {c.v.n_status === 'Processing' ? 'Processing' : c.v.n_status || 'Not sent'}
                </StatusChip>,
              ],
            ]}
          >
            {inStage ? (
              <div className="col">
                {c.sub !== 'erp' ? (
                  <PrimaryCTA lg={1} block={1} icon="send" busy={busy} onClick={send}>
                    Send Invoice Request
                  </PrimaryCTA>
                ) : (
                  <PrimaryCTA lg={1} block={1} icon="refresh" busy={busy} onClick={refresh}>
                    Refresh Status
                  </PrimaryCTA>
                )}
                {c.sub !== 'erp' ? (
                  <SecondaryCTA
                    block={1}
                    icon="refresh"
                    onClick={() => ctx.toast('Minera ERP: no invoice exists yet for this consignment.', '')}
                  >
                    Refresh Status
                  </SecondaryCTA>
                ) : null}
              </div>
            ) : null}
          </IntegrationCard>
          {inStage ? (
            <div className="next">
              <span
                className="avatar"
                style={{
                  width: '32px',
                  height: '32px',
                  fontSize: '11px',
                }}
              >
                {initials(PERSONAS.compliance.user)}
              </span>
              <div>
                <small>After posting</small>
                <b>Compliance prepares the CD1</b>
                <span
                  className="muted"
                  style={{
                    fontSize: '13px',
                  }}
                >
                  Farai Mlambo · MMCZ Compliance
                </span>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>,
  ];
}
