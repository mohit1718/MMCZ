import { useState } from 'react';
import { IntegrationCard } from '../components/cards';
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
  Skeleton,
  StatusChip,
  SuccessPanel,
} from '../components/primitives';
import { Composer } from '../layout/NotificationDrawer';
import { nextOwner, openExc, statusOf } from '../lib/derived';
import { fmtDT, nf, sameDay } from '../lib/format';
import { M, P_, assayFails, assayRows, isDone } from '../lib/lifecycle';
import { userOf } from '../lib/masterData';
import STAGES from '../data/stages.json';

/* ================= LAB / ASSAY ================= */
export function LabHome({ db, s, cons, ctx, kind }) {
  const A = cons.filter((c) => !isDone(c) && STAGES[c.stage].k === 'assay');
  const recv = A.filter((c) => c.sub === 'received');
  const tod = A.filter((c) => sameDay(c.stageStart, Date.now()) || c.sub === 'results');
  const appr = A.filter((c) => c.sub === 'evr');
  const out = A.filter((c) => ['attention', 'retest'].includes(c.sub));
  const comp = cons.filter((c) => c.v.evr_at).sort((a, b) => b.v.evr_at - a.v.evr_at);
  const rows =
    kind === 'completed'
      ? comp
      : A.sort(
          (a, b) =>
            ['attention', 'evr', 'results', 'received', 'retest'].indexOf(a.sub) -
            ['attention', 'evr', 'results', 'received', 'retest'].indexOf(b.sub),
        );
  const tbl = (
    <DataTable
      cols={[
        {
          h: 'Sample ID',
          r: (c) => [
            <b className="mono">{c.samples[0] ? c.samples[0].id.slice(-13) : '—'}</b>,
            <span className="sub">
              {c.samples.length}
              {' sample'}
              {c.samples.length === 1 ? '' : 's'}
              {' · '}
              {c.samples.map((x) => x.seal).join(', ')}
            </span>,
          ],
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
          h: 'Mineral',
          r: (c) => M(c).name,
        },
        {
          h: 'Received',
          r: (c) => fmtDT(c.stageStart + 40 * 6e4),
        },
        {
          h: 'Priority',
          r: (c) => (openExc(db, c).length ? <StatusChip tone="bad">High</StatusChip> : 'Normal'),
        },
        {
          h: 'Status',
          r: (c) => (
            <StatusChip
              tone={
                kind === 'completed'
                  ? 'ok'
                  : c.sub === 'attention' || c.sub === 'retest'
                    ? 'bad'
                    : c.sub === 'evr'
                      ? 'warn'
                      : 'info'
              }
            >
              {kind === 'completed' ? 'EVR ' + c.v.evr_no : statusOf(db, c).t}
            </StatusChip>
          ),
        },
      ]}
      rows={rows.map((c) => ({
        ...c,
        key: c.id,
      }))}
      onRow={(c) =>
        ctx.go({
          page: 'assay',
          id: c.id,
        })
      }
      empty={
        <EmptyState
          tone="ok"
          icon="flask"
          title="No samples waiting"
          text="Samples appear here when inspectors dispatch them."
        />
      }
    />
  );
  if (kind)
    return (
      <div className="page">
        <PageHeader
          title={kind === 'completed' ? 'Completed assays' : 'Sample queue'}
          sub={
            kind === 'completed'
              ? 'Export Verification Reports approved by the laboratory.'
              : 'Samples received from field inspections, by priority.'
          }
        />
        <div className="card">{tbl}</div>
      </div>
    );
  return (
    <div className="page">
      <PageHeader
        eyebrow={`Welcome, ${userOf(s)}`}
        title="Laboratory"
        sub="Test samples, flag anything outside tolerance and approve Export Verification Reports."
      />
      <div className="kpis">
        <KpiCard
          label="Samples Awaiting Test"
          value={recv.reduce((a, c) => a + c.samples.length, 0)}
          sub={recv.length + ' consignment' + (recv.length === 1 ? '' : 's')}
          tone="info"
        />
        <KpiCard label="Testing Today" value={tod.length} />
        <KpiCard label="Awaiting Approval" value={appr.length} tone={appr.length ? 'warn' : ''} />
        <KpiCard label="Outside Tolerance" value={out.length} tone={out.length ? 'bad' : 'ok'} />
        <KpiCard label="Completed" value={comp.length} sub="EVRs approved" tone="ok" />
      </div>
      {out.length ? (
        <Banner
          tone="bad"
          title={`${out.length} consignment${out.length > 1 ? 's' : ''} outside tolerance`}
          text={out
            .map((c) => {
              const f = assayFails(c)[0];
              return `${c.id}: ${f ? f.lab + ' ' + f.t + (f.u === '%' ? '%' : '') + ' vs ' + f.d + ' ± ' + f.tol : 're-test in progress'}`;
            })
            .join(' · ')}
          actions={
            <PrimaryCTA
              onClick={() =>
                ctx.go({
                  page: 'assay',
                  id: out[0].id,
                })
              }
            >
              Review result
            </PrimaryCTA>
          }
        />
      ) : null}
      <Card title="Sample queue">{tbl}</Card>
    </div>
  );
}

