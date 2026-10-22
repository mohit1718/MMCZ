import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { initials } from '../lib/format';
import PERSONAS from '../data/personas.json';

/* ---------- primitives ---------- */
export function PrimaryCTA({ children, onClick, icon, disabled, busy, lg, block, type, title }) {
  return (
    <button
      type={type || 'button'}
      className={'btn pri' + (lg ? ' lg' : '') + (block ? ' block' : '')}
      onClick={onClick}
      disabled={disabled || busy}
      title={title}
    >
      {busy ? <span className="spin" /> : icon ? <Icon n={icon} /> : null}
      {children}
    </button>
  );
}

export function SecondaryCTA({ children, onClick, icon, disabled, busy, sm, lg, block, danger, title }) {
  return (
    <button
      type="button"
      className={'btn ' + (danger ? 'danger' : 'sec') + (sm ? ' sm' : '') + (lg ? ' lg' : '') + (block ? ' block' : '')}
      onClick={onClick}
      disabled={disabled || busy}
      title={title}
    >
      {busy ? <span className="spin" /> : icon ? <Icon n={icon} c="sm" /> : null}
      {children}
    </button>
  );
}

export function Ghost({ children, onClick, icon, disabled }) {
  return (
    <button type="button" className="btn ghost sm" onClick={onClick} disabled={disabled}>
      {icon ? <Icon n={icon} c="sm" /> : null}
      {children}
    </button>
  );
}

export function StatusChip({ tone, children, icon }) {
  return (
    <span className={'chip ' + (tone || '')}>
      {icon ? <Icon n={icon} /> : null}
      {children}
    </span>
  );
}

export function PersonaBadge({ persona }) {
  return <span className="pbadge">{PERSONAS[persona].label}</span>;
}

export function Card({ title, sub, right, children, cls, bodyCls }) {
  return (
    <section className={'card ' + (cls || '')}>
      {title || right ? (
        <div className="ch">
          {title ? <h3>{title}</h3> : null}
          <span className="grow" />
          {right}
          {sub ? <div className="sub">{sub}</div> : null}
        </div>
      ) : null}
      <div className={'cb ' + (bodyCls || '')}>{children}</div>
    </section>
  );
}

