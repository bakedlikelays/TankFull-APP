import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, todayLocal, fmt } from '../supabase'
import NewOrderForm from '../components/NewOrderForm'
import { joinLink } from '../invite'
import { TankMini, levelOf } from '../components/Gauges'
import { Phone, Plus } from '../components/Icons'

const STATUS = { requested: 'Requested', scheduled: 'Scheduled', en_route: 'En route', delivered: 'Delivered', canceled: 'Canceled' }

export default function Customers() {
  const [list, setList] = useState([])
  const [forecast, setForecast] = useState({})
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [c, f] = await Promise.all([
      supabase.from('customers')
        .select('id, full_name, phone, email, profile_id, referred_by_customer_id, properties(id, address, gate_code, access_notes, dogs_on_property, hose_length_ft, road_condition, tanks(id, capacity_gal, est_daily_usage_gal, last_fill_at))')
        .order('full_name'),
      supabase.from('tank_forecast').select('tank_id, est_level_gal, est_days_left'),
    ])
    setList(c.data || [])
    setForecast(Object.fromEntries((f.data || []).map((x) => [x.tank_id, x])))
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return list
    return list.filter((c) =>
      c.full_name.toLowerCase().includes(s) || c.phone.includes(s) ||
      c.properties.some((p) => p.address.toLowerCase().includes(s)))
  }, [list, q])

  const open = list.find((c) => c.id === openId)

  return (
    <main className="board">
      <div className="board-head">
        <div>
          <h1>Customers</h1>
          <span className="muted">{list.length} {list.length === 1 ? 'customer' : 'customers'}</span>
        </div>
        <button className="btn primary" onClick={() => { setAdding(true); setOpenId(null) }}><Plus size={20} />Add customer</button>
      </div>

      <div className="split">
        <section className="col list-col" aria-label="Customer list">
          <label className="field">
            <span className="sr-only">Search customers</span>
            <input type="search" placeholder="Search name, phone or address" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          {loading && <p className="muted small">Loading…</p>}
          {!loading && list.length === 0 && <p className="muted small">No customers yet. Add your first one.</p>}
          {filtered.map((c) => {
            const tank = c.properties[0]?.tanks?.[0]
            const f = tank && forecast[tank.id]
            const days = f ? Number(f.est_days_left) : null
            return (
              <button key={c.id} className={`cust ${openId === c.id ? 'on' : ''}`} onClick={() => { setOpenId(c.id); setAdding(false); setEditing(false) }}>
                {tank ? <TankMini pct={f ? (f.est_level_gal / tank.capacity_gal) * 100 : 0} days={days} /> : <span className="tankmini" aria-hidden="true" />}
                <div className="grow">
                  <span className="strong">{c.full_name}</span>
                  <span className="small sub">{c.properties[0]?.address || c.phone}</span>
                </div>
                {days != null && (
                  <span className={`chip ${days < 1 ? 'red' : days <= 3 ? 'amber' : ''}`} aria-label={`${days.toFixed(1)} days left`}>{days.toFixed(1)}d</span>
                )}
              </button>
            )
          })}
        </section>

        <section className="col detail-col">
          {adding && <AddCustomer onDone={(id) => { setAdding(false); load().then(() => setOpenId(id)) }} onCancel={() => setAdding(false)} />}
          {!adding && open && editing && ( /* edit form */
            <CustomerForm key={open.id} customer={open} onDone={() => { setEditing(false); load() }} onCancel={() => setEditing(false)} />
          )}
          {!adding && open && !editing && <CustomerDetail customer={open} forecast={forecast} onChanged={load} onEdit={() => setEditing(true)} />}
          {!adding && !open && <p className="pick-hint">Pick a customer to see their tank and orders, or add a new one.</p>}
        </section>
      </div>
    </main>
  )
}

const EMPTY = { name: '', phone: '', email: '', address: '', gate: '', notes: '', dogs: false, hose: '', road: '', cap: '', usage: '150', last: '' }

// Prefill the form from a loaded customer (first property, first tank)
function toForm(c) {
  const p = c.properties?.[0] || {}
  const t = p.tanks?.[0] || {}
  const last = t.last_fill_at
    ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Phoenix' }).format(new Date(t.last_fill_at))
    : ''
  return {
    name: c.full_name || '', phone: c.phone || '', email: c.email || '',
    address: p.address || '', gate: p.gate_code || '', notes: p.access_notes || '',
    dogs: !!p.dogs_on_property, hose: p.hose_length_ft != null ? String(p.hose_length_ft) : '', road: p.road_condition || '',
    cap: t.capacity_gal != null ? String(t.capacity_gal) : '', usage: t.est_daily_usage_gal != null ? String(t.est_daily_usage_gal) : '150',
    last,
  }
}

