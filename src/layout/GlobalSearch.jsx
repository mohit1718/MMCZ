import { useState, useEffect, useRef } from 'react';
import { Icon } from '../components/Icon';
import { StatusChip } from '../components/primitives';
import { nf } from '../lib/format';
import { B_, M, P_, qtyOf, refs } from '../lib/lifecycle';
import PERSONAS from '../data/personas.json';

/* ---------- global search ---------- */
export function GlobalSearch({ db, s, cons, ctx }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const f = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, []);
  const ext = PERSONAS[s.persona].ext;
  const ql = q.trim().toLowerCase();
  const res = !ql
    ? []
    : cons
        .map((c) => {
          const R = refs(c);
          const fields = [
            ['Consignment ID', c.id],
            ['Producer', P_(c).name],
            ['Mineral', M(c).name],
            ['Invoice', c.v.n_no],
            ['CD1', c.v.c_no],
            ['CD1 reference', c.v.c_ref],
            ['BOE', c.v.b_no],
            ['Buyer', B_(c).name],
          ];
          const hit = fields.find(([, v]) => v && String(v).toLowerCase().includes(ql));
          return hit
            ? {
                c,
                hit,
              }
            : null;
        })
        .filter(Boolean)
        .slice(0, 8);
  const pick = (r) => {
    setOpen(false);
    setQ('');
    ctx.openC(r.c.id);
  };
  return (
    <div className="gsearch" ref={ref}>
      <Icon n="search" c="sm" />
      <input
        id="gsearch"
        value={q}
        placeholder={
          ext ? 'Search your consignments, invoice, BOE…' : 'Search ID, producer, invoice, CD1, BOE, mineral'
        }
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setI(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setI(Math.min(res.length - 1, i + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setI(Math.max(0, i - 1));
          } else if (e.key === 'Enter' && res[i]) pick(res[i]);
          else if (e.key === 'Escape') setOpen(false);
        }}
        aria-label="Global consignment search"
      />
      {open && ql ? (
        <div className="gres" role="listbox">
          {res.length ? (
            res.map((r, j) => (
              <button key={r.c.id} className={j === i ? 'on' : ''} onMouseEnter={() => setI(j)} onClick={() => pick(r)}>
                <span
                  style={{
                    color: 'var(--ink-3)',
                  }}
                >
                  <Icon n="box" />
                </span>
                <span
                  style={{
                    minWidth: 0,
                  }}
                >
                  <b className="mono">{r.c.id}</b>
                  <small>
                    {P_(r.c).short}
                    {' · '}
                    {M(r.c).name}
                    {' · '}
                    {nf(qtyOf(r.c))}
                    {' MT'}
                  </small>
                </span>
                <StatusChip>{r.hit[0]}</StatusChip>
              </button>
            ))
          ) : (
            <div className="hint">
              No consignment matches “{q}”. Search by consignment ID, producer, invoice number, CD1 or BOE reference, or
              mineral.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