export function PageHeader({ eyebrow, title, sub, actions }) {
  return (
    <header className="phd">
      <div
        style={{
          minWidth: 0,
        }}
      >
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1>{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
      {actions ? <div className="acts">{actions}</div> : null}
    </header>
  );
}

export function KpiCard({ label, value, sub, tone, onClick, icon }) {
  const T = onClick ? 'button' : 'div';
  return (
    <T className={'kpi ' + (tone || '')} onClick={onClick} type={onClick ? 'button' : undefined}>
      <span className="kl">
        <i className="tdot" />
        {label}
      </span>
      <span className="kv_">{value}</span>
      {sub ? <span className="ks">{sub}</span> : null}
    </T>
  );
}

export function EmptyState({ icon, title, text, tone, action }) {
  return (
    <div className={'empty ' + (tone || '')}>
      <span className="ei">
        <Icon n={icon || 'info'} c="lg" />
      </span>
      <b>{title}</b>
      {text ? <p>{text}</p> : null}
      {action || null}
    </div>
  );
}

export function Banner({ tone, icon, title, text, actions }) {
  return (
    <div className={'ban ' + (tone || '')} role={tone === 'bad' ? 'alert' : 'status'}>
      <span className="bi">
        <Icon n={icon || (tone === 'bad' ? 'alert' : tone === 'ok' ? 'check' : tone === 'warn' ? 'clock' : 'info')} />
      </span>
      <div
        style={{
          minWidth: 0,
        }}
      >
        <b>{title}</b>
        {text ? <p>{text}</p> : null}
      </div>
      {actions ? <div className="bact">{actions}</div> : null}
    </div>
  );
}

export function Skeleton({ rows = 3 }) {
  return (
    <div className="col">
      {Array.from({
        length: rows,
      }).map((_, i) => (
        <div
          key={i}
          className="sk"
          style={{
            width: 90 - i * 15 + '%',
          }}
        />
      ))}
    </div>
  );
}

export function KV({ rows, cls }) {
  return (
    <dl className={'kv ' + (cls || '')}>
      {rows.filter(Boolean).map(([a, b]) => (
        <div key={a}>
          <dt>{a}</dt>
          <dd>{b == null || b === '' ? '—' : b}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => {
        const [k, l] = Array.isArray(t) ? t : [t, t];
        return (
          <button
            key={k}
            role="tab"
            aria-selected={value === k}
            className={value === k ? 'on' : ''}
            onClick={() => onChange(k)}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

export function Seg({ opts, value, onChange }) {
  return (
    <div className="seg" role="group">
      {opts.map(([k, l, n]) => (
        <button key={k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>
          {l}
          {n != null ? <span className="c">{n}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function FilterBar({ q, setQ, placeholder, children, id }) {
  return (
    <div className="fbar">
      {children}
      <span className="grow" />
      {setQ ? (
        <label className="fsearch">
          <span className="sr">Search</span>
          <Icon n="search" c="sm" />
          <input
            className="in"
            id={id || 'fq'}
            value={q}
            placeholder={placeholder || 'Search'}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      ) : null}
    </div>
  );
}

export function DataTable({ cols, rows, onRow, sel, empty }) {
  return (
    <div className="tw">
      <table className="dt">
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i} className={c.n ? 'n' : ''}>
                {c.h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr
                key={r.key || i}
                className={(onRow ? 'click' : '') + (sel && sel === r.key ? ' sel' : '')}
                onClick={onRow ? () => onRow(r) : null}
              >
                {cols.map((c, j) => (
                  <td key={j} className={c.n ? 'n' : ''}>
                    {c.r(r)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={cols.length}>
                {empty || <EmptyState title="Nothing to show" text="No records match these filters." />}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function DetailDrawer({ title, sub, onClose, children, footer, wide }) {
  useEffect(() => {
    const f = (e) => {
      if (e.key === 'Escape') onClose();
    };
    addEventListener('keydown', f);
    return () => removeEventListener('keydown', f);
  }, []);
  return (
    <React.Fragment>
      <div className="scrim" onClick={onClose} />
      <aside className={'drawer' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="dr-h">
          <div
            style={{
              minWidth: 0,
            }}
          >
            <h3>{title}</h3>
            {sub ? <small>{sub}</small> : null}
          </div>
          <button className="x" onClick={onClose} aria-label="Close">
            <Icon n="x" />
          </button>
        </div>
        <div className="dr-b">{children}</div>
        {footer ? <div className="dr-f">{footer}</div> : null}
      </aside>
    </React.Fragment>
  );
}

export function ConfirmationModal({
  title,
  text,
  reason,
  reasonLabel,
  confirm,
  tone,
  onConfirm,
  onClose,
  children,
  defaultReason,
}) {
  const [r, setR] = useState(defaultReason || '');
  const [tried, setTried] = useState(false);
  const go = () => {
    if (reason && r.trim().length < 5) {
      setTried(true);
      return;
    }
    onConfirm(r.trim());
  };
  return (
    <React.Fragment>
      <div className="scrim modal-scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mh-">
          <div>
            <h3>{title}</h3>
            {text ? (
              <p
                className="ink2"
                style={{
                  margin: '6px 0 0',
                }}
              >
                {text}
              </p>
            ) : null}
          </div>
          <button className="x" onClick={onClose} aria-label="Close">
            <Icon n="x" />
          </button>
        </div>
        <div className="mb-">
          {children}
          {reason ? (
            <label className="fld">
              <span className="lbl">
                {reasonLabel || 'Reason'} <span className="err">required</span>
              </span>
              <textarea
                id="cm-reason"
                className={'in' + (tried && r.trim().length < 5 ? ' inv' : '')}
                value={r}
                onChange={(e) => setR(e.target.value)}
                placeholder="Explain the decision. This is recorded in the audit trail."
              />
              {tried && r.trim().length < 5 ? (
                <span className="err">
                  Add a reason of at least a few words so the audit trail explains this decision.
                </span>
              ) : (
                <span className="help">Recorded with your name and time in the audit trail.</span>
              )}
            </label>
          ) : null}
        </div>
        <div className="mf-">
          <SecondaryCTA onClick={onClose}>Cancel</SecondaryCTA>
          {tone === 'danger' ? (
            <button className="btn danger" onClick={go}>
              {confirm || 'Confirm'}
            </button>
          ) : (
            <PrimaryCTA onClick={go}>{confirm || 'Confirm'}</PrimaryCTA>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}

export function SuccessPanel({ title, text, done, next, actions }) {
  return (
    <div className="succ" role="status">
      <div className="succ-h">
        <span className="bi">
          <Icon n="check" s="2.4" />
        </span>
        <div>
          <b>{title}</b>
          {text ? <p>{text}</p> : null}
        </div>
      </div>
      <div className="succ-b">
        {done && done.length ? (
          <div className="done-l">
            {done.map((d) => (
              <span key={d}>
                <Icon n="check" c="sm" s="2.4" />
                {d}
              </span>
            ))}
          </div>
        ) : null}
        {next ? (
          <div className="next">
            <span
              className="avatar"
              style={{
                width: '32px',
                height: '32px',
                fontSize: '11px',
              }}
            >
              {initials(next.who)}
            </span>
            <div>
              <small>Next step</small>
              <b>{next.what}</b>
              <span
                className="muted"
                style={{
                  fontSize: '13px',
                }}
              >
                {'Owner: '}
                {next.who}
              </span>
            </div>
          </div>
        ) : null}
        {actions ? <div className="row">{actions}</div> : null}
      </div>
    </div>
  );
}