function AddCustomer(props) {
  return <CustomerForm {...props} />
}

// Prefill from a service request (lead)
function leadToForm(l) {
  return {
    ...EMPTY,
    name: l.full_name || '', phone: l.phone || '', email: l.email || '',
    address: [l.address, l.town].filter(Boolean).join(', '),
    notes: l.notes || '', cap: l.tank_capacity ? String(l.tank_capacity) : '',
  }
}

// Add (no customer), edit (customer given) or convert a lead (lead given) — same form
export function CustomerForm({ customer, lead, onDone, onCancel }) {
  const editing = !!customer
  const initial = editing ? toForm(customer) : lead ? leadToForm(lead) : EMPTY
  const [f, setF] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const num = (v) => (v === '' ? null : parseInt(v, 10))

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    const shared = {
      p_full_name: f.name, p_phone: f.phone, p_email: f.email || null,
      p_address: f.address || null, p_gate_code: f.gate || null, p_access_notes: f.notes || null,
      p_dogs: f.dogs, p_hose_length_ft: num(f.hose), p_road_condition: f.road || null,
      p_tank_capacity: num(f.cap), p_daily_usage: num(f.usage) || 150,
    }
    const { data, error } = editing
      ? await supabase.rpc('update_customer', {
          p_customer_id: customer.id, ...shared,
          // only send a fill date when it was changed, so saving doesn't reset the estimate
          p_last_fill: f.last && f.last !== initial.last ? f.last : null,
        })
      : lead
        ? await supabase.rpc('convert_lead', { p_lead_id: lead.id, ...shared, p_last_fill: f.last || null })
        : await supabase.rpc('create_customer', { ...shared, p_last_fill: f.last || null })
    setBusy(false)
    if (error) return setErr(error.message)
    onDone(editing ? customer.id : data)
  }

  return (
    <form className="stack tight" onSubmit={submit}>
      <h2>{editing ? `Edit ${customer.full_name}` : lead ? `Add ${lead.full_name} as a customer` : 'New customer'}</h2>
      {lead?.user_id && (
        <p className="small sub">They already have a TankFull account. Saving connects it, so their portal opens with this tank and address.</p>
      )}
      <div className="row two">
        <label className="field"><span>Name</span><input required value={f.name} onChange={set('name')} /></label>
        <label className="field"><span>Phone</span><input required type="tel" value={f.phone} onChange={set('phone')} /></label>
      </div>
      <label className="field"><span>Email (optional)</span><input type="email" value={f.email} onChange={set('email')} /></label>

      <h3>Property</h3>
      <label className="field"><span>Address</span><input value={f.address} onChange={set('address')} /></label>
      <div className="row two">
        <label className="field"><span>Gate code</span><input value={f.gate} onChange={set('gate')} /></label>
        <label className="field"><span>Hose run (ft)</span><input inputMode="numeric" value={f.hose} onChange={(e) => setF({ ...f, hose: e.target.value.replace(/\D/g, '') })} /></label>
      </div>
      <label className="field"><span>Access notes for the driver</span><input value={f.notes} onChange={set('notes')} placeholder="e.g. 2nd gate past cattle guard, tank behind barn" /></label>
      <div className="row two">
        <label className="field"><span>Road</span><input value={f.road} onChange={set('road')} placeholder="dirt, 4x4 after rain…" /></label>
        <label className="check"><input type="checkbox" checked={f.dogs} onChange={set('dogs')} /><span>Dogs on property</span></label>
      </div>

      <h3>Tank</h3>
      <div className="row three">
        <label className="field"><span>Size (gal)</span><input inputMode="numeric" value={f.cap} onChange={(e) => setF({ ...f, cap: e.target.value.replace(/\D/g, '') })} /></label>
        <label className="field"><span>Uses / day (gal)</span><input inputMode="numeric" value={f.usage} onChange={(e) => setF({ ...f, usage: e.target.value.replace(/\D/g, '') })} /></label>
        <label className="field"><span>Last filled</span><input type="date" value={f.last} onChange={set('last')} /></label>
      </div>
      <p className="muted small">
        {editing
          ? 'Changing "last filled" resets the estimate to a full tank as of that day. Deliveries in the app update it automatically.'
          : 'Tank size, daily use and last fill power the "running low" estimate. Leave last filled blank if you don’t know; it starts counting from the first delivery.'}
      </p>

      {err && <p className="note">{err}</p>}
      <div className="row two">
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
        <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save customer'}</button>
      </div>
    </form>
  )
}

