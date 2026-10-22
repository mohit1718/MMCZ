import { useState, useEffect } from 'react';
import { MobileInspectionCard } from '../components/cards';
import { ConsignmentHeader } from '../components/ConsignmentHeader';
import { Icon } from '../components/Icon';
import { NotFound } from '../components/NotFound';
import {
  Banner,
  Card,
  EmptyState,
  KV,
  KpiCard,
  PageHeader,
  PrimaryCTA,
  SecondaryCTA,
  SuccessPanel,
} from '../components/primitives';
import { HP } from '../lib/constants';
import { N, dayAt, fmtDT, hash, nf, pad, usd } from '../lib/format';
import { M, P_, QTY_TOL, isDone, rateOf } from '../lib/lifecycle';
import { userOf } from '../lib/masterData';
import STAGES from '../data/stages.json';

/* ================= FIELD INSPECTOR ================= */
export function InspectorHome({ db, s, cons, ctx, kind }) {
  const me = userOf(s);
  const mine = cons.filter((c) => c.v.a_insp === me);
  const open = mine.filter((c) => !isDone(c) && STAGES[c.stage].k === 'insp').sort((a, b) => a.v.a_when - b.v.a_when);
  const today = open.filter((c) => c.v.a_when <= dayAt(1, 0));
  const upc = open.filter((c) => c.v.a_when > dayAt(1, 0));
  const done = mine.filter((c) => c.v.i_at).sort((a, b) => b.v.i_at - a.v.i_at);
  const L = kind === 'upcoming' ? upc : kind === 'completed' ? done : today;
  const prog = open.filter((c) => c.sub === 'inprogress');
  const fu = mine.filter(
    (c) => (c.v.q_open && !c.v.q_done) || (c.v.i_result && c.v.i_result !== 'Pass' && !isDone(c) && c.stage <= 3),
  );
  return (
    <div className="page narrow">
      <PageHeader
        eyebrow={kind ? '' : `Good day, ${me}`}
        title={
          kind === 'upcoming'
            ? 'Upcoming inspections'
            : kind === 'completed'
              ? 'Completed inspections'
              : 'My Inspections'
        }
        sub={kind ? '' : `${today.length} inspection${today.length === 1 ? '' : 's'} today · ${upc.length} upcoming`}
      />
      {kind ? null : (
        <div className="kpis">
          <KpiCard label="Today" value={today.length} tone="info" />
          <KpiCard
            label="Upcoming"
            value={upc.length}
            onClick={() =>
              ctx.go({
                page: 'upcoming',
              })
            }
          />
          <KpiCard label="In Progress" value={prog.length} tone={prog.length ? 'info' : ''} />
          <KpiCard
            label="Completed"
            value={done.length}
            tone="ok"
            onClick={() =>
              ctx.go({
                page: 'completed',
              })
            }
          />
          <KpiCard label="Follow-up Required" value={fu.length} tone={fu.length ? 'warn' : 'ok'} />
        </div>
      )}
      <div className="mi-list">
        {L.length ? (
          L.map((c) => (
            <MobileInspectionCard
              key={c.id}
              c={c}
              ctx={ctx}
              done={kind === 'completed'}
              cta={c.sub === 'inprogress' ? 'Continue Inspection' : 'Start Inspection'}
              onStart={(x) => {
                if (x.sub !== 'inprogress') ctx.act('startInsp', x.id, null, null, 1);
                ctx.go({
                  page: 'inspect',
                  id: x.id,
                });
              }}
            />
          ))
        ) : (
          <div className="card">
            <EmptyState
              tone={kind ? '' : 'ok'}
              icon={kind === 'completed' ? 'check2' : 'calendar'}
              title={
                kind === 'completed'
                  ? 'No completed inspections yet'
                  : kind === 'upcoming'
                    ? 'Nothing scheduled yet'
                    : 'No inspections left today'
              }
              text={kind ? '' : 'New assignments from the Inspectorate Coordinator appear here.'}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function InspectionFlow({ db, s, ctx, id }) {
  const c = db.cons[id];
  const flash = ctx.flashFor('inspect');
  useEffect(() => {
    if (c && c.sub === 'scheduled' && STAGES[c.stage].k === 'insp') ctx.act('startInsp', id, null, null, 1);
  }, []);
  const tickets = c ? Math.round(N(c.v.d_qty) / 24) : 0;
  const wb = c ? (c.id === HP ? 1248 : c.seq === 126 ? 3196.4 : N(c.v.d_qty)) : 0;
  const [st, setSt] = useState(0);
  const [f, setF] = useState({
    ok1: true,
    ok2: true,
    ok3: true,
    qty: '',
    method: 'Incremental grab (ISO 4552)',
    n: 2,
    photos: ['Stockpile overview', 'Weighbridge display', 'Lot tags 1–24', 'Sample bag S01 sealed'],
    remarks: '',
    result: 'Pass',
    seals: {},
  });
  const up = (k, v) =>
    setF((o) => ({
      ...o,
      [k]: v,
    }));
  if (flash)
    return [
      <ConsignmentHeader db={db} c={c} />,
      <div className="page narrow">
        <SuccessPanel
          {...flash}
          actions={
            <PrimaryCTA
              lg={1}
              onClick={() =>
                ctx.go({
                  page: 'home',
                })
              }
            >
              Back to my inspections
            </PrimaryCTA>
          }
        />
      </div>,
    ];
  if (!c) return <NotFound ctx={ctx} />;
  if (STAGES[c.stage] && STAGES[c.stage].k !== 'insp')
    return [
      <ConsignmentHeader db={db} c={c} />,
      <div className="page narrow">
        <Banner
          title="This inspection is complete"
          text={c.v.i_at ? `Submitted ${fmtDT(c.v.i_at)} by ${c.v.i_by}.` : 'Not ready for inspection yet.'}
          actions={
            <SecondaryCTA
              onClick={() =>
                ctx.go({
                  page: 'home',
                })
              }
            >
              My inspections
            </SecondaryCTA>
          }
        />
      </div>,
    ];
  const q = N(f.qty);
  const diff = q - N(c.v.d_qty);
  const pct = q ? (diff / N(c.v.d_qty)) * 100 : 0;
  const out = q && Math.abs(pct) > QTY_TOL;
  const steps = ['Verify Consignment', 'Quantity Verification', 'Sampling', 'Evidence', 'Submit Inspection'];
  const okStep = [f.ok1 && f.ok2, q > 0, f.n > 0, f.photos.length >= 2, true];
  const sid = (i) => `${c.id}-S${pad(i, 2)}`;
  const seal = (i) => f.seals[i] || `SL-${(hash(c.id + i) % 90000) + 10000}`;
  const submit = () => {
    const bad = okStep.findIndex((x) => !x);
    if (bad >= 0 && bad < 4) {
      setSt(bad);
      ctx.toast(
        bad === 1
          ? 'Enter the verified quantity.'
          : bad === 0
            ? 'Confirm the consignment ID and licence.'
            : 'Add at least two photos.',
        'bad',
      );
      return;
    }
    ctx.act(
      'inspect',
      c.id,
      {
        qty: q,
        method: f.method,
        n: f.n,
        photos: f.photos.length,
        result: f.result,
        remarks: f.remarks,
        tickets: `${tickets} weighbridge tickets`,
      },
      'inspect',
    );
  };
  const body = [
    <Card title="Verify consignment" sub="Check the paperwork and tags on site before you start.">
      <KV
        rows={[
          ['Consignment ID', <span className="mono">{c.id}</span>],
          ['Producer', P_(c).name],
          ['Mine / site', P_(c).mine],
          ['Mineral', M(c).name],
          ['Declared quantity', nf(c.v.d_qty) + ' MT'],
          ['Export licence', P_(c).lic],
        ]}
      />
      <div
        className="col"
        style={{
          marginTop: '18px',
        }}
      >
        {[
          ['ok1', 'Consignment ID matches stockpile tags'],
          ['ok2', 'Export licence sighted and valid'],
          ['ok3', 'Producer representative present'],
        ].map(([k, l]) => (
          <button
            key={k}
            type="button"
            className={'opt' + (f[k] ? ' on ok' : '')}
            style={{
              textAlign: 'left',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
            }}
            onClick={() => up(k, !f[k])}
          >
            <Icon n={f[k] ? 'check' : 'x'} />
            {l}
          </button>
        ))}
      </div>
      {c.v.q_open ? (
        <div
          style={{
            marginTop: '14px',
          }}
        >
          <Banner
            tone={c.v.q_done ? 'ok' : 'warn'}
            title={c.v.q_done ? 'Producer answered your query' : 'Open query to producer'}
            text={c.v.q_done ? c.v.q_done.text : c.v.q_open.text}
          />
        </div>
      ) : null}
    </Card>,
    <Card title="Quantity verification" sub={`${tickets} weighbridge tickets on site`}>
      <div
        className="row"
        style={{
          marginBottom: '14px',
        }}
      >
        <div
          className="upl done"
          style={{
            flex: 1,
          }}
        >
          <span className="fi">
            <Icon n="scale" />
          </span>
          <div>
            <b>
              {'Weighbridge total: '}
              {nf(wb, 1)}
              {' MT'}
            </b>
            <small>
              {tickets}
              {' tickets read from the site weighbridge'}
            </small>
          </div>
          <SecondaryCTA onClick={() => up('qty', String(wb))}>Use weighbridge total</SecondaryCTA>
        </div>
      </div>
      <label className="fld">
        <span className="lbl">Verified quantity (MT)</span>
        <input
          id="iq"
          className="in num"
          inputMode="decimal"
          type="number"
          step="0.1"
          value={f.qty}
          onChange={(e) => up('qty', e.target.value)}
          placeholder="Enter verified MT"
          style={{
            fontSize: '22px',
            fontWeight: 700,
          }}
        />
      </label>
      <div
        className="qcmp"
        style={{
          marginTop: '16px',
        }}
      >
        <div>
          <small>Declared</small>
          <b>
            {nf(c.v.d_qty)}
            {' MT'}
          </b>
        </div>
        <div>
          <small>Verified</small>
          <b>
            {q ? nf(q, 1) : '—'} {q ? 'MT' : ''}
          </b>
        </div>
        <div className={'var ' + (q ? (out ? 'bad' : 'ok') : '')}>
          <small>Variance</small>
          <b>{q ? `${diff > 0 ? '+' : ''}${nf(diff, 1)} MT / ${pct > 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'}</b>
        </div>
      </div>
      {q
        ? [
            <div
              className="qbar"
              style={{
                marginTop: '14px',
              }}
              title="Verified against declared"
            >
              <i
                style={{
                  width: Math.min(100, (q / N(c.v.d_qty)) * 100 * 0.9) + '%',
                  background: out ? 'var(--bad)' : 'var(--ok)',
                }}
              />
              <em
                style={{
                  left: '90%',
                }}
              />
            </div>,
            <small className="muted">
              Bar shows verified quantity; marker is the declared quantity. Tolerance ±{QTY_TOL}%.
            </small>,
          ]
        : null}
      {out ? (
        <div
          style={{
            marginTop: '14px',
          }}
        >
          <Banner
            tone="bad"
            title={`Variance outside ±${QTY_TOL}% tolerance`}
            text={`Potential value difference ${usd(Math.abs(diff) * rateOf(c))}. A revenue-assurance exception is raised when you submit, and the Inspectorate Coordinator reviews it. Record the reason under Evidence.`}
          />
        </div>
      ) : q ? (
        <div
          style={{
            marginTop: '14px',
          }}
        >
          <Banner
            tone="ok"
            title="Within tolerance"
            text="The verified quantity will be used for invoicing, CD1 and the Bill of Entry."
          />
        </div>
      ) : null}
    </Card>,
    <Card title="Sampling">
      <div
        className="col"
        style={{
          gap: '18px',
        }}
      >
        <div className="fld">
          <span className="lbl">Sampling method</span>
          <div className="opts">
            {['Incremental grab (ISO 4552)', 'Auger / spear', 'Composite by lot'].map((o) => (
              <button
                key={o}
                type="button"
                className={'opt' + (f.method === o ? ' on' : '')}
                onClick={() => up('method', o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
        <div className="fld">
          <span className="lbl">Number of samples</span>
          <div className="stepper">
            <button type="button" aria-label="Fewer" onClick={() => up('n', Math.max(1, f.n - 1))}>
              −
            </button>
            <b>{f.n}</b>
            <button type="button" aria-label="More" onClick={() => up('n', Math.min(6, f.n + 1))}>
              +
            </button>
          </div>
        </div>
        <div className="tw">
          <table className="dt">
            <thead>
              <tr>
                <th>Sample ID</th>
                <th>Seal number</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(
                {
                  length: f.n,
                },
                (_, i) => i + 1,
              ).map((i) => (
                <tr key={i}>
                  <td className="mono">{sid(i)}</td>
                  <td>
                    <input
                      id={'seal' + i}
                      className="in mono"
                      value={seal(i)}
                      onChange={(e) =>
                        up('seals', {
                          ...f.seals,
                          [i]: e.target.value,
                        })
                      }
                      style={{
                        maxWidth: '180px',
                      }}
                    />
                  </td>
                  <td>{c.code === 'LI' ? '2 kg' : '5 kg'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <span className="help">
          Sample IDs are generated from the consignment ID. Seal numbers come from the pre-printed seal book.
        </span>
      </div>
    </Card>,
    <Card title="Evidence">
      <div
        className="col"
        style={{
          gap: '18px',
        }}
      >
        <div className="fld">
          <span className="lbl">Photos ({f.photos.length})</span>
          <div className="photos">
            {f.photos.map((p, i) => (
              <div key={i} className="photo">
                <span>{p}</span>
              </div>
            ))}
            <label className="photo add">
              <div>
                <Icon n="camera" />
                Add photo
              </div>
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const x = e.target.files[0];
                  if (x) up('photos', [...f.photos, x.name.replace(/\.[a-z]+$/i, '')]);
                }}
              />
            </label>
          </div>
        </div>
        <div className="grid2">
          <div className="upl done">
            <span className="fi">
              <Icon n="pin" />
            </span>
            <div>
              <b>GPS location captured</b>
              <small>
                {P_(c).gps}
                {' · '}
                {P_(c).mine}
              </small>
            </div>
          </div>
          <div className="upl done">
            <span className="fi">
              <Icon n="file" />
            </span>
            <div>
              <b>Weighbridge tickets</b>
              <small>
                {tickets}
                {' tickets attached'}
              </small>
            </div>
          </div>
        </div>
        <label className="fld">
          <span className="lbl">Remarks</span>
          <textarea
            id="irem"
            className="in"
            value={f.remarks}
            onChange={(e) => up('remarks', e.target.value)}
            placeholder={out ? 'Explain the quantity variance (required for the exception record)' : 'Optional'}
          />
        </label>
      </div>
    </Card>,
    <Card title="Inspection result">
      <div className="opts">
        {[
          ['Pass', 'ok'],
          ['Conditional', 'warn'],
          ['Re-inspection Required', 'bad'],
          ['Hold / Exception', 'bad'],
        ].map(([o, t]) => (
          <button
            key={o}
            type="button"
            className={'opt' + (f.result === o ? ' on ' + t : '')}
            onClick={() => up('result', o)}
          >
            {o}
          </button>
        ))}
      </div>
      <div
        style={{
          marginTop: '18px',
        }}
      >
        <KV
          rows={[
            ['Verified quantity', q ? nf(q, 1) + ' MT' : '—'],
            ['Variance', q ? `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'],
            ['Samples', `${f.n} · ${f.method}`],
            ['Photos', f.photos.length],
            ['Location', P_(c).gps],
          ]}
        />
      </div>
      {out && f.result === 'Pass' ? (
        <div
          style={{
            marginTop: '14px',
          }}
        >
          <Banner
            tone="warn"
            title="Consider Conditional"
            text="The quantity variance is outside tolerance. A Conditional result tells the laboratory and finance to use the verified quantity."
          />
        </div>
      ) : null}
    </Card>,
  ];
  return [
    <ConsignmentHeader db={db} c={c} />,
    <div className="page narrow touch">
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
            My Inspections
          </button>,
          ' / ',
          P_(c).mine,
        ]}
        title="Field inspection"
      />
      <div className="flow-h" role="tablist">
        {steps.map((t, i) => (
          <button
            key={i}
            type="button"
            className={(st === i ? 'on ' : '') + (okStep[i] && i < st ? 'ok' : '')}
            onClick={() => setSt(i)}
          >
            <span>{okStep[i] && i < st ? <Icon n="check" c="sm" s="3" /> : i + 1}</span>
            <b>{t}</b>
          </button>
        ))}
      </div>
      {body[st]}
      <div
        className="row"
        style={{
          justifyContent: 'space-between',
          position: 'sticky',
          bottom: '0',
          background: 'var(--bg)',
          padding: '12px 0 calc(12px + env(safe-area-inset-bottom,0px))',
        }}
      >
        {st > 0 ? (
          <SecondaryCTA lg={1} icon="left" onClick={() => setSt(st - 1)}>
            Back
          </SecondaryCTA>
        ) : (
          <SecondaryCTA
            lg={1}
            onClick={() => {
              ctx.toast('Draft saved on this device and synced to MMCZ.', 'ok');
            }}
          >
            Save Draft
          </SecondaryCTA>
        )}
        {st < 4 ? (
          <PrimaryCTA lg={1} onClick={() => setSt(st + 1)}>
            {'Next: '}
            {steps[st + 1]}
          </PrimaryCTA>
        ) : (
          <PrimaryCTA lg={1} icon="send" onClick={submit}>
            Submit Inspection
          </PrimaryCTA>
        )}
      </div>
    </div>,
  ];
}
