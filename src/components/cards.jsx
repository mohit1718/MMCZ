import { Icon } from './Icon';
import { MiniLifecycle } from './Lifecycle';
import { Banner, Card, EmptyState, Ghost, KV, PrimaryCTA, SecondaryCTA, StatusChip } from './primitives';
import { DOC_OK, custStage, docState, readiness, riskOf, statusOf } from '../lib/derived';
import { fmtD, fmtDT, fmtDs, fmtT, nf, sameDay, usd } from '../lib/format';
import { B_, M, P_, isDone, qtyOf } from '../lib/lifecycle';
import DOCS from '../data/documentTypes.json';
import SYS from '../data/integrationSystems.json';
import STAGES from '../data/stages.json';

/* ---------- task & consignment cards ---------- */
export function TaskCard({ title, ccrn, detail, due, dueTone, tone, action, onAction, icon, pri }) {
  return (
    <article className={'task ' + (tone || '')}>
      <div
        className="row"
        style={{
          gap: '12px',
          alignItems: 'flex-start',
          flexWrap: 'nowrap',
        }}
      >
        {icon ? (
          <span
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'grid',
              placeItems: 'center',
              flex: 'none',
              background:
                tone === 'bad' ? 'var(--bad-soft)' : tone === 'warn' ? 'var(--warn-soft)' : 'var(--cyan-soft)',
              color: tone === 'bad' ? 'var(--bad)' : tone === 'warn' ? 'var(--warn)' : 'var(--cyan)',
            }}
          >
            <Icon n={icon} />
          </span>
        ) : null}
        <div
          style={{
            minWidth: 0,
            flex: 1,
          }}
        >
          <h4>{title}</h4>
          {ccrn ? <div className="tref">{ccrn}</div> : null}
        </div>
        {pri ? <StatusChip tone={pri === 'High' ? 'bad' : pri === 'Medium' ? 'warn' : ''}>{pri}</StatusChip> : null}
      </div>
      <p>{detail}</p>
      <div className="tfoot">
        {due ? (
          <span className={'due ' + (dueTone || '')}>
            <Icon n="clock" c="sm" />
            {due}
          </span>
        ) : null}
        <span className="grow" />
        <PrimaryCTA onClick={onAction}>{action}</PrimaryCTA>
      </div>
    </article>
  );
}

export function ConsignmentCard({ db, c, onOpen, ext, noRisk }) {
  const st = statusOf(db, c);
  const r = riskOf(db, c);
  return (
    <button className="ccard" onClick={() => onOpen(c)}>
      <div
        style={{
          minWidth: 0,
        }}
      >
        <span className="cid">{c.id}</span>
        <div className="meta">
          {M(c).name}
          {' · '}
          {nf(qtyOf(c))}
          {' MT'}
        </div>
        <div
          style={{
            marginTop: '8px',
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
          }}
        >
          <StatusChip tone={ext ? 'info' : st.tone}>{ext ? custStage(c) : st.t}</StatusChip>
          {!ext && !noRisk && r ? (
            <StatusChip tone={r.tone} icon="alert">
              {r.text}
            </StatusChip>
          ) : null}
        </div>
      </div>
      <div
        style={{
          minWidth: 0,
        }}
      >
        <div className="facts">
          <div>
            <small>Destination</small>
            <b>{B_(c).country}</b>
          </div>
          <div>
            <small>Buyer</small>
            <b>{B_(c).short}</b>
          </div>
          <div>
            <small>Expected dispatch</small>
            <b>{fmtD(c.v.d_dispatch)}</b>
          </div>
          <div>
            <small>Current stage</small>
            <b>{isDone(c) ? 'Completed' : STAGES[c.stage].name}</b>
          </div>
        </div>
        <MiniLifecycle db={db} c={c} labels={1} />
      </div>
      <span
        style={{
          color: 'var(--ink-3)',
        }}
      >
        <Icon n="right" />
      </span>
    </button>
  );
}

