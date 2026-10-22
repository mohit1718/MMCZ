import { StatusChip } from './primitives';
import { H } from '../lib/constants';
import { custStage, nextOwner, progressOf, readiness, riskOf, slaOf, statusOf } from '../lib/derived';
import { fmtD, fmtDT, nf } from '../lib/format';
import { M, P_, isDone, qtyOf } from '../lib/lifecycle';
import { groupOf } from '../lib/masterData';
import { CUR } from '../lib/session';
import PERSONAS from '../data/personas.json';
import STAGES from '../data/stages.json';

/* ---------- consignment header (sticky) ---------- */
export function ConsignmentHeader({ db, c, ext, onOpen }) {
  const st = statusOf(db, c);
  const r = riskOf(db, c);
  const p = progressOf(c);
  const stage = isDone(c) ? 'Completed' : STAGES[c.stage].name;
  return (
    <div className="chd">
      <div className="chd-in">
        <div
          style={{
            minWidth: 0,
          }}
        >
          <small
            className="muted"
            style={{
              fontSize: '11.5px',
              display: 'block',
            }}
          >
            Consignment
          </small>
          {onOpen ? (
            <button className="crumb cid" onClick={onOpen}>
              {c.id}
            </button>
          ) : (
            <span className="cid">{c.id}</span>
          )}
        </div>
        <div className="chd-f">
          <div className="opt-h">
            <small>Producer</small>
            <b>{P_(c).short}</b>
          </div>
          <div>
            <small>Mineral</small>
            <b>{M(c).name}</b>
          </div>
          <div>
            <small>Quantity</small>
            <b className="num">
              {nf(qtyOf(c))}
              {' MT'}
            </b>
          </div>
          <div className="opt-h">
            <small>Current stage</small>
            <b>{stage}</b>
          </div>
        </div>
        <StatusChip tone={ext ? 'info' : st.tone}>{ext ? custStage(c) : st.t}</StatusChip>
        <span className="grow" />
        {!ext && r ? (
          <StatusChip tone={r.tone} icon="alert">
            {r.text}
          </StatusChip>
        ) : null}
        <div className="prog" title={p + '% complete'}>
          <div className={'bar' + (isDone(c) ? ' ok' : '')}>
            <i
              style={{
                width: p + '%',
              }}
            />
          </div>
          <b>{p}%</b>
        </div>
        {ext ? null : (
          <div
            style={{
              width: '100%',
            }}
          >
            <FlowBar db={db} c={c} />
          </div>
        )}
      </div>
    </div>
  );
}

/* current stage · status · next action · owner · waiting on · due, on every consignment screen */
export function nextRole(c) {
  if (isDone(c)) return 'customer';
  const k = STAGES[c.stage].k;
  return {
    decl: c.sub === 'review' ? 'checker' : 'producer',
    req: 'coordinator',
    insp: 'inspector',
    assay: 'lab',
    inv: 'finance',
    cd1: c.sub === 'submitted' ? 'rbz' : 'compliance',
    boe: c.sub === 'submitted' ? 'zimra' : 'compliance',
    clr: readiness(c).done < 8 ? 'producer' : 'compliance',
    rel: 'compliance',
  }[k];
}

export function FlowBar({ db, c }) {
  const st = statusOf(db, c);
  const no = nextOwner(c);
  const sl = slaOf(db, c);
  const role = nextRole(c);
  const me = role === CUR.role;
  const wait = me
    ? 'You'
    : role === 'rbz'
      ? 'RBZ (CEPECS)'
      : role === 'zimra'
        ? 'ZIMRA (ASYCUDA)'
        : role === 'customer'
          ? 'Customer / Agent'
          : role === 'producer' || role === 'checker'
            ? P_(c).short + ' (Producer)'
            : groupOf(role).label + (PERSONAS[role] && PERSONAS[role].sub ? ' · ' + PERSONAS[role].sub : '');
  const due = sl
    ? fmtDT(sl.start + sl.sla * H)
    : isDone(c)
      ? 'Completed'
      : STAGES[c.stage].k === 'decl'
        ? 'Dispatch ' + fmtD(c.v.d_dispatch)
        : '—';
  return (
    <div className="flowbar" role="group" aria-label="Where this consignment is">
      <div>
        <small>Current stage</small>
        <b>{isDone(c) ? 'Completed' : STAGES[c.stage].name}</b>
      </div>
      <div className={st.tone === 'bad' ? 'bad' : st.tone === 'warn' ? 'warn' : ''}>
        <small>Status</small>
        <b title={st.t}>{st.t}</b>
      </div>
      <div className="na">
        <small>Next action</small>
        <b title={no.what}>{no.what}</b>
      </div>
      <div>
        <small>Owner</small>
        <b title={no.who}>{no.who}</b>
      </div>
      <div className={me ? 'na' : ''}>
        <small>Waiting on</small>
        <b>{wait}</b>
      </div>
      <div className={sl && sl.cls === 'bad' ? 'bad' : sl && sl.cls === 'warn' ? 'warn' : ''}>
        <small>{sl ? 'SLA due' : 'Due'}</small>
        <b>{due}</b>
      </div>
    </div>
  );
}