function CreditsCard({ customer }) {
  const [rows, setRows] = useState([])
  const [referrer, setReferrer] = useState(null)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('referral_credits')
      .select('id, amount, kind, note, created_at').eq('customer_id', customer.id).order('created_at', { ascending: false })
    setRows(data || [])
    if (customer.referred_by_customer_id) {
      const { data: r } = await supabase.from('customers').select('full_name').eq('id', customer.referred_by_customer_id).maybeSingle()
      setReferrer(r?.full_name || null)
    } else setReferrer(null)
  }, [customer.id, customer.referred_by_customer_id])
  useEffect(() => { load(); setAmount(''); setErr('') }, [load])

  const balance = rows.reduce((s, r) => s + Number(r.amount), 0)
  if (rows.length === 0 && !referrer) return null

  async function apply(e) {
    e.preventDefault()
    const amt = Math.min(Number(amount || balance), balance)
    if (!(amt > 0)) return
    setBusy(true); setErr('')
    const { data: co } = await supabase.from('customers').select('company_id').eq('id', customer.id).single()
    const { error } = await supabase.from('referral_credits').insert({
      company_id: co.company_id, customer_id: customer.id, amount: -amt, kind: 'redeemed', note: 'Applied to bill',
    })
    setBusy(false)
    if (error) return setErr(error.message)
    setAmount(''); load()
  }

  return (
    <div className="info">
      <div className="row between">
        <span className="strong">Referral credit</span>
        <span className={`chip ${balance > 0 ? 'green' : ''}`}>${balance.toFixed(2)}</span>
      </div>
      {referrer && <span className="small sub">Referred by {referrer}</span>}
      {rows.slice(0, 5).map((r) => (
        <span key={r.id} className="small sub">
          {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {r.note || r.kind} · {Number(r.amount) > 0 ? '+' : '−'}${Math.abs(Number(r.amount)).toFixed(2)}
        </span>
      ))}
      {balance > 0 && (
        <form className="row" onSubmit={apply}>
          <label className="sr-only" htmlFor={`amt-${customer.id}`}>Amount to apply</label>
          <input id={`amt-${customer.id}`} className="amt" inputMode="decimal" placeholder={balance.toFixed(2)} value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
          <button className="btn outline sm" disabled={busy}>{busy ? 'Saving…' : 'Mark as used on bill'}</button>
        </form>
      )}
      {err && <p className="note">{err}</p>}
    </div>
  )
}

function PortalInvite({ customer }) {
  const [code, setCode] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => { setCode(null); setMsg('') }, [customer.id])

  if (customer.profile_id) {
    return <p className="small sub">Has a customer portal login.</p>
  }

  async function create() {
    setBusy(true); setMsg('')
    const [{ data, error }, co] = await Promise.all([
      supabase.rpc('invite_customer', { p_customer_id: customer.id }),
      supabase.from('companies').select('name').maybeSingle(),
    ])
    setBusy(false)
    if (error) return setMsg(error.message)
    setCode({ code: data, company: co.data?.name || 'your water company' })
  }

  async function send() {
    const text = `Hi ${customer.full_name.split(' ')[0]}, you can now check your tank and order water online. ` +
      `Tap here to set up your account: ${joinLink(code.code)} — ${code.company}`
    if (navigator.share) {
      try { await navigator.share({ text }) } catch { /* closed */ }
    } else {
      window.location.href = `sms:${customer.phone}?&body=${encodeURIComponent(text)}`
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(joinLink(code.code))
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { setMsg(joinLink(code.code)) }
  }

  return (
    <div className="info">
      <span className="strong">Customer portal</span>
      {!code ? (
        <>
          <span className="small sub">Let {customer.full_name.split(' ')[0]} check their tank and order water from their phone.</span>
          <button className="btn outline sm" disabled={busy} onClick={create}>{busy ? 'Creating…' : 'Invite to portal'}</button>
        </>
      ) : (
        <>
          <span className="code">{code.code}</span>
          <span className="small sub">Good for 30 days. The link signs them up and connects them in one tap.</span>
          <div className="row two">
            <button className="btn primary sm" onClick={send}>Text invite</button>
            <button className="btn ghost sm" onClick={copy}>{copied ? 'Link copied' : 'Copy link'}</button>
          </div>
        </>
      )}
      {msg && <p className="note">{msg}</p>}
    </div>
  )
}

