import { Icon } from '../components/Icon';
import { orgName } from '../lib/masterData';
import { MODULE, NAV, navCount } from '../lib/navigation';
import PERSONAS from '../data/personas.json';

/* ---------- side navigation ---------- */
export function SideNavigation({ db, s, cons, route, ctx, open }) {
  const items = NAV[s.persona];
  const cur = route.page;
  const home = items[0][0];
  const active = (k) => cur === k || (k === home && !items.some((i) => i[0] === cur));
  return (
    <nav className={'side' + (open ? ' open' : '')} aria-label="Main navigation">
      <h6>{s.persona === 'admin' ? 'Administration' : MODULE[s.persona]}</h6>
      {items.map(([k, l, ic]) => {
        const n = navCount(db, s, cons, k);
        return (
          <button
            key={k}
            className={'nav' + (active(k) ? ' on' : '')}
            aria-current={active(k) ? 'page' : null}
            onClick={() =>
              ctx.go({
                page: k,
              })
            }
          >
            <Icon n={ic} />
            <span>{l}</span>
            {n ? (
              <span className={'cnt' + (k === 'notifs' || k === 'queue' || k === 'requests' ? ' hot' : '')}>{n}</span>
            ) : null}
          </button>
        );
      })}
      <div className="side-foot">
        <b>{orgName(s)}</b>
        <br />
        {PERSONAS[s.persona].ext
          ? 'External access · your records only'
          : s.persona === 'admin'
            ? 'Configuration changes are audited'
            : 'MMCZ internal'}
      </div>
    </nav>
  );
}
