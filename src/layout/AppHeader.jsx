import { useState, useEffect, useRef } from 'react';
import { Logo } from '../components/Brand';
import { Icon } from '../components/Icon';
import { PersonaBadge } from '../components/primitives';
import { GlobalSearch } from './GlobalSearch';
import { PersonaSelector } from './PersonaSelector';
import { initials } from '../lib/format';
import { orgName, userOf } from '../lib/masterData';
import { MODULE, myMsgs } from '../lib/navigation';
import PERSONAS from '../data/personas.json';

/* ---------- app header ---------- */
export function AppHeader({ db, s, cons, ctx, onBurger }) {
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  const user = userOf(s);
  const unread = myMsgs(db, s, cons).filter((m) => !m.read).length;
  useEffect(() => {
    const f = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenu(false);
    };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, []);
  return (
    <header className="hdr">
      <button className="hbtn burger" aria-label="Open menu" onClick={onBurger}>
        <Icon n="menu" />
      </button>
      <button
        className="brand"
        onClick={() =>
          ctx.go({
            page: PERSONAS[s.persona] && s.persona === 'admin' ? 'users' : 'home',
          })
        }
        aria-label="Home"
      >
        <Logo src={db.logo} size={42} />
        <span className="brand-t">
          <b>Control Tower</b>
          <small>Digital Consignment Management</small>
        </span>
      </button>
      <span className="sep" />
      <span className="module">{MODULE[s.persona]}</span>
      <span
        className="grow"
        style={{
          maxWidth: '24px',
        }}
      />
      <GlobalSearch db={db} s={s} cons={cons} ctx={ctx} />
      <span className="grow" />
      <button
        className="hbtn"
        aria-label={'Notifications' + (unread ? `, ${unread} unread` : '')}
        onClick={() =>
          ctx.setDrawer({
            k: 'notif',
          })
        }
      >
        <Icon n="bell" />
        {unread ? <span className="dot">{unread}</span> : null}
      </button>
      <PersonaSelector s={s} ctx={ctx} />
      <div
        style={{
          position: 'relative',
        }}
        ref={ref}
      >
        <button className="me" onClick={() => setMenu(!menu)} aria-expanded={menu}>
          <span className="avatar">{initials(user)}</span>
          <span className="who">
            <b>{user}</b>
            <PersonaBadge persona={s.persona} />
          </span>
          <Icon n="down" c="sm" />
        </button>
        {menu ? (
          <div className="menu">
            <div className="mh">
              <b>{user}</b>
              <small>
                {PERSONAS[s.persona].title}
                {' · '}
                {orgName(s)}
              </small>
            </div>
            <button
              onClick={() => {
                setMenu(false);
                ctx.setDrawer({
                  k: 'notif',
                });
              }}
            >
              <Icon n="bell" c="sm" />
              {'Notifications & activity'}
            </button>
            <button
              onClick={() => {
                setMenu(false);
                ctx.logout();
              }}
            >
              <Icon n="logout" c="sm" />
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
