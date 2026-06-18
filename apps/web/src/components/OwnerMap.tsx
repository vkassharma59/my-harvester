import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { OwnerStateDistribution } from '@wh/shared';
import { getOwnerDistribution } from '../lib/api';
import { INDIA_MAP } from '../data/india-states-paths';
import { Card, CardHeader, Spinner } from './ui';

// Our distribution uses current names; the geometry is older — map the few that differ.
const GEO_ALIAS: Record<string, string> = {
  Odisha: 'Orissa',
  Uttarakhand: 'Uttaranchal',
  'Andaman and Nicobar Islands': 'Andaman and Nicobar',
};
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
const GEO_NAMES = new Set(INDIA_MAP.states.map((s) => norm(s.state)));

// Choropleth ramp: light → deep green, by owner count.
const LO = [220, 237, 221];
const HI = [27, 94, 32];

export function OwnerMap() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['owner-distribution'],
    queryFn: getOwnerDistribution,
  });
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ s: OwnerStateDistribution; x: number; y: number } | null>(null);

  // Owner data keyed by the geometry's normalised state name.
  const byGeo = useMemo(() => {
    const m = new Map<string, OwnerStateDistribution>();
    for (const s of data?.states ?? []) m.set(norm(GEO_ALIAS[s.state] ?? s.state), s);
    return m;
  }, [data]);

  const max = useMemo(() => Math.max(1, ...(data?.states ?? []).map((s) => s.count)), [data]);

  // States that have owners but no matching geometry (e.g. Telangana on old maps).
  const offMap = useMemo(
    () => (data?.states ?? []).filter((s) => !GEO_NAMES.has(norm(GEO_ALIAS[s.state] ?? s.state))),
    [data],
  );

  const fill = (count: number) => {
    if (!count) return '#EEF2F0';
    const t = Math.sqrt(count / max);
    const c = LO.map((lo, i) => Math.round(lo + (HI[i] - lo) * t));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  };

  const onMove = (s: OwnerStateDistribution, e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ s, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <Card>
      <CardHeader
        title="Owners by region"
        subtitle={
          data ? `${data.total} owner${data.total === 1 ? '' : 's'} with a recorded location` : undefined
        }
      />
      {isLoading && <Spinner />}
      {error && <p className="px-5 py-6 text-sm text-red-600">Failed to load owner distribution.</p>}
      {data && (
        <div className="grid gap-4 p-4 lg:grid-cols-3">
          {/* Map */}
          <div ref={wrapRef} className="relative lg:col-span-2">
            <svg
              viewBox={`0 0 ${INDIA_MAP.width} ${INDIA_MAP.height}`}
              className="h-auto w-full"
              style={{ maxHeight: 480 }}
              onMouseLeave={() => setHover(null)}
              role="img"
              aria-label="India map shaded by owner count"
            >
              {INDIA_MAP.states.map((g) => {
                const s = byGeo.get(norm(g.state));
                const active = hover?.s === s && !!s;
                return (
                  <path
                    key={g.state}
                    d={g.d}
                    fill={fill(s?.count ?? 0)}
                    stroke={active ? '#0D3B11' : '#FFFFFF'}
                    strokeWidth={active ? 1.5 : 0.6}
                    style={{ cursor: s ? 'pointer' : 'default' }}
                    onMouseMove={(e) => (s ? onMove(s, e) : undefined)}
                    onMouseEnter={(e) => (s ? onMove(s, e) : setHover(null))}
                  />
                );
              })}
            </svg>

            {hover && (
              <div
                className="pointer-events-none absolute z-10 w-52 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
                style={{
                  left: Math.min(hover.x + 14, (wrapRef.current?.clientWidth ?? 0) - 220),
                  top: hover.y + 14,
                }}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-slate-800">{hover.s.state}</span>
                  <span className="text-sm font-semibold text-brand-700">{hover.s.count}</span>
                </div>
                <div className="mt-1.5 space-y-1">
                  {hover.s.districts.slice(0, 6).map((d) => (
                    <div key={d.district} className="flex justify-between text-xs text-slate-600">
                      <span className="truncate pr-2">{d.district}</span>
                      <span className="tabular-nums text-slate-500">{d.count}</span>
                    </div>
                  ))}
                  {hover.s.districts.length > 6 && (
                    <div className="text-xs text-slate-400">
                      +{hover.s.districts.length - 6} more district(s)
                    </div>
                  )}
                  {hover.s.districts.length === 0 && (
                    <div className="text-xs text-slate-400">No district recorded</div>
                  )}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span>Fewer</span>
              <span className="h-2 w-6 rounded-sm" style={{ background: fill(Math.ceil(max * 0.15)) }} />
              <span className="h-2 w-6 rounded-sm" style={{ background: fill(Math.ceil(max * 0.5)) }} />
              <span className="h-2 w-6 rounded-sm" style={{ background: fill(max) }} />
              <span>More owners</span>
            </div>
          </div>

          {/* Ranked states */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Top states</h4>
            {data.states.length === 0 ? (
              <p className="text-sm text-slate-500">No owner locations recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {data.states.slice(0, 8).map((s) => (
                  <div key={s.state}>
                    <div className="flex justify-between text-sm">
                      <span className="truncate pr-2 text-slate-700">{s.state}</span>
                      <span className="font-medium tabular-nums text-slate-800">{s.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: `${Math.max(4, (s.count / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {offMap.length > 0 && (
              <p className="mt-3 text-xs text-slate-400">
                Not shown on map: {offMap.map((s) => `${s.state} (${s.count})`).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
