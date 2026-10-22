import { useState, useRef } from 'react';
import { nf } from '../lib/format';

/* ---------- charts ---------- */
export function useTip() {
  const [tip, setTip] = useState(null);
  const ref = useRef(null);
  const show = (e, lines) => {
    const r = ref.current.getBoundingClientRect();
    setTip({
      x: Math.min(e.clientX - r.left + 12, r.width - 170),
      y: e.clientY - r.top + 12,
      lines,
    });
  };
  return [ref, tip, show, () => setTip(null)];
}

export function Tip({ tip }) {
  return tip ? (
    <div
      className="vtip"
      style={{
        left: tip.x + 'px',
        top: tip.y + 'px',
      }}
    >
      {tip.lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  ) : null;
}

export const niceMax = (v) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
};

export function HBars({ data, fmt = nf, onClick, max }) {
  const [ref, tip, show, hide] = useTip();
  const mx = max || Math.max(...data.map((d) => d.v), 1);
  return (
    <div className="vwrap" ref={ref}>
      <div className="hb">
        {data.map((d) => {
          const T = onClick ? 'button' : 'div';
          return (
            <T
              key={d.l}
              className="hb-r"
              onClick={onClick ? () => onClick(d) : null}
              onMouseMove={(e) => show(e, [d.l, fmt(d.v), ...(d.tip ? [d.tip] : [])])}
              onMouseLeave={hide}
            >
              <span className="hb-l">{d.l}</span>
              <span className="hb-t">
                <i
                  style={{
                    width: Math.max(d.v ? 2 : 0, (d.v / mx) * 100) + '%',
                    background: d.c || 'var(--s1)',
                  }}
                />
              </span>
              <span className="hb-v">{fmt(d.v)}</span>
            </T>
          );
        })}
      </div>
      <Tip tip={tip} />
    </div>
  );
}

export function Columns({ x, values, fmt = nf, color, highlightLast, avg }) {
  const [ref, tip, show, hide] = useTip();
  const W = 600,
    Hh = 230,
    L = 52,
    Rr = 10,
    T = 18,
    B = 28;
  const ymax = niceMax(Math.max(...values) * 1.1);
  const y = (v) => T + (Hh - T - B) * (1 - v / ymax);
  const bw = (W - L - Rr) / x.length;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * ymax);
  const bar = (gx, v) => {
    const w = bw * 0.62,
      x0 = gx + (bw - w) / 2,
      y0 = y(0),
      y1 = y(v),
      r = Math.min(4, (y0 - y1) / 2);
    return `M${x0} ${y0}V${y1 + r}Q${x0} ${y1} ${x0 + r} ${y1}H${x0 + w - r}Q${x0 + w} ${y1} ${x0 + w} ${y1 + r}V${y0}Z`;
  };
  return (
    <div className="vwrap" ref={ref}>
      {avg ? (
        <div className="legend">
          <span>
            <i
              style={{
                background: color || 'var(--s1)',
              }}
            />
            Monthly value
          </span>
          <span>
            <i
              className="ln"
              style={{
                background: 'var(--s2)',
              }}
            />
            3-month average
          </span>
        </div>
      ) : null}
      <svg viewBox={`0 0 ${W} ${Hh}`} className="svgc" role="img" aria-label="Column chart">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={L} x2={W - Rr} y1={y(t)} y2={y(t)} className={i ? 'g' : 'b'} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" className="ax">
              {fmt(t)}
            </text>
          </g>
        ))}
        {x.map((lab, i) => {
          const gx = L + bw * i,
            last = i === x.length - 1;
          return (
            <g key={i}>
              <path d={bar(gx, values[i])} fill={color || 'var(--s1)'} opacity={highlightLast && !last ? 0.55 : 1} />
              <text x={gx + bw / 2} y={Hh - 9} textAnchor="middle" className="ax">
                {lab}
              </text>
              {highlightLast && last ? (
                <text x={gx + bw / 2} y={y(values[i]) - 7} textAnchor="middle" className="vl">
                  {fmt(values[i])}
                </text>
              ) : null}
              <rect
                x={gx}
                y={T}
                width={bw}
                height={Hh - T - B}
                fill="transparent"
                onMouseMove={(e) => show(e, [lab, fmt(values[i]), ...(avg ? ['3-month average: ' + fmt(avg[i])] : [])])}
                onMouseLeave={hide}
              />
            </g>
          );
        })}
        {avg ? (
          <g pointerEvents="none">
            <path
              d={avg.map((v, i) => `${i ? 'L' : 'M'}${L + bw * i + bw / 2} ${y(v)}`).join('')}
              fill="none"
              stroke="var(--s2)"
              strokeWidth="2"
            />
            {avg.map((v, i) => (
              <circle
                key={i}
                cx={L + bw * i + bw / 2}
                cy={y(v)}
                r="3.5"
                fill="var(--s2)"
                stroke="var(--surface)"
                strokeWidth="2"
              />
            ))}
          </g>
        ) : null}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

export function Bullets({ rows }) {
  return (
    <div className="bl">
      {rows.map((r) => {
        const mx = Math.max(r.target * 1.5, r.actual * 1.1);
        const over = r.actual > r.target;
        return (
          <div key={r.l} className="bl-r" title={`${r.l}: average ${r.actual} h against ${r.target} h SLA`}>
            <span className="hb-l">{r.l}</span>
            <span className="bl-t">
              <i
                className={over ? 'over' : ''}
                style={{
                  width: (r.actual / mx) * 100 + '%',
                }}
              />
              <em
                style={{
                  left: (r.target / mx) * 100 + '%',
                }}
              />
            </span>
            <span className="bl-v">
              <b
                className={over ? '' : ''}
                style={{
                  color: over ? 'var(--bad)' : 'var(--ink)',
                }}
              >
                {r.actual}
                {' h'}
              </b>
              <small>
                {'SLA '}
                {r.target}
                {' h'}
              </small>
            </span>
          </div>
        );
      })}
      <div
        className="legend"
        style={{
          marginTop: '4px',
        }}
      >
        <span>
          <i
            style={{
              background: 'var(--seq4)',
            }}
          />
          Average time in stage
        </span>
        <span>
          <i
            style={{
              background: 'var(--bad)',
            }}
          />
          Above SLA
        </span>
        <span>
          <i
            className="ln"
            style={{
              background: 'var(--ink)',
              width: '2px',
              height: '12px',
            }}
          />
          SLA target
        </span>
      </div>
    </div>
  );
}
