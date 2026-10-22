import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../components/Icon';
import { groupOf } from '../lib/masterData';
import GROUPS from '../data/personaGroups.json';
import PERSONAS from '../data/personas.json';

/* ---------- persona selector ---------- */
export function PersonaSelector({ s, ctx, light }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const g = groupOf(s.persona);
  const P = PERSONAS[s.persona];
  useEffect(() => {
    const f = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, []);
  const groups = s.persona === 'admin' ? [groupOf('admin')] : GROUPS;
  const pick = (role) => {
    setOpen(false);
    if (role !== s.persona)
      ctx.switchTo(role, {
        page: role === 'admin' ? 'users' : 'home',
      });
  };
  return (
    <div className="psel" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        style={
          light
            ? {
                color: 'var(--navy-ink)',
              }
            : null
        }
      >
        <span
          style={{
            minWidth: 0,
          }}
        >
          <small>Current persona</small>
          <b className="pl">
            {g.label}
            {P.sub ? ' · ' + P.sub : ''}
          </b>
          <b className="ps">{P.sub || g.label.replace('MMCZ ', '')}</b>
        </span>
        <Icon n="down" c="sm" />
      </button>
      {open ? (
        <div className="pmenu" role="menu">
          <div className="ph-">Personas you can access</div>
          {groups.map((G) => (
            <React.Fragment key={G.k}>
              <button
                role="menuitem"
                className={G.roles.length === 1 && G.roles[0] === s.persona ? 'on' : ''}
                onClick={() => pick(G.roles.includes(s.persona) ? s.persona : G.roles[0])}
              >
                <span className="pi">
                  <Icon n={G.icon} c="sm" />
                </span>
                <span
                  style={{
                    minWidth: 0,
                  }}
                >
                  <b
                    style={{
                      display: 'block',
                      fontWeight: 600,
                    }}
                  >
                    {G.label}
                  </b>
                  {G.roles.length === 1 ? <small className="muted">{PERSONAS[G.roles[0]].user}</small> : null}
                </span>
                {G.roles.length === 1 && G.roles[0] === s.persona ? (
                  <span className="ck">
                    <Icon n="check" c="sm" s="2.6" />
                  </span>
                ) : null}
              </button>
              {G.roles.length > 1
                ? G.roles.map((r) => (
                    <button
                      key={r}
                      role="menuitem"
                      className={'sub' + (r === s.persona ? ' on' : '')}
                      onClick={() => pick(r)}
                    >
                      <span
                        style={{
                          minWidth: 0,
                        }}
                      >
                        {PERSONAS[r].sub}
                        <small
                          className="muted"
                          style={{
                            display: 'block',
                          }}
                        >
                          {PERSONAS[r].user}
                        </small>
                      </span>
                      {r === s.persona ? (
                        <span className="ck">
                          <Icon n="check" c="sm" s="2.6" />
                        </span>
                      ) : null}
                    </button>
                  ))
                : null}
            </React.Fragment>
          ))}
        </div>
      ) : null}
    </div>
  );
}
