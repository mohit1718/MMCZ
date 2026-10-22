import { Logo } from '../components/Brand';
import { IntegrationCard } from '../components/cards';
import { Icon } from '../components/Icon';
import { Card, DataTable, Ghost, KV, PageHeader, SecondaryCTA, StatusChip } from '../components/primitives';
import { DAY } from '../lib/constants';
import { slaH } from '../lib/derived';
import { fmtD, usd } from '../lib/format';
import { QTY_TOL } from '../lib/lifecycle';
import { orgName, routeLabel } from '../lib/masterData';
import DOCS from '../data/documentTypes.json';
import SYS from '../data/integrationSystems.json';
import LOGINS from '../data/logins.json';
import MINERALS from '../data/minerals.json';
import PERSONAS from '../data/personas.json';
import PRODUCERS from '../data/producers.json';
import STAGES from '../data/stages.json';

/* ================= ADMINISTRATION ================= */
export function AdminPage({ db, s, ctx, page }) {
  const band = (
    <div className="admin-band">
      <Icon n="gear" c="sm" />
      Administration is separate from operations. Every change here is audited.
    </div>
  );
  const T = (t, sub, body) => (
    <div className="page">
      {band}
      <PageHeader title={t} sub={sub} />
      {body}
    </div>
  );
  if (page === 'users')
    return T(
      'Users',
      'People with access, their role and organisation.',
      <div className="card">
        <DataTable
          cols={[
            {
              h: 'Name',
              r: (u) => [<b>{u.user}</b>, <span className="sub">{u.title}</span>],
            },
            {
              h: 'Role',
              r: (u) => u.label,
            },
            {
              h: 'Organisation',
              r: (u) => u.orgN,
            },
            {
              h: 'Sign-in',
              r: (u) => u.mail,
            },
            {
              h: 'MFA',
              r: () => <StatusChip tone="ok">Enrolled</StatusChip>,
            },
            {
              h: 'Status',
              r: () => <StatusChip tone="ok">Active</StatusChip>,
            },
          ]}
          rows={Object.entries(PERSONAS).map(([k, p]) => ({
            ...p,
            key: k,
            orgN: orgName({
              persona: k,
              org: p.org,
            }),
            mail: Object.keys(LOGINS).find((m) => LOGINS[m] === k),
          }))}
        />
      </div>,
    );
  if (page === 'roles') {
    const caps = [
      ['View all consignments', ['coordinator', 'inspector', 'lab', 'finance', 'compliance', 'executive', 'admin']],
      ['Declare exports', ['producer']],
      ['Approve declarations', ['checker']],
      ['Assign inspectors', ['coordinator']],
      ['Submit inspections', ['inspector']],
      ['Approve EVR', ['lab']],
      ['Send to Minera ERP', ['finance']],
      ['Submit to RBZ / ZIMRA', ['compliance']],
      ['Approve export release', ['compliance']],
      ['Act on exceptions', ['coordinator', 'lab', 'finance', 'compliance']],
      ['View internal notes & audit', ['coordinator', 'lab', 'finance', 'compliance', 'executive', 'admin']],
      ['Configure platform', ['admin']],
    ];
    const ks = Object.keys(PERSONAS);
    return T(
      'Roles',
      'What each role can see and do. Roles come from the authenticated identity.',
      <div className="card">
        <div className="tw">
          <table className="dt">
            <thead>
              <tr>
                <th>Capability</th>
                {ks.map((k) => (
                  <th
                    key={k}
                    style={{
                      textAlign: 'center',
                    }}
                  >
                    {PERSONAS[k].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {caps.map(([t, who]) => (
                <tr key={t}>
                  <td>
                    <b>{t}</b>
                  </td>
                  {ks.map((k) => (
                    <td
                      key={k}
                      style={{
                        textAlign: 'center',
                      }}
                    >
                      {who.includes(k) ? (
                        <span
                          style={{
                            color: 'var(--ok)',
                          }}
                        >
                          <Icon n="check" c="sm" s="2.6" />
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>,
    );
  }
  if (page === 'producers')
    return T(
      'Producers',
      'Registered exporters and their licences.',
      <div className="card">
        <DataTable
          cols={[
            {
              h: 'Producer',
              r: (p) => [
                <b>{p.name}</b>,
                <span className="sub">
                  {p.id}
                  {' · TIN '}
                  {p.tin}
                </span>,
              ],
            },
            {
              h: 'Mineral',
              r: (p) => MINERALS[p.code].name,
            },
            {
              h: 'Export licence',
              r: (p) => <span className="mono">{p.lic}</span>,
            },
            {
              h: 'Valid until',
              r: (p) => {
                const d = (new Date(p.licexp) - Date.now()) / DAY;
                return [
                  fmtD(p.licexp),
                  ' ',
                  d < 30 ? (
                    <StatusChip tone="warn">
                      {Math.round(d)}
                      {' days'}
                    </StatusChip>
                  ) : (
                    ''
                  ),
                ];
              },
            },
            {
              h: 'Bank',
              r: (p) => p.bank,
            },
            {
              h: 'Contacts',
              r: (p) => `${p.contact} · ${p.checker}`,
            },
          ]}
          rows={Object.values(PRODUCERS).map((p) => ({
            ...p,
            key: p.id,
          }))}
        />
      </div>,
    );
  if (page === 'mines')
    return T(
      'Mines',
      'Sites registered for inspection.',
      <div className="card">
        <DataTable
          cols={[
            {
              h: 'Mine / site',
              r: (p) => <b>{p.mine}</b>,
            },
            {
              h: 'Producer',
              r: (p) => p.short,
            },
            {
              h: 'Location',
              r: (p) => p.loc,
            },
            {
              h: 'GPS',
              r: (p) => <span className="mono">{p.gps}</span>,
            },
            {
              h: 'Inspection region',
              r: (p) => p.region,
            },
            {
              h: 'Export route',
              r: (p) => routeLabel(p.route),
            },
          ]}
          rows={Object.values(PRODUCERS).map((p) => ({
            ...p,
            key: p.id,
          }))}
        />
      </div>,
    );
  if (page === 'minerals')
    return T(
      'Minerals',
      'Products, HS codes and contract rates.',
      <div className="card">
        <DataTable
          cols={[
            {
              h: 'Mineral',
              r: (m) => <b>{m.name}</b>,
            },
            {
              h: 'Code',
              r: (m) => m.code,
            },
            {
              h: 'HS code',
              r: (m) => <span className="mono">{m.hs}</span>,
            },
            {
              h: 'Grade',
              r: (m) => m.grade,
            },
            {
              h: 'Contract rate',
              n: 1,
              r: (m) => usd(m.rate) + ' / MT',
            },
            {
              h: 'Packing',
              r: (m) => m.pack,
            },
          ]}
          rows={Object.values(MINERALS).map((m) => ({
            ...m,
            key: m.code,
          }))}
        />
      </div>,
    );
  if (page === 'assay')
    return T(
      'Assay templates',
      'Parameters and tolerances applied to every assay. Results beyond tolerance raise an exception automatically.',
      <div className="grid2">
        {Object.values(MINERALS).map((m) => (
          <Card key={m.code} title={m.name} sub={m.grade}>
            <DataTable
              cols={[
                {
                  h: 'Parameter',
                  r: (r) => <b>{r[1]}</b>,
                },
                {
                  h: 'Unit',
                  r: (r) => r[2],
                },
                {
                  h: 'Target',
                  n: 1,
                  r: (r) => r[3],
                },
                {
                  h: 'Tolerance',
                  n: 1,
                  r: (r) => '± ' + r[4],
                },
              ]}
              rows={m.template.map((r) => ({
                0: r[0],
                1: r[1],
                2: r[2],
                3: r[3],
                4: r[4],
                key: r[0],
              }))}
            />
          </Card>
        ))}
      </div>,
    );
  if (page === 'sla')
    return T(
      'SLA rules',
      'Target hours per stage. Changes apply to every live consignment immediately.',
      <div className="card">
        <DataTable
          cols={[
            {
              h: 'Stage',
              r: (st) => <b>{st.name}</b>,
            },
            {
              h: 'Owner',
              r: (st) => st.owner + (st.sys ? ' · ' + st.sys : ''),
            },
            {
              h: 'Clock starts',
              r: (st) =>
                st.k === 'cd1'
                  ? 'On submission to RBZ'
                  : st.k === 'boe'
                    ? 'On submission to ZIMRA'
                    : st.k === 'decl'
                      ? 'On submission for review'
                      : 'When the stage opens',
            },
            {
              h: 'Target (hours)',
              r: (st) => (
                <input
                  id={'sla-' + st.k}
                  className="in num"
                  type="number"
                  min="1"
                  style={{
                    width: '110px',
                  }}
                  value={slaH(db, st.k)}
                  onChange={(e) => ctx.setSla(st.k, e.target.value)}
                />
              ),
            },
          ]}
          rows={STAGES.map((st) => ({
            ...st,
            key: st.k,
          }))}
        />
      </div>,
    );
  if (page === 'docrules')
    return T(
      'Document rules',
      'What must exist before each step, and the tolerances that raise exceptions.',
      <div className="grid2">
        <Card title="Mandatory export documents" sub="All eight are required before export release.">
          <ul className="chk">
            {DOCS.map((d) => (
              <li key={d[0]}>
                <span className="ck">
                  <Icon n="check" c="sm" s="2.6" />
                </span>
                <div>
                  <b>{d[1]}</b>
                  <small>
                    {'Source: '}
                    {d[2]}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <div
          className="col"
          style={{
            gap: '20px',
          }}
        >
          <Card title="Tolerances">
            <KV
              cls="two"
              rows={[
                ['Quantity variance', `± ${QTY_TOL}% of declared`],
                ['Assay variance', 'Per assay template'],
                ['Invoice vs CD1 value', 'Must match exactly'],
                ['BOE quantity', 'Must equal verified quantity'],
              ]}
            />
          </Card>
          <Card title="Document branding" sub="Logo used in the header, login and on every generated document.">
            <div className="row">
              <Logo src={db.logo} size={48} />
              <label
                className="btn sec"
                style={{
                  cursor: 'pointer',
                }}
              >
                <Icon n="upload" c="sm" />
                Upload logo
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (!f) return;
                    if (!/^image\//.test(f.type) || f.size > 1.5e6) {
                      ctx.toast('Choose an image under 1.5 MB.', 'bad');
                      return;
                    }
                    const r = new FileReader();
                    r.onload = () => ctx.setLogo(r.result);
                    r.readAsDataURL(f);
                  }}
                />
              </label>
              {db.logo ? <Ghost onClick={() => ctx.setLogo(null)}>Use MMCZ logo</Ghost> : null}
            </div>
          </Card>
        </div>
      </div>,
    );
  return T(
    'Integrations',
    'External systems the platform exchanges data with.',
    <div className="grid2">
      {Object.entries(SYS).map(([k, [n]]) => {
        const up = db.integ[k] !== 'down';
        return (
          <IntegrationCard
            key={k}
            db={db}
            sys={k}
            status={up ? 'last sync 2 min ago' : 'unreachable'}
            rows={[
              [
                'Exchanges',
                {
                  erp: 'Invoice requests, invoice numbers, PDFs',
                  rbz: 'CD1 applications and decisions',
                  zimra: 'Bills of Entry, release, customs exit',
                  lims: 'Assay results by sample ID',
                }[k],
              ],
              ['Failures today', up ? '0' : '3'],
              [
                'Availability (30 days)',
                {
                  erp: '99.9%',
                  rbz: '99.6%',
                  zimra: '97.9%',
                  lims: '99.95%',
                }[k],
              ],
              ['Authoritative record', n],
            ]}
          >
            <SecondaryCTA sm={1} onClick={() => ctx.setInteg(k, up ? 'down' : 'up')}>
              {up ? 'Suspend connection' : 'Restore connection'}
            </SecondaryCTA>
          </IntegrationCard>
        );
      })}
      <Card
        title="Operating data"
        sub="Return every consignment, exception and message to the baseline operating scenarios."
      >
        <SecondaryCTA danger={1} icon="refresh" onClick={() => ctx.askReset()}>
          Restore baseline scenarios
        </SecondaryCTA>
      </Card>
    </div>,
  );
}
