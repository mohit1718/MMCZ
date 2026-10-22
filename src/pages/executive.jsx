import { useState } from 'react';
import { ExceptionCard } from '../components/cards';
import { Bullets, Columns, HBars } from '../components/charts';
import { MiniLifecycle, stepState } from '../components/Lifecycle';
import {
  Banner,
  Card,
  DataTable,
  FilterBar,
  Ghost,
  KpiCard,
  PageHeader,
  PrimaryCTA,
  SecondaryCTA,
  StatusChip,
} from '../components/primitives';
import { YEAR } from '../lib/constants';
import { nextOwner, riskOf, slaOf, statusOf } from '../lib/derived';
import { N, fmtD, nf, usd, usdc } from '../lib/format';
import { M, P_, isDone, qtyOf, rateOf } from '../lib/lifecycle';
import BOTTLENECKS from '../data/bottlenecks.json';
import PRODUCERS from '../data/producers.json';
import ROUTES from '../data/routes.json';
import STAGES from '../data/stages.json';
import BY_MINERAL from '../data/valueByMineral.json';
import YTD_MONTHS from '../data/ytdMonths.json';

export const YTD_VALUE = YTD_MONTHS.reduce((a, m) => a + m[1], 0);

export function ExecutiveHome({ db, s, cons, ctx }) {
  const act = cons.filter((c) => !isDone(c));
  const br = act.filter((c) => {
    const x = slaOf(db, c);
    return x && x.cls === 'bad';
  });
  const open = db.exc.filter((e) => e.status !== 'Closed');
  const risk = open.reduce((a, e) => a + N(e.impact), 0);
  const stageCounts = STAGES.map((st, i) => ({
    l: st.name,
    v: act.filter((c) => c.stage === i).length,
    k: st.k,
    c: act.some((c) => c.stage === i && stepState(db, c, i) === 'exc') ? 'var(--bad)' : 'var(--seq4)',
    tip: act
      .filter((c) => c.stage === i)
      .map((c) => c.id.slice(-9))
      .join(', '),
  }));
  const avg = YTD_MONTHS.map((_, i) => {
    const sl = YTD_MONTHS.slice(Math.max(0, i - 2), i + 1);
    return sl.reduce((a, x) => a + x[1], 0) / sl.length;
  });
  const worst = BOTTLENECKS.filter((b) => b.actual > b.target).sort(
    (a, b) => b.actual / b.target - a.actual / a.target,
  )[0];
  const prods = Object.values(PRODUCERS).map((p) => {
    const pc = cons.filter((c) => c.pid === p.id);
    return {
      p,
      act: pc.filter((c) => !isDone(c)).length,
      exc: open.filter((e) => pc.some((c) => c.id === e.ccrn)).length,
      risk: open.filter((e) => pc.some((c) => c.id === e.ccrn)).reduce((a, e) => a + N(e.impact), 0),
      ytd: {
        'PRD-0031': [34, 9.1, 97],
        'PRD-0012': [28, 10.4, 89],
        'PRD-0044': [19, 11.8, 91],
        'PRD-0058': [12, 10.2, 95],
      }[p.id],
    };
  });
  return (
    <div className="page">
      <PageHeader
        eyebrow={`Control Tower · ${fmtD(Date.now())}`}
        title="Export Control Tower"
        sub="State of every consignment, where it is stuck and what is at risk."
        actions={
          <SecondaryCTA
            icon="box"
            onClick={() =>
              ctx.go({
                page: 'list',
              })
            }
          >
            All consignments
          </SecondaryCTA>
        }
      />
      <Banner
        tone={br.length || risk ? 'warn' : 'ok'}
        icon="info"
        title={`${act.length} active consignments · ${br.length} SLA breach${br.length === 1 ? '' : 'es'} · ${usdc(risk)} at risk`}
        text={
          worst
            ? `Biggest bottleneck: ${worst.l}, averaging ${worst.actual} h against a ${worst.target} h SLA. ${open.filter((e) => e.sev === 'High').length} high-risk exceptions need decisions.`
            : ''
        }
        actions={
          <PrimaryCTA
            onClick={() =>
              ctx.go({
                page: 'exceptions',
              })
            }
          >
            Review exceptions
          </PrimaryCTA>
        }
      />
      <div className="kpis k4">
        <KpiCard
          label="Active Consignments"
          value={act.length}
          sub={`${cons.filter(isDone).length} released`}
          tone="info"
          onClick={() =>
            ctx.go({
              page: 'list',
            })
          }
        />
        <KpiCard label="SLA Breaches" value={br.length} sub="Live consignments" tone={br.length ? 'bad' : 'ok'} />
        <KpiCard
          label="Open Exceptions"
          value={open.length}
          sub={open.filter((e) => e.sev === 'High').length + ' high risk'}
          tone={open.length ? 'warn' : 'ok'}
          onClick={() =>
            ctx.go({
              page: 'exceptions',
            })
          }
        />
        <KpiCard
          label="Potential Revenue at Risk"
          value={usdc(risk)}
          sub="Open exceptions"
          tone="bad"
          onClick={() =>
            ctx.go({
              page: 'exceptions',
            })
          }
        />
      </div>
      <div className="kpis k3">
        <KpiCard
          label="Export Value YTD"
          value={'US$\u00a0' + YTD_VALUE.toFixed(1) + 'M'}
          sub="+18% on last year"
          tone="ok"
        />
        <KpiCard label="Quantity Exported" value="186,420 MT" sub="Year to date" />
        <KpiCard label="Average End-to-End TAT" value="9.6 days" sub="Target 12 days" tone="ok" />
      </div>
      <div className="grid2">
        <Card
          title="Consignments by stage"
          sub="Live consignments. Red marks a stage with a breach or high-risk exception."
        >
          <HBars
            data={stageCounts}
            fmt={(v) => v}
            onClick={(d) =>
              ctx.go({
                page: 'list',
                stage: d.k,
              })
            }
          />
        </Card>
        <Card
          title="Priority exceptions"
          right={
            <Ghost
              icon="right"
              onClick={() =>
                ctx.go({
                  page: 'exceptions',
                })
              }
            >
              All
            </Ghost>
          }
        >
          <div className="col">
            {open
              .sort((a, b) => N(b.impact) - N(a.impact))
              .slice(0, 3)
              .map((e) => (
                <ExceptionCard key={e.id} db={db} e={e} compact={1} onOpen={(x) => ctx.openExc(x.id)} />
              ))}
          </div>
        </Card>
      </div>
      <div className="grid2">
        <Card title="Monthly export trend" sub={`US$ million, ${YEAR}. October is month to date.`}>
          <Columns
            x={YTD_MONTHS.map((m) => m[0])}
            values={YTD_MONTHS.map((m) => m[1])}
            avg={avg}
            fmt={(v) => '$' + (+v).toFixed(v % 1 ? 1 : 0) + 'M'}
            highlightLast={1}
          />
        </Card>
        <Card title="Export value by mineral" sub="Year to date, US$ million">
          <HBars
            data={BY_MINERAL.map(([l, v], i) => ({
              l,
              v,
              c: 'var(--s1)',
            }))}
            fmt={(v) => '$' + v.toFixed(1) + 'M'}
          />
        </Card>
      </div>
      <div className="grid2">
        <Card title="Regulatory bottlenecks" sub="Average hours in stage over the last 30 days against SLA.">
          <Bullets rows={BOTTLENECKS} />
        </Card>
        <Card title="Export corridors" sub="Live consignments by route">
          <RouteView cons={act} />
        </Card>
      </div>
      <Card title="Producer performance" sub="Year to date with live exceptions">
        <DataTable
          cols={[
            {
              h: 'Producer',
              r: (x) => [<b>{x.p.name}</b>, <span className="sub">{x.p.mine}</span>],
            },
            {
              h: 'Consignments YTD',
              n: 1,
              r: (x) => x.ytd[0],
            },
            {
              h: 'Active',
              n: 1,
              r: (x) => x.act,
            },
            {
              h: 'Avg TAT',
              n: 1,
              r: (x) => x.ytd[1] + ' days',
            },
            {
              h: 'First-time right',
              n: 1,
              r: (x) => x.ytd[2] + '%',
            },
            {
              h: 'Open exceptions',
              n: 1,
              r: (x) => (x.exc ? <StatusChip tone="warn">{x.exc}</StatusChip> : '0'),
            },
            {
              h: 'Value at risk',
              n: 1,
              r: (x) =>
                x.risk ? (
                  <b
                    style={{
                      color: 'var(--bad)',
                    }}
                  >
                    {usd(x.risk)}
                  </b>
                ) : (
                  '—'
                ),
            },
          ]}
          rows={prods.map((x) => ({
            ...x,
            key: x.p.id,
          }))}
        />
      </Card>
    </div>
  );
}

