import { useCallback, useEffect, useState } from 'react'
import { supabase, todayLocal, fmt, useLive } from '../supabase'

const one = (x) => (Array.isArray(x) ? x[0] : x) || null
const DEMO_COMPANY = '00000000-0000-0000-0000-00000000d001'

export default function RouteScreen({ profile, go }) {
  const [route, setRoute] = useState(null)
  const [onTruck, setOnTruck] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const today = todayLocal()
  const isManager = profile.role === 'owner' || profile.role === 'dispatcher'
  const isDemo = profile.company_id === DEMO_COMPANY

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    const { data, error } = await supabase
      .from('routes')
      .select(`id, status, route_date, driver_id,
        truck:trucks(id, name, capacity_gal),
        route_stops(id, seq, removed, order:orders(id, status, requested_gallons, is_urgent,
          customer:customers(full_name, phone),
          property:properties(address, gate_code, access_notes, dogs_on_property, hose_length_ft, road_condition),
          delivery:deliveries(gallons_delivered, delivered_at)))`)
      .eq('route_date', today)
      .or(`driver_id.eq.${profile.id},driver_id.is.null`)
      .order('created_at')
      .limit(1)
      .maybeSingle()
    if (error) { setErr(error.message); setLoading(false); return }
    if (data) {
      data.route_stops = data.route_stops
        .filter((s) => !s.removed)
        .sort((a, b) => a.seq - b.seq)
        .map((s, i) => ({ ...s, pos: i + 1 }))
    }
    setRoute(data)

    if (data?.truck) {
      // Water on board = today's fills − today's deliveries for this truck
      const start = new Date(`${today}T00:00:00-07:00`).toISOString()
      const [fills, dels] = await Promise.all([
        supabase.from('fill_logs').select('gallons_loaded').eq('truck_id', data.truck.id).gte('loaded_at', start),
        supabase.from('deliveries').select('gallons_delivered').eq('truck_id', data.truck.id).gte('delivered_at', start),
      ])
      const loaded = (fills.data || []).reduce((s, r) => s + r.gallons_loaded, 0)
      const out = (dels.data || []).reduce((s, r) => s + r.gallons_delivered, 0)
      setOnTruck({ loaded, level: Math.max(0, loaded - out) })
    }
    setLoading(false)
  }, [profile.id, today])

  useEffect(() => { load() }, [load])
  useLive('route', ['orders', 'route_stops', 'routes', 'deliveries'], load)

  // Starting a stop tells the customer their water is on the way
  async function startStop(stop) {
    if (stop.order.status === 'scheduled') {
      await supabase.rpc('start_stop', { p_order_id: stop.order.id })
      stop = { ...stop, order: { ...stop.order, status: 'en_route' } }
    }
    go('stop', { stop, truck })
  }

  async function loadDemo() {
    setLoading(true)
    const { error } = await supabase.rpc('demo_load_today')
    if (error) { setErr(error.message); setLoading(false); return }
    load()
  }

  const stops = route?.route_stops || []
  const done = stops.filter((s) => s.order.status === 'delivered').length
  const next = stops.find((s) => s.order.status !== 'delivered')
  const truck = route?.truck
  const dateLabel = new Date(`${today}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  // Running total: which upcoming stops the current load covers
  let remaining = onTruck?.level ?? 0
  const coverage = {}
  for (const s of stops) {
    if (s.order.status === 'delivered') continue
    remaining -= s.order.requested_gallons
    coverage[s.id] = remaining >= 0
  }
  const firstShort = stops.find((s) => coverage[s.id] === false)

  return (
    <div className="screen">
      <header className="top">
        <div className="row between">
          <div>
            <span className="eyebrow">{dateLabel}{truck ? ` · ${truck.name}` : ''}</span>
            <h1>Today's route</h1>
          </div>
          <div className="row">
            {route && <span className="pill blue">{done} of {stops.length} done</span>}
            {isManager && (
              <button className="icon ring" aria-label="Company setup and team" onClick={() => go('company')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
              </button>
            )}
          </div>
        </div>

        {truck && onTruck && (
          <div className="panel">
            <div className="row between small">
              <span className="muted strong">Water on truck</span>
              <span className="strong">{fmt(onTruck.level)} / {fmt(truck.capacity_gal)} gal</span>
            </div>
            <div className="bar" aria-hidden="true">
              <div style={{ width: `${Math.min(100, (onTruck.level / truck.capacity_gal) * 100)}%` }} />
            </div>
            <span className="muted small">
              {onTruck.loaded === 0
                ? 'Log your first fill so the app can track water on board.'
                : firstShort
                  ? `Refill before stop ${firstShort.pos}.`
                  : 'Enough water for the rest of today.'}
            </span>
          </div>
        )}
      </header>

      <main className="list">
        {loading && <p className="muted pad">Loading route…</p>}
        {err && <p className="note pad">{err}</p>}

        {!loading && !route && isDemo && (
          <div className="empty">
            <p className="strong">No route for today yet.</p>
            <p className="muted small">This is the demo company. Load a sample day to try the driver flow.</p>
            <button className="btn primary" onClick={loadDemo}>Load demo route</button>
          </div>
        )}
        {!loading && !route && !isDemo && (
          <div className="empty">
            <p className="strong">No route for today yet.</p>
            {isManager ? (
              <>
                <p className="muted small">Finish setting up your company: add a truck, a fill station, and invite your drivers. Building routes comes with the dispatch board.</p>
                <button className="btn primary" onClick={() => go('company')}>Company setup</button>
              </>
            ) : (
              <p className="muted small">When your dispatcher assigns you a route, it shows up here.</p>
            )}
          </div>
        )}

        {stops.map((s) => {
          const o = s.order
          const isDone = o.status === 'delivered'
          const isNext = next && s.id === next.id
          const p = o.property || {}
          const d = one(o.delivery)
          if (isDone) {
            return (
              <div key={s.id} className="stop done">
                <span className="num ok">✓</span>
                <div className="grow">
                  <span className="strong strike">{o.customer.full_name}</span>
                  <span className="muted small">
                    {fmt(d?.gallons_delivered)} gal delivered
                    {d && ` · ${new Date(d.delivered_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                  </span>
                </div>
              </div>
            )
          }
          return (
            <button key={s.id} className={`stop ${isNext ? 'next' : ''} ${o.is_urgent ? 'urgent' : ''}`}
              onClick={() => go('stop', { stop: s, truck })}>
              <span className="num">{s.pos}</span>
              <div className="grow">
                <span className="strong">{o.customer.full_name}</span>
                <span className="small sub">{o.is_urgent ? 'Urgent · out of water' : p.address}</span>
                {isNext && (
                  <span className="tags">
                    {o.status === 'en_route' && <span className="tag blue">On the way</span>}
                    {p.dogs_on_property && <span className="tag warn">Dogs</span>}
                    {p.gate_code && <span className="tag">Gate code</span>}
                    {p.hose_length_ft && <span className="tag">{p.hose_length_ft} ft hose</span>}
                    {p.road_condition && <span className="tag">{p.road_condition}</span>}
                  </span>
                )}
              </div>
              <span className="gal">{fmt(o.requested_gallons)}</span>
            </button>
          )
        })}
      </main>

      {truck && (
        <footer className="actions two">
          <button className="btn outline" onClick={() => go('fill', { truck })}>Log a fill</button>
          {next
            ? <button className="btn primary" onClick={() => startStop(next)}>
                {next.order.status === 'en_route' ? `Continue stop ${next.pos}` : `Start stop ${next.pos}`}
              </button>
            : <button className="btn primary" disabled>Route complete</button>}
        </footer>
      )}
      <button className="btn link signout" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  )
}
