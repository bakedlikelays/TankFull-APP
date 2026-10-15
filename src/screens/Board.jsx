import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, todayLocal, fmt, useLive } from '../supabase'
import NewOrderForm from '../components/NewOrderForm'

const one = (x) => (Array.isArray(x) ? x[0] : x) || null
const LOW_DAYS = 5

export default function Board({ profile }) {
  const [date, setDate] = useState(todayLocal())
  const [trucks, setTrucks] = useState([])
  const [team, setTeam] = useState([])
  const [low, setLow] = useState([])
  const [requests, setRequests] = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [orderFor, setOrderFor] = useState(null) // tank_id with open order form
  const [pickTruck, setPickTruck] = useState({}) // order_id -> truck_id

  const load = useCallback(async () => {
    setErr('')
    const [t, p, f, tk, o, r] = await Promise.all([
      supabase.from('trucks').select('id, name, capacity_gal').eq('active', true).order('created_at'),
      supabase.from('profiles').select('id, full_name, role').neq('role', 'customer').order('created_at'),
      supabase.from('tank_forecast').select('tank_id, capacity_gal, est_level_gal, est_days_left'),
      supabase.from('tanks').select('id, property:properties(id, address, customer:customers(id, full_name, phone))'),
      supabase.from('orders')
        .select('id, status, requested_gallons, is_urgent, window_start, customer_notes, tank_id, customer:customers(full_name, phone), property:properties(address)')
        .in('status', ['requested', 'scheduled', 'en_route'])
        .order('is_urgent', { ascending: false }).order('window_start', { ascending: true, nullsFirst: false }),
      supabase.from('routes')
        .select(`id, truck_id, driver_id, status,
          route_stops(id, seq, removed, order:orders(id, status, requested_gallons, is_urgent,
            customer:customers(full_name), property:properties(address), delivery:deliveries(gallons_delivered)))`)
        .eq('route_date', date),
    ])
    const firstErr = [t, p, f, tk, o, r].find((x) => x.error)
    if (firstErr) setErr(firstErr.error.message)

    setTrucks(t.data || [])
    setTeam(p.data || [])

    const openOrders = o.data || []
    const tankHasOrder = new Set(openOrders.map((x) => x.tank_id).filter(Boolean))
    const tankInfo = Object.fromEntries((tk.data || []).map((x) => [x.id, x.property]))
    setLow(
      (f.data || [])
        .filter((x) => Number(x.est_days_left) <= LOW_DAYS && !tankHasOrder.has(x.tank_id) && tankInfo[x.tank_id])
        .map((x) => ({ ...x, property: tankInfo[x.tank_id] }))
        .sort((a, b) => Number(a.est_days_left) - Number(b.est_days_left))
    )
    setRequests(openOrders.filter((x) => x.status === 'requested'))
    setRoutes(
      (r.data || []).map((rt) => ({
        ...rt,
        route_stops: rt.route_stops.filter((s) => !s.removed).sort((a, b) => a.seq - b.seq),
      }))
    )
    setLoading(false)
  }, [date])

  useEffect(() => { load() }, [load])
  useLive('board', ['orders', 'route_stops', 'routes', 'deliveries'], load)

  const routeByTruck = useMemo(() => Object.fromEntries(routes.map((r) => [r.truck_id, r])), [routes])
  const truckName = (id) => trucks.find((t) => t.id === id)?.name || 'Truck'
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  async function call(fn, args) {
    setErr('')
    const { error } = await supabase.rpc(fn, args)
    if (error) setErr(error.message)
    load()
  }

  const schedule = (orderId) => {
    const truckId = pickTruck[orderId] || trucks[0]?.id
    if (!truckId) return setErr('Add a truck first (Company → Setup).')
    const rt = routeByTruck[truckId]
    call('schedule_order', { p_order_id: orderId, p_truck_id: truckId, p_date: date, p_driver_id: rt?.driver_id || null })
  }

  return (
    <main className="board">
      <div className="board-head">
        <div>
          <h1>Dispatch board</h1>
          <span className="muted">{dateLabel}</span>
        </div>
        <label className="field inline">
          <span>Route date</span>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
      </div>
      {err && <p className="note">{err}</p>}
      {loading && <p className="muted">Loading…</p>}

      <div className="cols">
        {/* -------- Running low -------- */}
        <section className="col" aria-labelledby="low-h">
          <div className="col-head">
            <h2 id="low-h">Running low</h2>
            <span className="small muted">≤ {LOW_DAYS} days, no order yet</span>
          </div>
          {!loading && low.length === 0 && <p className="muted small">Nobody is close to running dry.</p>}
          {low.map((t) => {
            const c = t.property.customer
            const days = Number(t.est_days_left)
            const need = Math.max(100, Math.round((t.capacity_gal - t.est_level_gal) / 100) * 100)
            const sms = `sms:${c.phone}?&body=${encodeURIComponent(`Hi ${c.full_name}, your water tank is probably getting low. Want us to schedule a delivery?`)}`
            return (
              <div key={t.tank_id} className="item">
                <div className="row">
                  <div className="days">
                    <span className={`days-n ${days < 1 ? 'red' : days <= 3 ? 'amber' : ''}`}>{days.toFixed(1)}</span>
                    <span className="small muted">days</span>
                  </div>
                  <div className="grow">
                    <span className="strong">{c.full_name}</span>
                    <span className="small sub">~{fmt(t.est_level_gal)} of {fmt(t.capacity_gal)} gal · {t.property.address}</span>
                  </div>
                </div>
                {orderFor === t.tank_id ? (
                  <NewOrderForm
                    customerId={c.id} propertyId={t.property.id} tankId={t.tank_id}
                    defaultGallons={need} defaultDate={date} defaultUrgent={days < 1}
                    onCancel={() => setOrderFor(null)}
                    onDone={() => { setOrderFor(null); load() }}
                  />
                ) : (
                  <div className="row two">
                    <a className="btn ghost sm" href={sms}>Text reminder</a>
                    <button className="btn outline sm" onClick={() => setOrderFor(t.tank_id)}>Create order</button>
                  </div>
                )}
              </div>
            )
          })}
        </section>

        {/* -------- Requests -------- */}
        <section className="col" aria-labelledby="req-h">
          <div className="col-head">
            <h2 id="req-h">Requests</h2>
            <span className="small muted">Not on a route yet</span>
          </div>
          {!loading && requests.length === 0 && <p className="muted small">No open requests.</p>}
          {requests.map((o) => (
            <div key={o.id} className={`item ${o.is_urgent ? 'urgent' : ''}`}>
              <div className="row between">
                <span className="strong">{o.customer.full_name}</span>
                {o.is_urgent && <span className="chip red">Out of water</span>}
              </div>
              <span className="small sub">
                {fmt(o.requested_gallons)} gal · {o.property?.address}
                {o.window_start ? ` · wants ${new Date(`${o.window_start}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
              </span>
              {o.customer_notes && <span className="small sub">“{o.customer_notes}”</span>}
              <div className="row">
                {trucks.length > 1 && (
                  <select aria-label="Truck" value={pickTruck[o.id] || trucks[0].id}
                    onChange={(e) => setPickTruck({ ...pickTruck, [o.id]: e.target.value })}>
                    {trucks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
                <button className="btn primary sm grow-btn" onClick={() => schedule(o.id)}>
                  Add to {trucks.length === 1 ? trucks[0].name : 'route'}
                </button>
                <button className="btn link sm danger" onClick={() => window.confirm('Cancel this order?') && call('cancel_order', { p_order_id: o.id })}>Cancel</button>
              </div>
            </div>
          ))}
        </section>

        {/* -------- Routes -------- */}
        <section className="col" aria-labelledby="rt-h">
          <div className="col-head">
            <h2 id="rt-h">Routes</h2>
            <span className="small muted">{dateLabel}</span>
          </div>
          {trucks.length === 0 && <p className="muted small">Add a truck in Company → Setup to start building routes.</p>}
          {trucks.map((t) => {
            const rt = routeByTruck[t.id]
            const stops = rt?.route_stops || []
            const total = stops.reduce((s, x) => s + x.order.requested_gallons, 0)
            const loads = total > 0 ? Math.ceil(total / t.capacity_gal) : 0
            return (
              <div key={t.id} className="truck">
                <div className="truck-head">
                  <span className="strong">{t.name}</span>
                  <span className="small">{fmt(total)} gal · {loads} {loads === 1 ? 'load' : 'loads'}</span>
                </div>
                {rt && (
                  <label className="driver-pick">
                    <span className="small muted">Driver</span>
                    <select value={rt.driver_id || ''} onChange={(e) => call('set_route_driver', { p_route_id: rt.id, p_driver_id: e.target.value || null })}>
                      <option value="">Any driver</option>
                      {team.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.role}</option>)}
                    </select>
                  </label>
                )}
                {stops.length === 0 && <p className="muted small pad-s">No stops. Add requests from the middle column.</p>}
                <ol className="stops">
                  {stops.map((s, i) => {
                    const o = s.order
                    const delivered = o.status === 'delivered'
                    const d = one(o.delivery)
                    return (
                      <li key={s.id} className={delivered ? 'done' : ''}>
                        <span className={`num ${delivered ? 'ok' : ''}`}>{delivered ? '✓' : i + 1}</span>
                        <div className="grow">
                          <span className={`strong ${delivered ? 'strike' : ''}`}>{o.customer.full_name}</span>
                          <span className="small sub">
                            {delivered ? `${fmt(d?.gallons_delivered)} gal delivered` : `${fmt(o.requested_gallons)} gal · ${o.property?.address || ''}`}
                            {o.is_urgent && !delivered ? ' · urgent' : ''}
                          </span>
                          {o.status === 'en_route' && <span className="chip blue">On the way</span>}
                        </div>
                        {!delivered && (
                          <span className="stop-actions">
                            <button className="mini" aria-label={`Move ${o.customer.full_name} up`} disabled={i === 0} onClick={() => call('move_stop', { p_stop_id: s.id, p_dir: -1 })}>↑</button>
                            <button className="mini" aria-label={`Move ${o.customer.full_name} down`} disabled={i === stops.length - 1} onClick={() => call('move_stop', { p_stop_id: s.id, p_dir: 1 })}>↓</button>
                            <button className="mini" aria-label={`Take ${o.customer.full_name} off the route`} onClick={() => call('unschedule_order', { p_order_id: o.id })}>✕</button>
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </div>
            )
          })}
        </section>
      </div>
    </main>
  )
}