export function AssayPage({ db, s, ctx, id }) {
  const c = db.cons[id];
  const [busy, setBusy] = useState(false);
  const [mod, setMod] = useState(null);
  const flash = ctx.flashFor('assay');
  if (flash)
    return [
      <ConsignmentHeader db={db} c={c} />,
      <div className="page narrow">
        <SuccessPanel
          {...flash}
          actions={[
            <PrimaryCTA onClick={() => ctx.viewDoc(c.id, 'evr')}>View EVR</PrimaryCTA>,
            <SecondaryCTA
              onClick={() =>
                ctx.go({
                  page: 'home',
                })
              }
            >
              Back to laboratory
            </SecondaryCTA>,
          ]}
        />
      </div>,
    ];
  if (!c) return <NotFound ctx={ctx} />;
  const inStage = STAGES[c.stage] && STAGES[c.stage].k === 'assay';
  const rows = assayRows(c);
  const fails = rows.filter((r) => r.st === 'fail');
  const has = !!c.v.lims_at;
  const lims = db.integ.lims !== 'down';
  const blockExc = openExc(db, c).filter((e) => e.sev === 'High' && e.type !== 'Assay Outside Tolerance');
  const read = () => {
    if (!lims) {
      ctx.toast('MMCZ LIMS is unavailable. Try again shortly.', 'bad');
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      ctx.act('lims', c.id, null, null, 1);
      ctx.toast('Results read from LIMS for ' + c.samples.length + ' samples.', 'ok');
    }, 900);
  };
  let primary = null,
    secondary = [];
  if (inStage) {
    if (c.sub === 'received') {
      primary = (
        <PrimaryCTA lg={1} icon="db" busy={busy} onClick={read}>
          Read Results from LIMS
        </PrimaryCTA>
      );
    } else if (c.sub === 'results') {
      primary = (
        <PrimaryCTA lg={1} icon="send" onClick={() => ctx.act('submitResult', c.id, null, null, 1)}>
          Submit Result
        </PrimaryCTA>
      );
      secondary = [
        ['Request Re-test', 'retest'],
        ['Escalate', 'escalate'],
      ];
    } else if (c.sub === 'attention') {
      primary = (
        <PrimaryCTA lg={1} icon="refresh" onClick={() => setMod('retest')}>
          Request Re-test
        </PrimaryCTA>
      );
      secondary = [['Escalate', 'escalate']];
    } else if (c.sub === 'evr') {
      primary = (
        <PrimaryCTA
          lg={1}
          icon="check"
          disabled={blockExc.length > 0}
          onClick={() => ctx.act('approveEvr', c.id, null, 'assay')}
        >
          Approve EVR
        </PrimaryCTA>
      );
      secondary = [['Generate Export Verification Report', 'preview']];
    } else if (c.sub === 'retest') {
      secondary = [['Escalate', 'escalate']];
    }
  }
  return [
    <ConsignmentHeader db={db} c={c} onOpen={() => ctx.openC(c.id)} />,
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
            Sample Queue
          </button>,
          ' / Stage 4 of 9 · Assay',
        ]}
        title="Assay verification"
        sub={`${M(c).grade}. Tolerances come from the ${M(c).name} assay template.`}
      />
      {c.sub === 'attention' ? (
        <Banner
          tone="bad"
          title={`${fails.length} parameter${fails.length > 1 ? 's' : ''} outside tolerance`}
          text={
            fails
              .map(
                (f) =>
                  `${f.lab}: tested ${f.t}${f.u === '%' ? '%' : ' ' + f.u}, declared ${f.d}${f.u === '%' ? '%' : ''} ± ${f.tol}`,
              )
              .join('; ') +
            '. Request a re-test of the retained samples or escalate. The consignment cannot move to invoicing.'
          }
        />
      ) : null}
      {c.sub === 'retest' ? (
        <Banner
          tone="warn"
          icon="pause"
          title="Consignment on hold · re-test in progress"
          text={`${c.hold ? c.hold.reason + '. ' : ''}Retained samples are being re-tested. Next: laboratory confirms the re-test result (Chipo Mapfumo).`}
        />
      ) : null}
      {blockExc.length && c.sub === 'evr' ? (
        <Banner
          tone="bad"
          title="EVR approval is blocked"
          text={`Revenue assurance exception ${blockExc[0].id} (${blockExc[0].type}) is open. It must be accepted or resolved by ${blockExc[0].owner} before the EVR can be approved.`}
          actions={
            <SecondaryCTA sm={1} onClick={() => ctx.openExc(blockExc[0].id)}>
              View exception
            </SecondaryCTA>
          }
        />
      ) : null}
      {!inStage && c.v.evr_at ? (
        <Banner
          tone="ok"
          title={'EVR ' + c.v.evr_no + ' approved'}
          text={`Approved by ${c.v.evr_by}, ${fmtDT(c.v.evr_at)}.`}
        />
      ) : null}
      <div className="split">
        <div
          className="col"
          style={{
            gap: '20px',
          }}
        >
          <Card
            title="Assay results"
            right={
              has ? (
                <span
                  className="muted"
                  style={{
                    fontSize: '12.5px',
                  }}
                >
                  {'From LIMS · '}
                  {fmtDT(c.v.lims_at)}
                </span>
              ) : null
            }
          >
            {has ? (
              <div className="tw">
                <table className="dt">
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th className="n">Declared</th>
                      <th className="n">Tested</th>
                      <th className="n">Tolerance</th>
                      <th className="n">Variance</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.k} className={r.st === 'fail' ? 'failrow' : ''}>
                        <td>
                          <b>{r.lab}</b>
                          <span className="sub">{r.u}</span>
                        </td>
                        <td className="n">{r.d}</td>
                        <td className="n">
                          <b>{r.t}</b>
                        </td>
                        <td className="n">
                          {'± '}
                          {r.tol}
                        </td>
                        <td className="n">
                          {r.dev > 0 ? '+' : ''}
                          {(+r.dev).toFixed(Math.abs(r.dev) < 1 ? 3 : 2)}
                        </td>
                        <td>
                          <span className={'res ' + (r.st === 'pass' ? 'ok' : r.st === 'attn' ? 'warn' : 'bad')}>
                            <Icon n={r.st === 'pass' ? 'check' : r.st === 'attn' ? 'alert' : 'x'} c="sm" s="2.6" />
                            {r.st === 'pass' ? 'Pass' : r.st === 'attn' ? 'Attention' : 'Fail'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : busy ? (
              <Skeleton rows={5} />
            ) : (
              <EmptyState
                icon="flask"
                title="Results not read yet"
                text={
                  lims
                    ? 'Samples are logged in LIMS. Read the results when testing is complete.'
                    : 'MMCZ LIMS is unavailable right now. Results will be readable when it reconnects.'
                }
                tone={lims ? '' : 'bad'}
              />
            )}
          </Card>
          <Card title="Samples received">
            <DataTable
              cols={[
                {
                  h: 'Sample ID',
                  r: (x) => <span className="mono">{x.id}</span>,
                },
                {
                  h: 'Seal',
                  r: (x) => <span className="mono">{x.seal}</span>,
                },
                {
                  h: 'Quantity',
                  r: (x) => x.qty,
                },
                {
                  h: 'Taken',
                  r: (x) => fmtDT(x.at),
                },
              ]}
              rows={c.samples.map((x) => ({
                ...x,
                key: x.id,
              }))}
            />
          </Card>
        </div>
        <aside className="sticky-r">
          <Card title="Decision" sub={inStage ? nextOwner(c).what : 'No action needed'}>
            <KV
              cls="two"
              rows={[
                ['Inspection result', c.v.i_result],
                ['Verified quantity', nf(c.v.i_qty) + ' MT'],
                ['Inspector', c.v.i_by],
                ['Samples', c.samples.length],
              ]}
            />
            <div
              className="col"
              style={{
                marginTop: '16px',
              }}
            >
              {primary}
              {secondary.map(([l, k]) => (
                <SecondaryCTA
                  key={k}
                  block={1}
                  onClick={() => (k === 'preview' ? ctx.viewDoc(c.id, 'evr') : setMod(k))}
                >
                  {l}
                </SecondaryCTA>
              ))}
            </div>
          </Card>
          <IntegrationCard
            db={db}
            sys="lims"
            status={has ? 'results received' : 'awaiting results'}
            note="Results are read directly from the laboratory system. Manual entry is not allowed."
          />
        </aside>
      </div>
      {mod === 'retest' ? (
        <ConfirmationModal
          title="Request re-test"
          text="The consignment is held and the retained samples are re-tested."
          reason={1}
          defaultReason={
            fails.length
              ? `${fails[0].lab} outside tolerance on first test. Re-test retained samples ${c.samples.map((x) => x.id.slice(-3)).join(' and ')}.`
              : ''
          }
          confirm="Request Re-test"
          onClose={() => setMod(null)}
          onConfirm={(r) => {
            setMod(null);
            ctx.act('retest', c.id, r, null, 1);
            ctx.toast('Re-test requested. Consignment on hold and producer informed.', 'ok');
          }}
        />
      ) : null}
      {mod === 'escalate' ? (
        <Composer
          db={db}
          s={s}
          ctx={ctx}
          init={{
            ccrn: c.id,
            kind: 'Escalate',
            to: 'Kudakwashe Moyo · General Manager, Operations',
            body: `Assay result for ${c.id} needs a decision. ${fails.map((f) => `${f.lab} tested ${f.t} against ${f.d} ± ${f.tol}`).join('; ')}.`,
          }}
          onClose={() => setMod(null)}
        />
      ) : null}
    </div>,
  ];
}