export function RouteView({ cons }) {
  const lines = [
    {
      k: 'li',
      y: 50,
      lbl: 'Lithium corridor',
    },
    {
      k: 'fc',
      y: 130,
      lbl: 'Ferrochrome to China',
    },
    {
      k: 'fc2',
      y: 210,
      lbl: 'Ferrochrome to Europe',
    },
  ];
  const W = 620;
  const xs = [40, 170, 300, 430, 570];
  return (
    <svg
      className="route"
      viewBox={`0 0 ${W} 250`}
      role="img"
      aria-label="Export corridors with live consignment counts"
    >
      {lines.map((L) => {
        const n = cons.filter((c) => c.route === L.k).length;
        const nodes = ROUTES[L.k].nodes;
        return (
          <g key={L.k}>
            <text x="40" y={L.y - 22} className="nt b">
              {L.lbl}
            </text>
            <line x1={xs[0]} x2={xs[4]} y1={L.y} y2={L.y} className={'rl' + (n ? ' on' : '')} />
            {nodes.map((nd, i) => (
              <g key={i}>
                <circle cx={xs[i]} cy={L.y} r="6" className="nd" />
                <text x={xs[i]} y={L.y + 22} textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'} className="nt">
                  {nd.replace(', Shurugwi', '')}
                </text>
              </g>
            ))}
            <g>
              <rect x={W - 46} y={L.y - 34} width="40" height="22" rx="11" className="cnt" />
              <text x={W - 26} y={L.y - 19} textAnchor="middle" className="cntt">
                {n}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

export function ExecList({ db, s, cons, ctx, stage }) {
  const [q, setQ] = useState('');
  const [st, setSt] = useState(stage || 'all');
  const L = cons
    .filter((c) => st === 'all' || (st === 'done' ? isDone(c) : !isDone(c) && STAGES[c.stage].k === st))
    .filter(
      (c) =>
        !q ||
        (c.id + P_(c).name + M(c).name + (c.v.n_no || '') + (c.v.b_no || '') + (c.v.c_no || ''))
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort((a, b) => a.stage - b.stage || b.seq - a.seq);
  return (
    <div className="page">
      <PageHeader title="Consignments" sub="Every consignment with its stage, status, service level and risk." />
      <FilterBar q={q} setQ={setQ} placeholder="Search ID, producer, invoice, CD1, BOE">
        <select
          id="ex-stage"
          className="in"
          style={{
            width: 'auto',
          }}
          value={st}
          onChange={(e) => setSt(e.target.value)}
        >
          <option value="all">All stages</option>
          {STAGES.map((x) => (
            <option key={x.k} value={x.k}>
              {x.name}
            </option>
          ))}
          <option value="done">Released</option>
        </select>
      </FilterBar>
      <div className="card">
        <DataTable
          cols={[
            {
              h: 'Consignment',
              r: (c) => [<b className="mono">{c.id}</b>, <span className="sub">{P_(c).short}</span>],
            },
            {
              h: 'Mineral',
              r: (c) => [
                M(c).name,
                <span className="sub">
                  {nf(qtyOf(c))}
                  {' MT'}
                </span>,
              ],
            },
            {
              h: 'Lifecycle',
              r: (c) => (
                <div
                  style={{
                    width: '160px',
                  }}
                >
                  <MiniLifecycle db={db} c={c} />
                </div>
              ),
            },
            {
              h: 'Status',
              r: (c) => <StatusChip tone={statusOf(db, c).tone}>{statusOf(db, c).t}</StatusChip>,
            },
            {
              h: 'Next owner',
              r: (c) => (
                <span
                  style={{
                    fontSize: '13px',
                  }}
                >
                  {nextOwner(c).who}
                </span>
              ),
            },
            {
              h: 'Risk',
              r: (c) => {
                const r = riskOf(db, c);
                return r ? <StatusChip tone={r.tone}>{r.text}</StatusChip> : <span className="muted">—</span>;
              },
            },
            {
              h: 'Value',
              n: 1,
              r: (c) => usdc(qtyOf(c) * rateOf(c)),
            },
          ]}
          rows={L.map((c) => ({
            ...c,
            key: c.id,
          }))}
          onRow={(c) => ctx.openC(c.id)}
        />
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const tat = [13.8, 13.1, 12.6, 12.2, 11.4, 10.9, 10.6, 10.1, 9.8, 9.6];
  const thr = [71, 76, 82, 85, 88, 90, 94, 97, 99, 92];
  return (
    <div className="page">
      <PageHeader title="Analytics" sub="Trends behind the control tower. Year to date." />
      <div className="grid2">
        <Card title="Average end-to-end turnaround" sub="Days from declaration to document release">
          <Columns
            x={YTD_MONTHS.map((m) => m[0])}
            values={tat}
            fmt={(v) => (+v).toFixed(v % 1 ? 1 : 0) + ' d'}
            color="var(--s1)"
            highlightLast={1}
          />
        </Card>
        <Card title="Consignments released per month">
          <Columns
            x={YTD_MONTHS.map((m) => m[0])}
            values={thr}
            fmt={(v) => Math.round(v)}
            color="var(--s1)"
            highlightLast={1}
          />
        </Card>
      </div>
      <div className="grid2">
        <Card title="SLA performance by stage" sub="Average hours against SLA, last 30 days">
          <Bullets rows={BOTTLENECKS} />
        </Card>
        <Card title="Exceptions by type" sub="Year to date">
          <HBars
            data={[
              ['Quantity mismatch', 14],
              ['Missing document', 11],
              ['Assay outside tolerance', 7],
              ['Overdue approval', 6],
              ['Invoice vs CD1 mismatch', 4],
              ['Expiring licence', 3],
            ].map(([l, v]) => ({
              l,
              v,
              c: 'var(--s1)',
            }))}
            fmt={(v) => v}
          />
        </Card>
      </div>
    </div>
  );
}

export function ReportsPage({ db, cons, ctx }) {
  const reps = [
    ['exports', 'Monthly export summary', 'Released consignments with quantities, values and document references.'],
    ['ra', 'Revenue assurance register', 'All exceptions with expected, observed, impact and status.'],
    ['sla', 'SLA performance', 'Each live consignment with its stage, elapsed time and SLA status.'],
    ['docs', 'Document register', 'Every mandatory document by consignment with its number and status.'],
  ];
  return (
    <div className="page">
      <PageHeader title="Reports" sub="Download current data as a spreadsheet-ready CSV file." />
      <div className="grid2">
        {reps.map(([k, t, d]) => (
          <Card key={k} title={t}>
            <p
              className="ink2"
              style={{
                margin: '0 0 14px',
              }}
            >
              {d}
            </p>
            <SecondaryCTA icon="download" onClick={() => ctx.downloadCsv(k)}>
              Download CSV
            </SecondaryCTA>
          </Card>
        ))}
      </div>
    </div>
  );
}
