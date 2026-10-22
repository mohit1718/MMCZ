import React, { useState, useMemo } from 'react';
import { ExceptionCard } from '../components/cards';
import { Icon } from '../components/Icon';
import {
  Card,
  DataTable,
  DetailDrawer,
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
import { DAY, H, NOW0 } from '../lib/constants';
import { slaOf, statusOf } from '../lib/derived';
import { dayAt, fmtD, fmtDT, fmtT, initials, isoD, nf, sameDay } from '../lib/format';
import { M, P_, isDone } from '../lib/lifecycle';
import { userOf } from '../lib/masterData';
import INSPECTORS from '../data/inspectors.json';
import PRODUCERS from '../data/producers.json';
import STAGES from '../data/stages.json';
import ZW_CITIES from '../data/zimbabweCities.json';
import ZW_OUTLINE from '../data/zimbabweOutline.json';

/* ================= INSPECTORATE COORDINATOR ================= */
export function inspLoad(db, name) {
  return Object.values(db.cons).filter(
    (c) => !isDone(c) && STAGES[c.stage].k === 'insp' && c.v.a_insp === name && sameDay(c.v.a_when, Date.now()),
  ).length;
}

export function rankInspectors(db, c) {
  const p = P_(c);
  return INSPECTORS.map((i) => {
    const load = i.load + inspLoad(db, i.name);
    const off = i.avail.startsWith('On leave');
    const full = load >= i.cap;
    let sc = 0;
    const why = [];
    if (i.region === p.region) {
      sc += 40;
      why.push('Same region');
    } else why.push(i.region);
    if (i.skills.includes(c.code)) {
      sc += 30;
      why.push(M(c).name.split(' ').slice(-1)[0] + ' expertise');
    }
    if (!off && !full) {
      sc += 20;
    } else why.push(off ? i.avail : 'Fully booked');
    sc += Math.max(0, 10 - load * 4);
    why.push(`${load} of ${i.cap} today`);
    return {
      ...i,
      load,
      score: off || full ? sc - 60 : sc,
      ok: !off && !full,
      why,
    };
  }).sort((a, b) => b.score - a.score);
}

export function CoordinatorHome({ db, s, cons, ctx }) {
  const req = cons.filter((c) => !isDone(c) && STAGES[c.stage].k === 'req');
  const insp = cons.filter((c) => !isDone(c) && STAGES[c.stage].k === 'insp');
  const today = insp.filter((c) => c.v.a_when && sameDay(c.v.a_when, Date.now()));
  const prog = insp.filter((c) => c.sub === 'inprogress');
  const doneT = Object.values(db.cons).filter((c) => c.v.i_at && sameDay(c.v.i_at, Date.now()));
  const over =
    req.filter((c) => {
      const s_ = slaOf(db, c);
      return s_ && s_.cls === 'bad';
    }).length + insp.filter((c) => c.v.a_when && c.v.a_when < Date.now() - 2 * H && c.sub === 'scheduled').length;
  const neu = req.filter((c) => Date.now() - c.stageStart < 24 * H);
  const [alloc, setAlloc] = useState(null);
  const [view, setView] = useState('queue');
  const oldest = [...req].sort((a, b) => a.stageStart - b.stageStart)[0];
  const overdueL = [
    ...req.filter((c) => {
      const s_ = slaOf(db, c);
      return s_ && s_.cls === 'bad';
    }),
    ...insp.filter((c) => c.v.a_when && c.v.a_when < Date.now() - 2 * H && c.sub === 'scheduled'),
  ];
  const exc = db.exc.filter((e) => e.owner === 'Inspectorate' && e.status !== 'Closed');
  return (
    <div className="page">
      <PageHeader
        eyebrow={`Welcome, ${userOf(s)}`}
        title="Inspection Operations"
        sub="Allocate inspection requests and monitor field work across all mines."
        actions={
          oldest ? (
            <PrimaryCTA icon="users" lg={1} onClick={() => setAlloc(oldest.id)}>
              Assign Inspector
            </PrimaryCTA>
          ) : null
        }
      />
      <div className="kpis">
        <KpiCard label="New Requests" value={neu.length} sub="Last 24 hours" tone="info" />
        <KpiCard label="Awaiting Assignment" value={req.length} tone={req.length ? 'warn' : 'ok'} />
        <KpiCard label="Scheduled Today" value={today.length} />
        <KpiCard label="In Progress" value={prog.length} />
        <KpiCard label="Completed Today" value={doneT.length} tone="ok" />
        <KpiCard label="Overdue" value={over} tone={over ? 'bad' : 'ok'} sub={over ? 'Past SLA' : 'None'} />
      </div>
      <FilterBar>
        <Seg
          value={view}
          onChange={setView}
          opts={[
            ['queue', 'Queue View', req.length],
            ['calendar', 'Calendar View'],
            ['map', 'Map View'],
          ]}
        />
      </FilterBar>
      {view === 'calendar' ? (
        <CalendarGrid db={db} cons={cons} ctx={ctx} />
      ) : view === 'map' ? (
        <InspectionMap db={db} cons={cons} ctx={ctx} onAssign={setAlloc} />
      ) : (
        <React.Fragment>
          <div className="split">
            <Card
              title="Inspection request queue"
              sub="Oldest and highest priority first. Assign to send the inspector and producer their confirmations."
            >
              {req.length ? (
                <ul className="lst">
                  {req
                    .sort((a, b) => a.stageStart - b.stageStart)
                    .map((c) => {
                      const sl = slaOf(db, c);
                      const pri = c.seq === 127 || (sl && sl.cls === 'bad') ? 'High' : 'Normal';
                      return (
                        <li
                          key={c.id}
                          style={{
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                            padding: '16px 0',
                          }}
                        >
                          <div
                            style={{
                              flex: '1 1 320px',
                              minWidth: 0,
                            }}
                          >
                            <div
                              className="row"
                              style={{
                                gap: '8px',
                              }}
                            >
                              <b className="mono">{c.id}</b>
                              <StatusChip tone={pri === 'High' ? 'bad' : ''}>
                                {pri}
                                {' priority'}
                              </StatusChip>
                              <StatusChip
                                tone={sl.cls === 'bad' ? 'bad' : sl.cls === 'warn' ? 'warn' : 'ok'}
                                icon="clock"
                              >
                                {sl.label}
                              </StatusChip>
                            </div>
                            <div
                              className="row"
                              style={{
                                gap: '6px 18px',
                                marginTop: '8px',
                                fontSize: '13.5px',
                              }}
                            >
                              <span>
                                <b>{P_(c).short}</b>
                                {' · '}
                                {P_(c).mine}
                              </span>
                              <span>
                                {M(c).name}
                                {' · '}
                                {nf(c.v.d_qty)}
                                {' MT'}
                              </span>
                              <span className="muted">
                                <Icon n="calendar" c="sm" />
                                {' Requested '}
                                {fmtD(c.v.d_insp)}
                              </span>
                              <span className="muted">
                                <Icon n="pin" c="sm" /> {P_(c).loc}
                              </span>
                            </div>
                          </div>
                          <div className="row">
                            <SecondaryCTA sm={1} onClick={() => ctx.openC(c.id)}>
                              View Details
                            </SecondaryCTA>
                            <PrimaryCTA onClick={() => setAlloc(c.id)}>Assign Inspector</PrimaryCTA>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              ) : (
                <EmptyState
                  tone="ok"
                  icon="check"
                  title="All requests are assigned"
                  text="New inspection requests appear here as producers submit them."
                />
              )}
            </Card>
            <Card title="Inspector availability" sub="Today">
              <ul className="lst">
                {INSPECTORS.map((i) => {
                  const load = i.load + inspLoad(db, i.name);
                  const off = i.avail.startsWith('On leave');
                  return (
                    <li
                      key={i.name}
                      style={{
                        alignItems: 'flex-start',
                      }}
                    >
                      <span
                        className="avatar"
                        style={{
                          background: off ? 'var(--sunk)' : undefined,
                          color: off ? 'var(--ink-3)' : undefined,
                        }}
                      >
                        {initials(i.name)}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <div className="row">
                          <b>{i.name}</b>
                          <span className="grow" />
                          <StatusChip tone={off ? '' : load >= i.cap ? 'warn' : 'ok'}>
                            {off ? 'On leave' : load >= i.cap ? 'Fully booked' : 'Available'}
                          </StatusChip>
                        </div>
                        <small
                          className="muted"
                          style={{
                            display: 'block',
                          }}
                        >
                          {i.region}
                          {' · '}
                          {i.skillTxt}
                        </small>
                        <div
                          className="row"
                          style={{
                            marginTop: '6px',
                            flexWrap: 'nowrap',
                          }}
                        >
                          <div
                            className="mini"
                            style={{
                              width: '120px',
                            }}
                          >
                            {Array.from({
                              length: i.cap,
                            }).map((_, j) => (
                              <i key={j} className={j < load ? 'c' : ''} />
                            ))}
                          </div>
                          <small className="muted">
                            {load}
                            {' of '}
                            {i.cap}
                            {' today'}
                          </small>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
          <div className="grid3">
            <Card title="Today's schedule" sub={fmtD(Date.now())}>
              {today.length ? (
                <ul className="lst">
                  {today
                    .sort((a, b) => a.v.a_when - b.v.a_when)
                    .map((c) => (
                      <li key={c.id}>
                        <span
                          className="chip info"
                          style={{
                            minWidth: '58px',
                            justifyContent: 'center',
                          }}
                        >
                          {fmtT(c.v.a_when)}
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
                            {P_(c).short}
                            {' · '}
                            {M(c).name}
                          </b>
                          <small className="muted">
                            {c.v.a_insp}
                            {' · '}
                            {c.id.slice(-9)}
                          </small>
                        </div>
                        <StatusChip tone={c.sub === 'inprogress' ? 'cyan' : 'info'}>
                          {c.sub === 'inprogress' ? 'In progress' : 'Scheduled'}
                        </StatusChip>
                      </li>
                    ))}
                </ul>
              ) : (
                <EmptyState icon="calendar" title="No inspections today" />
              )}
            </Card>
            <Card title="Overdue inspections">
              {overdueL.length ? (
                <ul className="lst">
                  {overdueL.map((c) => (
                    <li key={c.id}>
                      <span
                        style={{
                          color: 'var(--bad)',
                        }}
                      >
                        <Icon n="clock" />
                      </span>
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <b
                          className="mono"
                          style={{
                            display: 'block',
                            fontSize: '13px',
                          }}
                        >
                          {c.id}
                        </b>
                        <small className="muted">
                          {STAGES[c.stage].k === 'req'
                            ? 'Assignment ' + slaOf(db, c).label
                            : 'Scheduled ' + fmtDT(c.v.a_when) + ', not started'}
                        </small>
                      </div>
                      <Ghost onClick={() => (STAGES[c.stage].k === 'req' ? setAlloc(c.id) : ctx.openC(c.id))}>
                        {STAGES[c.stage].k === 'req' ? 'Assign' : 'Open'}
                      </Ghost>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  tone="ok"
                  icon="check"
                  title="Nothing overdue"
                  text="All requests and visits are within SLA."
                />
              )}
            </Card>
            <Card title="Inspection exceptions">
              {exc.length ? (
                <div className="col">
                  {exc.map((e) => (
                    <ExceptionCard key={e.id} db={db} e={e} compact={1} onOpen={(x) => ctx.openExc(x.id)} />
                  ))}
                </div>
              ) : (
                <EmptyState tone="ok" icon="shield" title="No open exceptions" />
              )}
            </Card>
          </div>
        </React.Fragment>
      )}
      {alloc ? <AllocationDrawer db={db} ctx={ctx} c={db.cons[alloc]} onClose={() => setAlloc(null)} /> : null}
    </div>
  );
}

export function InspectionMap({ db, cons, ctx, onAssign }) {
  const W = 540,
    Hh = 500;
  const X = (lon) => ((lon - 25) / (33.3 - 25)) * W,
    Y = (lat) => ((-lat - 15.4) / (22.6 - 15.4)) * Hh;
  const work = cons.filter((c) => !isDone(c) && ['req', 'insp'].includes(STAGES[c.stage].k));
  const sites = Object.values(PRODUCERS)
    .map((p, i) => {
      const [la, lo] = p.gps.split(',').map(Number);
      const L = work.filter((c) => c.pid === p.id);
      return {
        p,
        x: X(lo) + (p.id === 'PRD-0058' ? 14 : 0),
        y: Y(la) + (p.id === 'PRD-0058' ? 12 : 0),
        L,
      };
    })
    .filter((x) => x.L.length);
  sites
    .sort((a, b) => a.y - b.y)
    .forEach((x, i) => {
      x.ly = x.y - 10;
      x.lx = x.x + 14;
      if (sites.slice(0, i).some((o) => Math.abs(o.x - x.x) < 150 && Math.abs(o.ly - x.ly) < 24)) {
        x.ly = x.y + 26;
      }
    });
  const col = (c) =>
    STAGES[c.stage].k === 'req' ? 'var(--warn)' : c.sub === 'inprogress' ? 'var(--cyan)' : 'var(--blue)';
  return (
    <div className="split">
      <Card title="Field work by location" sub="Amber: awaiting assignment · Blue: scheduled · Cyan: in progress">
        <svg
          viewBox={`0 0 ${W} ${Hh}`}
          className="zmap"
          role="img"
          aria-label="Map of Zimbabwe showing inspection requests by mine"
        >
          <polygon className="land" points={ZW_OUTLINE.map(([lo, la]) => X(lo) + ',' + Y(la)).join(' ')} />
          {ZW_CITIES.map(([n, la, lo]) => (
            <g key={n}>
              <circle cx={X(lo)} cy={Y(la)} r="3" className="city" />
              <text x={X(lo) + 6} y={Y(la) + 4} className="ct">
                {n}
              </text>
            </g>
          ))}
          {sites.map((x) => (
            <g
              key={x.p.id}
              className="pin"
              onClick={() => {
                const r = x.L.find((c) => STAGES[c.stage].k === 'req');
                r ? onAssign(r.id) : ctx.openC(x.L[0].id);
              }}
            >
              <circle cx={x.x} cy={x.y} r="15" fill={col(x.L[0])} opacity=".22" />
              <circle cx={x.x} cy={x.y} r="8" fill={col(x.L[0])} stroke="#051936" strokeWidth="2" />
              <text x={x.lx} y={x.ly} className="mt">
                {x.p.mine}
                {' ('}
                {x.L.length})
              </text>
            </g>
          ))}
        </svg>
      </Card>
      <Card title="Requests and visits" sub={work.length + ' open'}>
        <ul className="lst">
          {work
            .sort((a, b) => a.stage - b.stage)
            .map((c) => (
              <li key={c.id}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: col(c),
                    flex: 'none',
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
                      fontSize: '13.5px',
                    }}
                  >
                    {P_(c).mine}
                  </b>
                  <small className="muted">
                    {P_(c).loc}
                    {' · '}
                    {M(c).name}
                    {' · '}
                    {nf(c.v.d_qty)}
                    {' MT'}
                  </small>
                  <small
                    className="muted mono"
                    style={{
                      display: 'block',
                    }}
                  >
                    {c.id}
                  </small>
                </div>
                {STAGES[c.stage].k === 'req' ? (
                  <PrimaryCTA onClick={() => onAssign(c.id)}>Assign</PrimaryCTA>
                ) : (
                  <Ghost onClick={() => ctx.openC(c.id)}>{c.v.a_insp}</Ghost>
                )}
              </li>
            ))}
        </ul>
      </Card>
    </div>
  );
}

export function AllocationDrawer({ db, ctx, c, onClose }) {
  const ranked = useMemo(() => rankInspectors(db, c), [c.id]);
  const [who, setWho] = useState(ranked.find((r) => r.ok).name);
  const [d, setD] = useState(isoD(c.v.d_insp || dayAt(2, 10)));
  const [t, setT] = useState('10:00');
  const [pri, setPri] = useState(c.seq === 127 ? 'High' : 'Normal');
  const [instr, setInstr] = useState(
    `Verify ${c.code === 'LI' ? 'all jumbo-bag lots' : 'stockpile lots'} against weighbridge tickets. Take two incremental samples and seal on site.`,
  );
  const flash = ctx.flashFor('alloc');
  if (flash)
    return (
      <DetailDrawer
        title="Inspection assigned"
        sub={c.id}
        onClose={() => {
          ctx.clearFlash();
          onClose();
        }}
      >
        <SuccessPanel
          {...flash}
          actions={
            <SecondaryCTA
              onClick={() => {
                ctx.clearFlash();
                onClose();
              }}
            >
              Back to queue
            </SecondaryCTA>
          }
        />
      </DetailDrawer>
    );
  const when = new Date(d + 'T' + t).getTime();
  return (
    <DetailDrawer
      wide={1}
      title="Assign inspector"
      sub={c.id}
      onClose={onClose}
      footer={[
        <SecondaryCTA onClick={onClose}>Cancel</SecondaryCTA>,
        <PrimaryCTA
          icon="check"
          disabled={!who || isNaN(when)}
          onClick={() =>
            ctx.act(
              'assign',
              c.id,
              {
                inspector: who,
                when,
                instr,
                priority: pri,
              },
              'alloc',
            )
          }
        >
          Assign Inspector
        </PrimaryCTA>,
      ]}
    >
      <Card cls="flat tint" title="Request">
        <KV
          rows={[
            ['Producer', P_(c).name],
            ['Mine / location', `${P_(c).mine}, ${P_(c).loc}`],
            ['Mineral', M(c).name],
            ['Quantity', nf(c.v.d_qty) + ' MT'],
            ['Requested date', fmtD(c.v.d_insp)],
            ['SLA', slaOf(db, c).label],
          ]}
        />
      </Card>
      <div className="col">
        <h4
          style={{
            fontSize: '15px',
          }}
        >
          Recommended inspectors
        </h4>
        <span
          className="help"
          style={{
            marginTop: '-8px',
          }}
        >
          Ranked by location, mineral expertise, availability and today's workload.
        </span>
        {ranked.map((r, i) => (
          <button
            key={r.name}
            type="button"
            onClick={() => r.ok && setWho(r.name)}
            disabled={!r.ok}
            className="card flat"
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              padding: '12px 14px',
              textAlign: 'left',
              cursor: r.ok ? 'pointer' : 'not-allowed',
              borderColor: who === r.name ? 'var(--blue)' : undefined,
              background: who === r.name ? 'var(--blue-soft)' : undefined,
              opacity: r.ok ? 1 : 0.55,
              font: 'inherit',
              color: 'inherit',
            }}
          >
            <span className="avatar">{initials(r.name)}</span>
            <div
              style={{
                flex: 1,
                minWidth: 0,
              }}
            >
              <div className="row">
                <b>{r.name}</b>
                {i === 0 && r.ok ? <StatusChip tone="info">Best match</StatusChip> : null}
              </div>
              <small className="muted">{r.why.join(' · ')}</small>
            </div>
            <span
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                border: '2px solid ' + (who === r.name ? 'var(--blue)' : 'var(--line-2)'),
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {who === r.name ? (
                <i
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: 'var(--blue)',
                  }}
                />
              ) : null}
            </span>
          </button>
        ))}
      </div>
      <div className="fgrid">
        <label className="fld">
          <span className="lbl">Inspection date</span>
          <input id="al-d" className="in" type="date" value={d} onChange={(e) => setD(e.target.value)} />
        </label>
        <label className="fld">
          <span className="lbl">Time</span>
          <input id="al-t" className="in" type="time" value={t} onChange={(e) => setT(e.target.value)} />
        </label>
        <div className="fld wide">
          <span className="lbl">Priority</span>
          <div className="opts">
            {[
              ['Normal', ''],
              ['High', 'bad'],
              ['Urgent', 'bad'],
            ].map(([o, t2]) => (
              <button
                key={o}
                type="button"
                className={'opt' + (pri === o ? ' on' + (t2 ? ' ' + t2 : '') : '')}
                onClick={() => setPri(o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
        <label className="fld wide">
          <span className="lbl">Instructions for the inspector</span>
          <textarea id="al-i" className="in" value={instr} onChange={(e) => setInstr(e.target.value)} />
        </label>
      </div>
    </DetailDrawer>
  );
}

export function RequestsPage({ db, cons, ctx }) {
  const [f, setF] = useState('open');
  const all = cons.filter((c) => c.v.ir_no);
  const L = all
    .filter(
      (c) =>
        f === 'all' || (f === 'open' ? STAGES[c.stage] && ['req', 'insp'].includes(STAGES[c.stage].k) : c.stage > 2),
    )
    .sort((a, b) => b.seq - a.seq);
  return (
    <div className="page">
      <PageHeader title="Inspection requests" sub="All requests with their assignment and status." />
      <FilterBar>
        <Seg
          value={f}
          onChange={setF}
          opts={[
            ['open', 'Open'],
            ['done', 'Completed'],
            ['all', 'All'],
          ]}
        />
      </FilterBar>
      <div className="card">
        <DataTable
          cols={[
            {
              h: 'Request',
              r: (c) => [<b className="mono">{c.v.ir_no}</b>, <span className="sub mono">{c.id}</span>],
            },
            {
              h: 'Producer',
              r: (c) => [P_(c).short, <span className="sub">{P_(c).mine}</span>],
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
              h: 'Requested',
              r: (c) => fmtD(c.v.d_insp),
            },
            {
              h: 'Inspector',
              r: (c) =>
                c.v.a_insp ? (
                  [c.v.a_insp, <span className="sub">{fmtDT(c.v.a_when)}</span>]
                ) : (
                  <span className="muted">Unassigned</span>
                ),
            },
            {
              h: 'Status',
              r: (c) => (
                <StatusChip tone={statusOf(db, c).tone}>{c.stage > 2 ? 'Inspected' : statusOf(db, c).t}</StatusChip>
              ),
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

export const weekMon = () => {
  const d0 = new Date(NOW0);
  const dow = (d0.getDay() + 6) % 7;
  return dayAt(-dow, 0);
};

export function CalendarPage({ db, cons, ctx }) {
  return (
    <div className="page">
      <PageHeader title="Inspection calendar" sub={`Week of ${fmtD(weekMon())}`} />
      <CalendarGrid db={db} cons={cons} ctx={ctx} />
    </div>
  );
}

export function CalendarGrid({ db, cons, ctx }) {
  const mon = weekMon();
  const days = Array.from(
    {
      length: 7,
    },
    (_, i) => mon + i * DAY,
  );
  const items = cons
    .filter((c) => c.v.a_when)
    .map((c) => ({
      c,
      t: c.v.a_when,
      done: !!c.v.i_at,
    }))
    .concat(
      cons
        .filter((c) => !isDone(c) && STAGES[c.stage].k === 'req')
        .map((c) => ({
          c,
          t: c.v.d_insp,
          req: 1,
        })),
    );
  return (
    <div className="tw">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7,minmax(140px,1fr))',
          gap: '10px',
          minWidth: '1000px',
        }}
      >
        {days.map((dy) => {
          const L = items.filter((x) => sameDay(x.t, dy)).sort((a, b) => a.t - b.t);
          const today = sameDay(dy, Date.now());
          return (
            <div
              key={dy}
              className="card flat"
              style={{
                padding: '12px',
                minHeight: '260px',
                borderColor: today ? 'var(--blue)' : undefined,
              }}
            >
              <div className="row">
                <b
                  style={{
                    fontFamily: 'var(--f-display)',
                  }}
                >
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][(new Date(dy).getDay() + 6) % 7]}{' '}
                  {new Date(dy).getDate()}
                </b>
                {today ? <StatusChip tone="info">Today</StatusChip> : null}
              </div>
              <div
                className="col"
                style={{
                  gap: '8px',
                  marginTop: '10px',
                }}
              >
                {L.map((x) => (
                  <button
                    key={x.c.id}
                    onClick={() => ctx.openC(x.c.id)}
                    style={{
                      textAlign: 'left',
                      border: 0,
                      borderLeft: '3px solid ' + (x.req ? 'var(--warn)' : x.done ? 'var(--ok)' : 'var(--blue)'),
                      background: 'var(--surface-2)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      cursor: 'pointer',
                      font: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    <b
                      style={{
                        fontSize: '12.5px',
                        display: 'block',
                      }}
                    >
                      {x.req ? 'Requested' : fmtT(x.t)}
                      {' · '}
                      {P_(x.c).short}
                    </b>
                    <small className="muted">
                      {x.req ? 'Unassigned' : x.c.v.a_insp}
                      {' · '}
                      {x.c.id.slice(-9)}
                    </small>
                  </button>
                ))}
                {L.length ? null : <small className="muted">No inspections</small>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function InspectorsPage({ db }) {
  return (
    <div className="page">
      <PageHeader title="Inspectors" sub="Field team, regions and expertise." />
      <div className="grid3">
        {INSPECTORS.map((i) => {
          const load = i.load + inspLoad(db, i.name);
          const off = i.avail.startsWith('On leave');
          return (
            <Card key={i.name}>
              <div
                className="row"
                style={{
                  gap: '12px',
                }}
              >
                <span
                  className="avatar"
                  style={{
                    width: '44px',
                    height: '44px',
                  }}
                >
                  {initials(i.name)}
                </span>
                <div>
                  <b
                    style={{
                      fontFamily: 'var(--f-display)',
                      fontSize: '16px',
                    }}
                  >
                    {i.name}
                  </b>
                  <div
                    className="muted"
                    style={{
                      fontSize: '13px',
                    }}
                  >
                    {'Based in '}
                    {i.base}
                  </div>
                </div>
                <span className="grow" />
                <StatusChip tone={off ? '' : load >= i.cap ? 'warn' : 'ok'}>
                  {off ? 'On leave' : load >= i.cap ? 'Fully booked' : 'Available'}
                </StatusChip>
              </div>
              <div
                style={{
                  marginTop: '14px',
                }}
              >
                <KV
                  cls="two"
                  rows={[
                    ['Region', i.region],
                    ['Expertise', i.skillTxt],
                    ['Today', `${load} of ${i.cap} inspections`],
                    ['Experience', i.years + ' years'],
                  ]}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
