import { useState } from 'react';
import { ActivityTimeline, ExceptionCard } from '../components/cards';
import {
  Banner,
  ConfirmationModal,
  DetailDrawer,
  EmptyState,
  FilterBar,
  Ghost,
  KpiCard,
  PageHeader,
  PrimaryCTA,
  SecondaryCTA,
  Seg,
  StatusChip,
} from '../components/primitives';
import { N, fmtD, fmtDT, initials, usd, usdc } from '../lib/format';
import { rateOf } from '../lib/lifecycle';

/* ================= REVENUE ASSURANCE & EXCEPTIONS ================= */
export const EXC_TEAM = {
  coordinator: 'Inspectorate',
  finance: 'Finance',
  compliance: 'Compliance',
  lab: 'Laboratory',
};

export function ExceptionsPage({ db, s, cons, ctx }) {
  const team = EXC_TEAM[s.persona];
  const [scope, setScope] = useState(team ? 'mine' : 'all');
  const [st, setSt] = useState('open');
  const [type, setType] = useState('all');
  const ids = new Set(cons.map((c) => c.id));
  const all = db.exc.filter((e) => ids.has(e.ccrn));
  const open = all.filter((e) => e.status !== 'Closed');
  const L = all.filter(
    (e) =>
      (scope === 'all' || e.owner === team) &&
      (st === 'all' || (st === 'open' ? e.status !== 'Closed' : e.status === 'Closed')) &&
      (type === 'all' || e.type === type),
  );
  const reg = [
    'Invoice vs CD1 Mismatch',
    'BOE Quantity Mismatch',
    'Overdue Approval',
    'Expiring Export Licence',
    'Duplicate Reference',
  ];
  return (
    <div className="page">
      <PageHeader
        eyebrow="Revenue assurance"
        title={'Revenue Assurance & Exceptions'}
        sub="Every variance between what was declared, verified, invoiced and declared to regulators, with its value at risk and owner."
      />
      <div className="kpis k4">
        <KpiCard label="Open Exceptions" value={open.length} tone={open.length ? 'warn' : 'ok'} />
        <KpiCard label="High Risk" value={open.filter((e) => e.sev === 'High').length} tone="bad" />
        <KpiCard label="Potential Value at Risk" value={usdc(open.reduce((a, e) => a + N(e.impact), 0))} tone="bad" />
        <KpiCard
          label="Overdue Cases"
          value={open.filter((e) => e.due < Date.now()).length}
          tone={open.some((e) => e.due < Date.now()) ? 'bad' : 'ok'}
        />
      </div>
      <div className="kpis k3">
        <KpiCard label="Quantity Mismatches" value={open.filter((e) => e.type === 'Quantity Mismatch').length} />
        <KpiCard label="Assay Variances" value={open.filter((e) => e.type === 'Assay Outside Tolerance').length} />
        <KpiCard label="Regulatory Mismatches" value={open.filter((e) => reg.includes(e.type)).length} />
      </div>
      <FilterBar>
        {team ? (
          <Seg
            value={scope}
            onChange={setScope}
            opts={[
              ['mine', team],
              ['all', 'All teams'],
            ]}
          />
        ) : null}
        <Seg
          value={st}
          onChange={setSt}
          opts={[
            ['open', 'Open'],
            ['closed', 'Closed'],
            ['all', 'All'],
          ]}
        />
        <select
          id="exc-type"
          className="in"
          style={{
            width: 'auto',
          }}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="all">All types</option>
          {[...new Set(db.exc.map((e) => e.type))].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </FilterBar>
      {L.length ? (
        <div
          className="tasks"
          style={{
            gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))',
          }}
        >
          {L.map((e) => (
            <ExceptionCard key={e.id} db={db} e={e} onOpen={(x) => ctx.openExc(x.id)} />
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState tone="ok" icon="shield" title="No exceptions here" text="Nothing matches these filters." />
        </div>
      )}
    </div>
  );
}

export const EXC_ACTIONS = [
  ['accept', 'Accept with Reason', 'check'],
  ['return', 'Return for Correction', 'refresh'],
  ['reinspect', 'Re-inspect', 'clip'],
  ['retest', 'Re-test', 'flask'],
  ['amend', 'Amend', 'note'],
  ['hold', 'Hold Consignment', 'pause'],
  ['escalate', 'Escalate', 'flag'],
];

export function ExceptionDrawer({ db, s, ctx, e, onClose }) {
  const [a, setA] = useState(null);
  const [n, setN] = useState('');
  const c = db.cons[e.ccrn];
  const ro = s.persona === 'executive';
  const closed = e.status === 'Closed';
  const label = a && EXC_ACTIONS.find((x) => x[0] === a)[1];
  return (
    <DetailDrawer
      wide={1}
      title={e.type}
      sub={`${e.id} · ${e.ccrn}`}
      onClose={onClose}
      footer={
        closed
          ? null
          : ro
            ? [
                <span
                  className="muted"
                  style={{
                    fontSize: '13px',
                    marginRight: 'auto',
                  }}
                >
                  {'Read-only view. '}
                  {e.owner}
                  {' owns this exception.'}
                </span>,
                <SecondaryCTA icon="flag" onClick={() => setA('escalate')}>
                  Escalate
                </SecondaryCTA>,
              ]
            : null
      }
    >
      <div className="row">
        <StatusChip tone={closed ? 'ok' : e.sev === 'High' ? 'bad' : 'warn'}>
          {closed ? 'Closed' : e.sev + ' risk'}
        </StatusChip>
        <StatusChip>{e.status}</StatusChip>
        {e.escalated ? (
          <StatusChip tone="bad" icon="flag">
            Escalated
          </StatusChip>
        ) : null}
        <span className="grow" />
        <Ghost
          icon="ext"
          onClick={() => {
            onClose();
            ctx.openC(e.ccrn);
          }}
        >
          Open consignment
        </Ghost>
      </div>
      <p
        className="ink2"
        style={{
          margin: 0,
        }}
      >
        {e.summary}
      </p>
      <div className="cmp">
        <div>
          <small>Expected</small>
          <b>{e.expected}</b>
        </div>
        <div>
          <small>Observed</small>
          <b>{e.observed}</b>
        </div>
        <div className="neg">
          <small>Variance</small>
          <b>{e.variance}</b>
        </div>
      </div>
      <div className="grid2">
        <div>
          <small
            className="muted"
            style={{
              display: 'block',
              fontSize: '12px',
            }}
          >
            Financial impact
          </small>
          {e.impact ? <span className="impact">{usd(e.impact)}</span> : <b>No direct value impact</b>}
          {e.type === 'Quantity Mismatch' ? (
            <small
              className="muted"
              style={{
                display: 'block',
              }}
            >
              {Math.abs(N(c.v.i_qty) - N(c.v.d_qty))}
              {' MT × '}
              {usd(rateOf(c))}/MT
            </small>
          ) : null}
        </div>
        <div>
          <small
            className="muted"
            style={{
              display: 'block',
              fontSize: '12px',
            }}
          >
            Owner
          </small>
          <b>{e.owner}</b>
          <small
            className="muted"
            style={{
              display: 'block',
            }}
          >
            {e.ownerName}
            {' · due '}
            {fmtD(e.due)}
          </small>
        </div>
      </div>
      <div>
        <small
          className="muted"
          style={{
            display: 'block',
            fontSize: '12px',
            marginBottom: '6px',
          }}
        >
          Source systems
        </small>
        <div className="row">
          {e.sources.map((x) => (
            <StatusChip key={x} icon="db">
              {x}
            </StatusChip>
          ))}
        </div>
      </div>
      {e.resolution ? <Banner tone="ok" title="Resolution" text={e.resolution} /> : null}
      {!closed && !ro ? (
        <div>
          <small
            className="muted"
            style={{
              display: 'block',
              fontSize: '12px',
              marginBottom: '8px',
            }}
          >
            Actions · every decision needs a reason and is audited
          </small>
          <div className="row">
            {EXC_ACTIONS.map(([k, l, ic], i) =>
              k === 'accept' ? (
                <PrimaryCTA key={k} icon={ic} onClick={() => setA(k)}>
                  {l}
                </PrimaryCTA>
              ) : (
                <SecondaryCTA key={k} sm={1} icon={ic} onClick={() => setA(k)}>
                  {l}
                </SecondaryCTA>
              ),
            )}
          </div>
        </div>
      ) : null}
      <div>
        <h4
          style={{
            fontSize: '15px',
            marginBottom: '8px',
          }}
        >
          Investigation notes
        </h4>
        {e.notes.length ? (
          <ul className="lst">
            {e.notes.map((x, i) => (
              <li
                key={i}
                style={{
                  alignItems: 'flex-start',
                }}
              >
                <span
                  className="avatar"
                  style={{
                    width: '28px',
                    height: '28px',
                    fontSize: '10.5px',
                  }}
                >
                  {initials(x.by)}
                </span>
                <div>
                  <b
                    style={{
                      fontSize: '13.5px',
                    }}
                  >
                    {x.by}
                  </b>{' '}
                  <small className="muted">{fmtDT(x.at)}</small>
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: '13.5px',
                    }}
                  >
                    {x.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p
            className="muted"
            style={{
              margin: 0,
              fontSize: '13.5px',
            }}
          >
            No notes yet.
          </p>
        )}
        {!closed && !ro ? (
          <div
            className="row"
            style={{
              marginTop: '10px',
              flexWrap: 'nowrap',
            }}
          >
            <input
              id="exc-note"
              className="in"
              value={n}
              onChange={(ev) => setN(ev.target.value)}
              placeholder="Add an investigation note"
            />
            <SecondaryCTA
              disabled={!n.trim()}
              onClick={() => {
                ctx.excNote(e.id, n.trim());
                setN('');
              }}
            >
              Add
            </SecondaryCTA>
          </div>
        ) : null}
      </div>
      <div>
        <h4
          style={{
            fontSize: '15px',
            marginBottom: '8px',
          }}
        >
          Timeline
        </h4>
        <ActivityTimeline items={e.tl} />
      </div>
      {a ? (
        <ConfirmationModal
          title={label}
          text={`${e.id} · ${e.type} on ${e.ccrn}`}
          reason={1}
          confirm={label}
          tone={a === 'hold' ? 'danger' : ''}
          onClose={() => setA(null)}
          onConfirm={(r) => {
            setA(null);
            ctx.excAction(e.id, a, r);
          }}
        />
      ) : null}
    </DetailDrawer>
  );
}
