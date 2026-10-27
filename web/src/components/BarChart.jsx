import { useState } from 'react';

/**
 * Single-series daily bar chart (SVG). One measure per chart — never dual axis.
 * Hover any column for a tooltip; "Table" toggles an accessible table view.
 */
export default function BarChart({ data, valueKey, label, color = 'var(--color-accent-600)', format = (v) => v, height = 180 }) {
  const [hover, setHover] = useState(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  const W = 600;
  const pad = { l: 44, r: 8, t: 8, b: 22 };
  const iw = W - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const step = iw / data.length;
  const bw = Math.max(2, step - 2); // 2px surface gap between bars
  const ticks = [...new Set([0, 0.5, 1].map((f) => Math.round(max * f)))];
  const total = data.reduce((s, d) => s + d[valueKey], 0);

  return (
    <figure className="card p-5">
      <figcaption className="mb-3 flex items-baseline justify-between gap-3">
        <span className="font-semibold">{label}</span>
        <span className="flex items-center gap-3 text-sm text-slate-500">
          Total {format(total)}
          <button type="button" className="text-xs font-medium text-accent-600 hover:underline" onClick={() => setTable((t) => !t)}>
            {table ? 'Chart' : 'Table'}
          </button>
        </span>
      </figcaption>
      {table ? (
        <div className="max-h-64 overflow-y-auto text-sm">
          <table className="w-full">
            <thead className="text-left text-xs text-slate-500"><tr><th className="py-1">Date</th><th className="text-right">{label}</th></tr></thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date} className="border-t border-slate-100 dark:border-slate-800"><td className="py-1">{d.date}</td><td className="text-right tabular-nums">{format(d[valueKey])}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label={`${label}, last ${data.length} days`}>
            {ticks.map((tk) => {
              const y = pad.t + ih - (tk / max) * ih;
              return (
                <g key={tk}>
                  <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" />
                  <text x={pad.l - 6} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px]">{format(tk)}</text>
                </g>
              );
            })}
            {data.map((d, i) => {
              const h = (d[valueKey] / max) * ih;
              const x = pad.l + i * step + 1;
              const y = pad.t + ih - h;
              const r = Math.min(4, bw / 2, h);
              return (
                <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  {/* hit target is the full column, larger than the mark */}
                  <rect x={pad.l + i * step} y={pad.t} width={step} height={ih} fill="transparent" />
                  {h > 0 && (
                    <path
                      d={`M${x},${pad.t + ih} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${pad.t + ih} Z`}
                      fill={color}
                      opacity={hover == null || hover === i ? 1 : 0.45}
                    />
                  )}
                </g>
              );
            })}
            {[...new Set([0, Math.floor(data.length / 2), data.length - 1])].map((i) => (
              <text key={i} x={pad.l + i * step + step / 2} y={height - 6} textAnchor="middle" className="fill-slate-400 text-[10px]">
                {data[i]?.date.slice(5)}
              </text>
            ))}
          </svg>
          {hover != null && (
            <div
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
              style={{ left: `${((pad.l + hover * step + step / 2) / W) * 100}%` }}
            >
              <p className="text-slate-300">{data[hover].date}</p>
              <p className="font-semibold">{format(data[hover][valueKey])}</p>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