function CustomerDetail({ customer, forecast, onChanged, onEdit }) {
  const [orders, setOrders] = useState([])
  const [ordering, setOrdering] = useState(false)
  const [usage, setUsage] = useState('')
  const p = customer.properties[0]
  const tank = p?.tanks?.[0]
  const f = tank && forecast[tank.id]

  const loadOrders = useCallback(async () => {
    const { data } = await supabase.from('orders')
      .select('id, status, requested_gallons, window_start, is_urgent, created_at, delivery:deliveries(gallons_delivered, delivered_at)')
      .eq('customer_id', customer.id).order('created_at', { ascending: false }).limit(10)
    setOrders(data || [])
  }, [customer.id])
  useEffect(() => { loadOrders(); setOrdering(false); setUsage(tank ? String(tank.est_daily_usage_gal) : '') }, [loadOrders, tank])

  async function saveUsage() {
    if (!tank || !usage) return
    await supabase.from('tanks').update({ est_daily_usage_gal: parseInt(usage, 10) }).eq('id', tank.id)
    onChanged()
  }

  return (
    <div className="stack tight">
      <div className="detail-head">
        <h2>{customer.full_name}</h2>
        <div className="row">
          <a className="btn ghost sm" href={`tel:${customer.phone}`}><Phone size={18} />{customer.phone}</a>
          <button className="btn outline sm" onClick={onEdit}>Edit</button>
        </div>
      </div>
      {customer.email && <span className="small sub">{customer.email}</span>}

      {p ? (
        <div className="info">
          <span className="strong">{p.address}</span>
          <span className="small sub">
            {[p.gate_code && `Gate ${p.gate_code}`, p.hose_length_ft && `${p.hose_length_ft} ft hose`, p.dogs_on_property && 'Dogs', p.road_condition].filter(Boolean).join(' · ') || 'No access details'}
          </span>
          {p.access_notes && <span className="small">{p.access_notes}</span>}
        </div>
      ) : <p className="muted small">No property on file.</p>}

      {tank && (
        <div className="info">
          <div className="tank-wide">
            <TankMini pct={f ? (f.est_level_gal / tank.capacity_gal) * 100 : 0} days={f ? Number(f.est_days_left) : null} />
            <div className="grow">
              <span className="strong">{fmt(tank.capacity_gal)} gal tank</span>
              {f
                ? <span className="small sub">About {fmt(f.est_level_gal)} gal left (estimate)</span>
                : <span className="small sub">Estimate starts after the first delivery</span>}
            </div>
            {f && <span className={`chip ${levelOf(Number(f.est_days_left)) === 'dry' ? 'red' : Number(f.est_days_left) <= 3 ? 'amber' : ''}`}>~{Number(f.est_days_left).toFixed(1)} days left</span>}
          </div>
          <div className="row">
            <label className="field inline"><span>Uses per day (gal)</span>
              <input inputMode="numeric" value={usage} onChange={(e) => setUsage(e.target.value.replace(/\D/g, ''))} onBlur={saveUsage} /></label>
          </div>
        </div>
      )}

      {p && (ordering ? (
        <NewOrderForm
          customerId={customer.id} propertyId={p.id} tankId={tank?.id}
          defaultGallons={tank ? Math.max(100, Math.round((tank.capacity_gal - (f?.est_level_gal || 0)) / 100) * 100) : 2000}
          defaultDate={todayLocal()}
          onCancel={() => setOrdering(false)}
          onDone={() => { setOrdering(false); loadOrders(); onChanged() }}
        />
      ) : (
        <button className="btn primary" onClick={() => setOrdering(true)}><Plus size={20} />New order</button>
      ))}

      <PortalInvite customer={customer} />
      <CreditsCard customer={customer} />

      <h3>Recent orders</h3>
      {orders.length === 0 && <p className="muted small">No orders yet.</p>}
      {orders.map((o) => {
        const d = Array.isArray(o.delivery) ? o.delivery[0] : o.delivery
        return (
          <div key={o.id} className="line">
            <div className="grow">
              <span className="strong">{fmt(d?.gallons_delivered ?? o.requested_gallons)} gal{o.is_urgent ? ' · urgent' : ''}</span>
              <span className="small sub">
                {d ? `Delivered ${new Date(d.delivered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                   : o.window_start ? `For ${new Date(`${o.window_start}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'No date'}
              </span>
            </div>
            <span className={`chip ${o.status === 'delivered' ? 'green' : ''}`}>{STATUS[o.status]}</span>
          </div>
        )
      })}
    </div>
  )
}
