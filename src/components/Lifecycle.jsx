import { Icon } from './Icon';
import { openExc, prodView, slaOf, statusOf } from '../lib/derived';
import { isDone, sIdx } from '../lib/lifecycle';
import STAGES from '../data/stages.json';

/* ---------- lifecycle ---------- */
export function stepState(db, c, i) {
  const exc = openExc(db, c);
  if (i < c.stage) return 'done';
  if (i === c.stage && !isDone(c)) {
    if (prodView()) return 'cur';
    const sla = slaOf(db, c);
    return c.hold || c.sub === 'attention' || exc.some((e) => e.sev === 'High') || (sla && sla.cls === 'bad')
      ? 'exc'
      : 'cur';
  }
  return 'fut';
}

export function LifecycleStepper({ db, c, onStep }) {
  return (
    <div className="lc-wrap">
      <div
        className="lc"
        style={{
          '--n': STAGES.length,
        }}
      >
        {STAGES.map((s, i) => {
          const st = stepState(db, c, i);
          const lab =
            st === 'done'
              ? 'Complete'
              : st === 'cur'
                ? statusOf(db, c).t.split(' · ')[0]
                : st === 'exc'
                  ? c.hold
                    ? 'On hold'
                    : slaOf(db, c) && slaOf(db, c).cls === 'bad'
                      ? 'SLA breached'
                      : 'Exception'
                  : '';
          const T = onStep ? 'button' : 'div';
          return (
            <T
              key={s.k}
              className={'lc-s ' + st}
              onClick={onStep ? () => onStep(s.k) : null}
              type={onStep ? 'button' : undefined}
              style={
                onStep
                  ? {
                      cursor: 'pointer',
                    }
                  : null
              }
            >
              <span className="lc-d">
                {st === 'done' ? <Icon n="check" c="sm" s="3" /> : st === 'exc' ? '!' : i + 1}
              </span>
              <b>{s.name}</b>
              {lab ? <small>{lab}</small> : null}
            </T>
          );
        })}
      </div>
    </div>
  );
}

export function MiniLifecycle({ db, c, labels }) {
  const keys = ['decl', 'insp', 'assay', 'inv', 'cd1', 'boe', 'clr', 'rel'];
  const names = {
    decl: 'Declaration',
    insp: 'Inspection',
    assay: 'Assay',
    inv: 'Invoice',
    cd1: 'CD1',
    boe: 'BOE',
    clr: 'Export',
    rel: 'Release',
  };
  const stOf = (k) => {
    const i = sIdx(k);
    if (k === 'insp') {
      const a = stepState(db, c, 1),
        b = stepState(db, c, 2);
      return a !== 'done' ? (a === 'fut' ? 'fut' : a) : b;
    }
    return stepState(db, c, i);
  };
  return (
    <div>
      <div className="mini" aria-label={'Progress: ' + statusOf(db, c).t}>
        {keys.map((k) => {
          const s = stOf(k);
          return (
            <i key={k} title={names[k]} className={s === 'done' ? 'd' : s === 'cur' ? 'c' : s === 'exc' ? 'x' : ''} />
          );
        })}
      </div>
      {labels ? (
        <div className="mini-lbl">
          {keys.map((k) => {
            const s = stOf(k);
            return (
              <span key={k} className={s === 'done' ? 'd' : s === 'cur' ? 'c' : s === 'exc' ? 'x' : ''}>
                {names[k]} {s === 'done' ? '✓' : s === 'cur' ? '●' : s === 'exc' ? '!' : '○'}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