/* ---------- activity timeline ---------- */
export function ActivityTimeline({ items, showBy = true, limit }) {
  const L = [...items].sort((a, b) => b.at - a.at).slice(0, limit || 999);
  let lastDay = '';
  if (!L.length)
    return <EmptyState icon="clock" title="No activity yet" text="Events appear here as the consignment moves." />;
  return (
    <ol className="tl">
      {L.flatMap((e, i) => {
        const day = fmtD(e.at);
        const out = [];
        if (day !== lastDay) {
          lastDay = day;
          out.push(
            <li key={'d' + i} className="dayrow">
              <span className="tday">{sameDay(e.at, Date.now()) ? 'Today' : day}</span>
            </li>,
          );
        }
        out.push(
          <li key={i} className={e.tone || ''}>
            <span className="t">{fmtT(e.at)}</span>
            <span className="o" />
            <div>
              <b>{e.text}</b>
              {showBy && e.by ? <small>{e.by}</small> : null}
            </div>
          </li>,
        );
        return out;
      })}
    </ol>
  );
}

export function IntegrationCard({ db, sys, status, rows, children, note }) {
  const up = (db.integ || {})[sys] !== 'down';
  const [name, mk] = SYS[sys];
  return (
    <section className="integ">
      <div className="integ-h">
        <span className="sysmark">{mk}</span>
        <div>
          <b>{name}</b>
          <small>
            <i className={'live' + (up ? '' : ' off')} />
            {up ? 'Connected' : 'Unavailable'}
            {status ? [' · ', status] : null}
          </small>
        </div>
      </div>
      <div className="integ-b">
        {up ? null : (
          <Banner
            tone="bad"
            icon="link"
            title={name + ' is unavailable'}
            text="Your work is saved. Try again in a few minutes; the request will not be duplicated."
          />
        )}
        {rows ? <KV rows={rows} cls="two" /> : null}
        {children}
        {note ? (
          <div className="integ-note">
            <Icon n="info" c="sm" />
            {note}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ---------- approval card ---------- */
export function ApprovalCard({ title, sub, checks, primary, secondary, blocked }) {
  return (
    <Card title={title} sub={sub}>
      <ul className="chk">
        {checks.map(([ok, t, s], i) => (
          <li key={i} className={ok === true ? '' : ok === 'wait' ? 'wait' : 'no'}>
            <span className="ck">
              <Icon n={ok === true ? 'check' : ok === 'wait' ? 'clock' : 'x'} c="sm" s="2.6" />
            </span>
            <div>
              <b>{t}</b>
              {s ? <small>{s}</small> : null}
            </div>
          </li>
        ))}
      </ul>
      {blocked ? (
        <div
          style={{
            marginTop: '12px',
          }}
        >
          <Banner tone="bad" title="Cannot submit yet" text={blocked} />
        </div>
      ) : null}
      {primary || secondary ? (
        <div
          className="row"
          style={{
            marginTop: '16px',
          }}
        >
          {primary}
          {secondary}
        </div>
      ) : null}
    </Card>
  );
}

/* ---------- exceptions ---------- */
export function ExceptionCard({ db, e, onOpen, compact }) {
  const c = db.cons[e.ccrn];
  const closed = e.status === 'Closed';
  return (
    <article className={'exc ' + e.sev + (closed ? ' closed' : '')}>
      <div
        className="row"
        style={{
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            minWidth: 0,
            flex: 1,
          }}
        >
          <h4>{e.type}</h4>
          <div
            className="tref mono"
            style={{
              fontSize: '12.5px',
              color: 'var(--ink-2)',
            }}
          >
            {e.ccrn}
            {' · '}
            {e.id}
          </div>
        </div>
        <StatusChip tone={closed ? 'ok' : e.sev === 'High' ? 'bad' : e.sev === 'Medium' ? 'warn' : ''}>
          {closed ? 'Closed' : e.sev}
        </StatusChip>
      </div>
      {!compact ? (
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
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: '13.5px',
          }}
          className="ink2"
        >
          {e.summary}
        </p>
      )}
      <div className="row">
        <div>
          <small
            className="muted"
            style={{
              fontSize: '12px',
              display: 'block',
            }}
          >
            {e.impact ? 'Potential value difference' : 'Impact'}
          </small>
          {e.impact ? (
            <span className="impact">{usd(e.impact)}</span>
          ) : (
            <b
              style={{
                fontSize: '13.5px',
              }}
            >
              {e.type === 'Missing Document'
                ? 'Export release blocked'
                : e.type === 'Expiring Export Licence'
                  ? 'BOE at risk'
                  : 'No direct value impact'}
            </b>
          )}
        </div>
        <span className="grow" />
        <div
          style={{
            textAlign: 'right',
          }}
        >
          <small
            className="muted"
            style={{
              fontSize: '12px',
              display: 'block',
            }}
          >
            Owner
          </small>
          <b
            style={{
              fontSize: '13.5px',
            }}
          >
            {e.owner}
          </b>
        </div>
      </div>
      {onOpen ? (
        <div className="row">
          <span
            className="muted"
            style={{
              fontSize: '12.5px',
            }}
          >
            {closed ? 'Resolved' : e.status}
            {' · raised '}
            {fmtDs(e.created)}
          </span>
          <span className="grow" />
          {closed ? (
            <SecondaryCTA sm={1} onClick={() => onOpen(e)}>
              View
            </SecondaryCTA>
          ) : (
            <PrimaryCTA onClick={() => onOpen(e)}>Review Exception</PrimaryCTA>
          )}
        </div>
      ) : null}
    </article>
  );
}

/* ---------- documents ---------- */
export function DocumentCard({ c, k, onView, onDownload, onUpload, canUpload }) {
  const d = docState(c, k);
  const meta = DOCS.find((x) => x[0] === k);
  const ok = DOC_OK.includes(d.st);
  const miss = d.st === 'Missing';
  const tone = ok ? 'ok' : miss ? 'bad' : d.st === 'Not started' ? '' : 'warn';
  return (
    <article className={'doc' + (miss ? ' miss' : '')}>
      <div className="dh">
        <span className="thumb" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <div
          style={{
            minWidth: 0,
            flex: 1,
          }}
        >
          <h4>{meta[1]}</h4>
          <div className="dno">{d.no || '—'}</div>
        </div>
        <StatusChip tone={tone}>{d.st}</StatusChip>
      </div>
      <div className="dmeta">
        <div>
          <small>Source</small>
          <b>{d.src}</b>
        </div>
        <div>
          <small>{ok ? 'Issued' : 'Updated'}</small>
          <b>{d.at ? fmtDT(d.at) : '—'}</b>
        </div>
        <div>
          <small>Version</small>
          <b>{d.ver ? 'v' + d.ver + '.0' : '—'}</b>
        </div>
        <div>
          <small>{k === 'lic' ? 'Valid until' : 'Linked to'}</small>
          <b
            className="mono"
            style={{
              fontSize: '11.5px',
            }}
          >
            {k === 'lic' ? fmtD(d.exp) : c.id.slice(-9)}
          </b>
        </div>
      </div>
      <div className="dact">
        {ok ? (
          [
            <SecondaryCTA sm={1} icon="eye" onClick={() => onView(k)}>
              View
            </SecondaryCTA>,
            <SecondaryCTA sm={1} icon="download" onClick={() => onDownload(k)}>
              Download
            </SecondaryCTA>,
          ]
        ) : miss && canUpload ? (
          <PrimaryCTA icon="upload" onClick={() => onUpload(k)}>
            Upload Document
          </PrimaryCTA>
        ) : (
          <span
            className="muted"
            style={{
              fontSize: '12.5px',
            }}
          >
            {miss ? 'Waiting for producer upload' : 'Available when this stage completes'}
          </span>
        )}
      </div>
    </article>
  );
}

export function ReadinessRing({ c, big }) {
  const r = readiness(c);
  const p = Math.round((r.done / r.tot) * 100);
  return (
    <div className="ready">
      <div
        className="ring"
        style={{
          '--p': p,
          '--rc': p === 100 ? 'var(--ok)' : 'var(--blue)',
        }}
        data-l={p + '%'}
        role="img"
        aria-label={p + '% complete'}
      />
      <div>
        <b
          style={{
            font: '800 20px var(--f-display)',
          }}
        >
          {r.done}
          {' of '}
          {r.tot}
          {' mandatory documents complete'}
        </b>
        <div
          className="muted"
          style={{
            fontSize: '13.5px',
          }}
        >
          {r.missing.length
            ? 'Missing: ' + r.missing.map((k) => DOCS.find((d) => d[0] === k)[1]).join(', ')
            : 'Export pack is complete and ready.'}
        </div>
      </div>
    </div>
  );
}

/* ---------- mobile inspection card ---------- */
export function MobileInspectionCard({ c, onStart, done, cta, ctx }) {
  const t = c.v.a_when || c.v.i_at;
  const p = P_(c);
  return (
    <article className={'mic' + (done ? ' done' : '')}>
      <div className="tm">
        <b>{fmtT(t)}</b>
        <small>{sameDay(t, Date.now()) ? 'Today' : fmtDs(t)}</small>
      </div>
      <div
        style={{
          minWidth: 0,
        }}
      >
        <div
          className="row"
          style={{
            gap: '8px',
          }}
        >
          <h4>{p.short}</h4>
          {(c.v.a_priority && c.v.a_priority !== 'Normal') || c.seq === 127 ? (
            <StatusChip tone="bad">
              {c.v.a_priority && c.v.a_priority !== 'Normal' ? c.v.a_priority : 'High'}
              {' priority'}
            </StatusChip>
          ) : (
            <StatusChip>Normal priority</StatusChip>
          )}
        </div>
        <div className="mf">
          <span>
            <Icon n="factory" c="sm" />
            {p.mine}
          </span>
          <span>
            <Icon n="box" c="sm" />
            {M(c).name}
            {' · '}
            {nf(c.v.d_qty)}
            {' MT'}
          </span>
          <span>
            <Icon n="pin" c="sm" />
            {p.loc}
          </span>
        </div>
        <div
          className="mf"
          style={{
            marginTop: '2px',
          }}
        >
          <span>
            <Icon n="user" c="sm" />
            {p.contact}
            {' · '}
            {p.phone}
          </span>
        </div>
        <div
          className="mono muted"
          style={{
            fontSize: '12.5px',
            marginTop: '4px',
          }}
        >
          {c.id}
        </div>
        {!done && ctx ? (
          <div className="sec">
            <Ghost
              icon="route"
              onClick={() => ctx.toast(`Directions to ${p.mine}: ${p.gps} (${p.loc}). Opened in your maps app.`, '')}
            >
              View Directions
            </Ghost>
            <Ghost
              icon="msg"
              onClick={() =>
                ctx.compose({
                  ccrn: c.id,
                  kind: 'Send Message',
                  to: p.contact + ' · ' + p.short,
                })
              }
            >
              Contact Producer
            </Ghost>
            <Ghost icon="files" onClick={() => ctx.openC(c.id, 'Documents')}>
              View Documents
            </Ghost>
          </div>
        ) : null}
      </div>
      <div>
        {done ? (
          <StatusChip tone="ok" icon="check">
            {'Submitted '}
            {fmtT(c.v.i_at)}
          </StatusChip>
        ) : (
          <PrimaryCTA lg={1} icon="play" onClick={() => onStart(c)}>
            {cta || 'Start Inspection'}
          </PrimaryCTA>
        )}
      </div>
    </article>
  );
}
