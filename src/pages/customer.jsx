import { Logo } from '../components/Brand';
import { ActivityTimeline, DocumentCard } from '../components/cards';
import { ConsignmentHeader } from '../components/ConsignmentHeader';
import { Icon } from '../components/Icon';
import { NotFound } from '../components/NotFound';
import { Banner, Card, EmptyState, KV, KpiCard, PageHeader, PrimaryCTA, StatusChip } from '../components/primitives';
import { PersonaSelector } from '../layout/PersonaSelector';
import { custStage } from '../lib/derived';
import { fmtD, fmtDT, initials, nf } from '../lib/format';
import { B_, M, P_, R_, isDone, qtyOf, refs, sIdx } from '../lib/lifecycle';
import { orgName, routeLabel, userOf } from '../lib/masterData';
import { NAV, myMsgs } from '../lib/navigation';
import BUYERS from '../data/buyers.json';
import DOCS from '../data/documentTypes.json';

/* ================= CUSTOMER / AGENT PORTAL ================= */
export const CUST_STEPS = [
  ['Preparing', [0, 1]],
  ['Inspection & quality', [2, 3]],
  ['Export documentation', [4, 5, 6]],
  ['Customs clearance', [7, 8]],
  ['Documents released', [9]],
];

export function CustProgress({ c }) {
  const cur = CUST_STEPS.findIndex((x) => x[1].includes(Math.min(c.stage, 9)));
  return (
    <div className="lc-wrap">
      <div
        className="lc"
        style={{
          '--n': CUST_STEPS.length,
          minWidth: '480px',
        }}
      >
        {CUST_STEPS.map(([t], i) => {
          const st = i < cur || isDone(c) ? 'done' : i === cur ? 'cur' : 'fut';
          return (
            <div key={t} className={'lc-s ' + st}>
              <span className="lc-d">{st === 'done' ? <Icon n="check" c="sm" s="3" /> : i + 1}</span>
              <b>{t}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ShipmentsPage({ db, s, cons, ctx }) {
  const act = cons.filter((c) => !isDone(c)),
    rel = cons.filter(isDone);
  return (
    <div className="page">
      <PageHeader
        eyebrow={orgName(s)}
        title="My Shipments"
        sub="Shipments MMCZ is processing for you, and documents released to you."
      />
      <div className="kpis k4">
        <KpiCard label="Active Shipments" value={act.length} tone="info" />
        <KpiCard
          label="Cleared"
          value={cons.filter((c) => c.stage >= sIdx('clr') + 1 || isDone(c)).length}
          tone="ok"
          sub="Customs exit recorded"
        />
        <KpiCard label="Documents Ready" value={rel.length} tone="ok" sub="Export packs released" />
        <KpiCard
          label="Awaiting Release"
          value={act.filter((c) => c.stage >= sIdx('boe')).length}
          tone={act.some((c) => c.stage >= sIdx('boe')) ? 'warn' : ''}
          sub="In customs or release"
        />
      </div>
      <div className="ccards">
        {[...rel, ...act].map((c) => (
          <button
            key={c.id}
            className="ccard"
            onClick={() =>
              ctx.go({
                page: 'ship',
                id: c.id,
              })
            }
          >
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
                }}
              >
                <StatusChip tone={isDone(c) ? 'ok' : 'info'}>{custStage(c)}</StatusChip>
              </div>
            </div>
            <div
              style={{
                minWidth: 0,
              }}
            >
              <div className="facts">
                <div>
                  <small>Supplier</small>
                  <b>{P_(c).short}</b>
                </div>
                <div>
                  <small>Port of loading</small>
                  <b>{R_(c).port.split(',')[0]}</b>
                </div>
                <div>
                  <small>Expected dispatch</small>
                  <b>{fmtD(c.v.d_dispatch)}</b>
                </div>
                <div>
                  <small>Documents</small>
                  <b>{isDone(c) ? '9 available' : 'After release'}</b>
                </div>
              </div>
              <CustProgress c={c} />
            </div>
            <span
              style={{
                color: 'var(--ink-3)',
              }}
            >
              <Icon n="right" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ShipmentPage({ db, s, cons, ctx, id }) {
  const c = db.cons[id];
  if (!c || !cons.some((x) => x.id === id)) return <NotFound ctx={ctx} />;
  const done = isDone(c);
  return [
    <ConsignmentHeader db={db} c={c} ext={1} />,
    <div className="page">
      <PageHeader
        eyebrow={[
          <button
            className="crumb"
            onClick={() =>
              ctx.go({
                page: 'home',
              })
            }
          >
            My Shipments
          </button>,
          ' / ',
          c.id,
        ]}
        title={`${nf(qtyOf(c))} MT ${M(c).name}`}
        sub={`From ${P_(c).name} · ${routeLabel(c.route)}`}
        actions={
          done ? (
            <PrimaryCTA icon="download" onClick={() => ctx.downloadPack(c.id)}>
              Download export pack
            </PrimaryCTA>
          ) : null
        }
      />
      <Card>
        <CustProgress c={c} />
        <div
          style={{
            marginTop: '18px',
          }}
        >
          {done ? (
            <Banner
              tone="ok"
              title="Documents released"
              text={`MMCZ released the export pack ${refs(c).pack} on ${fmtDT(c.v.p_at)}.`}
            />
          ) : (
            <Banner
              title={custStage(c)}
              text="MMCZ will release the approved export documents here once customs clearance is complete."
            />
          )}
        </div>
      </Card>
      <div className="grid2">
        <Card title="Shipment">
          <KV
            cls="two"
            rows={[
              ['Product', `${M(c).name} · ${M(c).grade}`],
              ['Quantity', nf(qtyOf(c)) + ' MT'],
              ['Supplier', P_(c).name],
              ['Buyer', B_(c).name],
              ['Port of loading', R_(c).port],
              ['Discharge', R_(c).discharge],
              ['Vessel', done || c.stage >= 7 ? R_(c).vessel : 'To be confirmed'],
              ['Clearing agent', B_(c).agent],
              ['Bill of Entry', done ? c.v.b_no : 'Available after release'],
              ['Customs exit', done ? c.v.x_exit : 'Available after release'],
            ]}
          />
        </Card>
        <Card title="Shipment updates">
          <ActivityTimeline
            items={c.tl
              .filter((t) => t.ext)
              .map((t) => ({
                ...t,
                by: '',
              }))}
            showBy={false}
            limit={8}
          />
        </Card>
      </div>
      <section className="col">
        <h3
          style={{
            fontSize: '17px',
          }}
        >
          Documents
        </h3>
        {done ? (
          <div className="docs">
            {DOCS.map((d) => (
              <DocumentCard
                key={d[0]}
                c={c}
                k={d[0]}
                onView={(k) => ctx.viewDoc(c.id, k)}
                onDownload={(k) => ctx.downloadDoc(c.id, k)}
              />
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon="lock"
              title="Documents are not released yet"
              text="You will be notified when MMCZ releases the approved export pack for this shipment."
            />
          </div>
        )}
      </section>
    </div>,
  ];
}

export function CustomerShell({ db, s, cons, ctx, route, children }) {
  const tabs = NAV.customer;
  const unread = myMsgs(db, s, cons).filter((m) => !m.read).length;
  return (
    <div className="portal">
      <header className="pt-h">
        <div className="pt-hi">
          <Logo src={db.logo} size={44} />
          <span className="brand-t">
            <b>MMCZ Shipment Portal</b>
            <small>External access for customers and agents</small>
          </span>
          <span
            className="ext"
            style={{
              color: 'var(--navy-dim)',
              borderColor: 'var(--navy-line)',
            }}
          >
            <Icon n="lock" c="sm" />
            Approved information only
          </span>
          <div className="pt-me">
            <button
              className="hbtn"
              aria-label="Notifications"
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
            <span className="avatar">{initials(userOf(s))}</span>
            <span
              className="who"
              style={{
                color: 'var(--navy-ink)',
              }}
            >
              <b>{userOf(s)}</b>
              <small
                style={{
                  color: 'var(--navy-dim)',
                }}
              >
                {BUYERS[s.org].short}
              </small>
            </span>
            <button className="hbtn" aria-label="Sign out" onClick={ctx.logout}>
              <Icon n="logout" />
            </button>
          </div>
        </div>
        <nav className="pt-nav" aria-label="Portal">
          {tabs.map(([k, l]) => (
            <button
              key={k}
              className={route.page === k || (k === 'home' && route.page === 'ship') ? 'on' : ''}
              onClick={() =>
                ctx.go({
                  page: k,
                })
              }
            >
              {l}
            </button>
          ))}
        </nav>
      </header>
      <main className="pt-main">{children}</main>
    </div>
  );
}
