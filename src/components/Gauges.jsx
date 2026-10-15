import { fmt } from '../supabase'

// Brand mark: a water tank with its fill line.
export function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo">
      <rect width="32" height="32" rx="8" fill="var(--water)" />
      <path d="M9 9.5c0-1.4 3.1-2.5 7-2.5s7 1.1 7 2.5v13c0 1.4-3.1 2.5-7 2.5s-7-1.1-7-2.5z" fill="none" stroke="var(--ink)" strokeWidth="2.2" />
      <path d="M9 16.5c2.4 1.3 4.6-1 7 0s4.6 1.3 7 0v6c0 1.4-3.1 2.5-7 2.5s-7-1.1-7-2.5z" fill="var(--ink)" />
    </svg>
  )
}

// Days-left → level class used by every tank readout
export const levelOf = (days) => (days == null ? '' : days < 1 ? 'dry' : days <= 3 ? 'low' : days <= 6 ? 'mid' : 'ok')

// Small upright tank for lists: how full, colored by days left.
export function TankMini({ pct, days, label }) {
  const p = Math.max(3, Math.min(100, Math.round(pct || 0)))
  return (
    <span className={`tankmini ${levelOf(days)}`} role="img" aria-label={label || `Tank about ${p}% full`}>
      <span className="tankmini-fill" style={{ height: `${p}%` }} />
    </span>
  )
}

// The truck's water as a horizontal tank, split into the upcoming stops it will cover.
// Stops past the water line are drawn as a shortfall so the driver sees exactly where to refill.
export function LoadPlan({ level, capacity, stops }) {
  const need = stops.reduce((s, x) => s + x.gal, 0)
  const scale = Math.max(capacity, need, 1)
  const pct = (n) => `${(n / scale) * 100}%`
  let cum = 0
  const segs = stops.map((s) => {
    const seg = { ...s, start: cum, end: cum + s.gal, short: cum + s.gal > level }
    cum += s.gal
    return seg
  })
  return (
    <div className="loadplan">
      <div className="lp-track" aria-hidden="true">
        {scale > capacity && <span className="lp-over" style={{ left: pct(capacity) }} />}
        <span className="lp-water" style={{ width: pct(Math.min(level, scale)) }} />
        {segs.map((s) => (
          <span key={s.id} className={`lp-seg ${s.short ? 'short' : ''}`}
            style={{ left: pct(s.start), width: pct(s.gal) }}>
            {s.short && s.start < level && <span className="lp-cut" style={{ left: `${((level - s.start) / s.gal) * 100}%` }} />}
          </span>
        ))}
      </div>
      <div className="lp-labels" aria-hidden="true">
        {segs.map((s) => (
          <span key={s.id} className={s.short ? 'short' : ''} style={{ left: pct(s.start), width: pct(s.gal) }}>{s.pos}</span>
        ))}
      </div>
      <p className="sr-only">
        {fmt(level)} of {fmt(capacity)} gallons on board. Upcoming stops need {fmt(need)} gallons.
      </p>
    </div>
  )
}
