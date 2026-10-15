import { useCallback, useEffect, useState } from 'react'
import { supabase, todayLocal, fmt, useLive } from '../supabase'
import { Back } from '../components/Icons'
import { referralLink } from '../invite'

const money = (n) => `$${Number(n || 0).toFixed(Number(n) % 1 ? 2 : 0)}`

function ReferCard({ me, company, credits }) {
  const [copied, setCopied] = useState(false)
  const balance = credits.reduce((s, c) => s + Number(c.amount), 0)
  const referred = credits.filter((c) => c.kind === 'referrer').length
  const on = company?.referrals_enabled && me?.referral_code
  if (!on && balance <= 0) return null

  const link = on ? referralLink(me.referral_code) : ''
  const credit = Number(company?.referral_credit || 0)
  const text = `I get my water from ${company?.name}. They're reliable and you can order from your phone.` +
    (credit > 0 ? ` Sign up with my link and we both get ${money(credit)} off: ` : ' Here’s my link: ') + link

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ text }) } catch { /* closed */ }
    } else {
      try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ }
    }
  }

  return (
    <section className="p-card p-refer">
      {on && (
        <>
          <span className="p-strong">{credit > 0 ? `Give ${money(credit)}, get ${money(credit)}` : 'Know someone who needs water?'}</span>
          <span className="p-muted">
            {credit > 0
              ? `Share your link. When a friend gets their first delivery from ${company.name}, you both get ${money(credit)} off.`
              : `Share your link and ${company.name} will reach out to them.`}
          </span>
          <button className="p-btn" onClick={share}>{copied ? 'Copied' : 'Share my link'}</button>
        </>
      )}
      {(balance > 0 || referred > 0) && (
        <div className="p-row between p-credit">
          <span className="p-muted">{referred > 0 ? `${referred} friend${referred === 1 ? '' : 's'} referred` : 'Your credit'}</span>
          <span className="p-strong">{money(balance)} credit</span>
        </div>
      )}
      {balance > 0 && <span className="p-small">Your hauler takes it off your next bill.</span>}
    </section>
  )
}

const STATUS = { requested: 'Requested', scheduled: 'Scheduled', en_route: 'On the way', delivered: 'Delivered', canceled: 'Canceled' }
const OPEN = ['requested', 'scheduled', 'en_route']
const one = (x) => (Array.isArray(x) ? x[0] : x) || null
const day = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export default function CustomerPortal({ profile }) {
  const [me, setMe] = useState(null)
  const [company, setCompany] = useState(null)
  const [tank, setTank] = useState(null)
  const [est, setEst] = useState(null)
  const [orders, setOrders] = useState([])
  const [credits, setCredits] = useState([])
  const [view, setView] = useState('home')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [c, co, f, o, cr] = await Promise.all([
      supabase.from('customers').select('id, full_name, referral_code, properties(id, address, tanks(id, capacity_gal))').maybeSingle(),
      supabase.from('companies').select('name, phone, referrals_enabled, referral_credit').eq('id', profile.company_id).maybeSingle(),
      supabase.from('tank_forecast').select('tank_id, capacity_gal, est_level_gal, est_days_left'),
      supabase.from('orders')
        .select('id, status, requested_gallons, window_start, is_urgent, created_at, delivery:deliveries(gallons_delivered, delivered_at)')
        .order('created_at', { ascending: false }).limit(20),
      supabase.from('referral_credits').select('amount, kind, note, created_at').order('created_at', { ascending: false }),
    ])
    setMe(c.data); setCompany(co.data); setOrders(o.data || []); setCredits(cr.data || [])
    const t = c.data?.properties?.[0]?.tanks?.[0] || null
    setTank(t)
    setEst((f.data || []).find((x) => x.tank_id === t?.id) || null)
    setLoading(false)
  }, [profile.company_id])
  useEffect(() => { load() }, [load])
  useLive('portal', ['orders', 'deliveries'], load)

  if (loading) return <div className="portal p-center">Loading…</div>

  const open = orders.find((o) => OPEN.includes(o.status))
  const history = orders.filter((o) => o.status === 'delivered').slice(0, 5)
  const firstName = (me?.full_name || '').split(' ')[0]

  if (view === 'order' && tank) {
    return <OrderWater tank={tank} est={est} onDone={() => { setView('home'); load() }} onBack={() => setView('home')} />
  }

  const days = est ? Number(est.est_days_left) : null
  const pct = est ? Math.max(2, Math.min(100, Math.round((est.est_level_gal / est.capacity_gal) * 100))) : 0
  const level = days == null ? '' : days <= 3 ? 'low' : days <= 6 ? 'mid' : 'ok'

  async function cancel(id) {
    if (!window.confirm('Cancel this delivery request?')) return
    const { error } = await supabase.rpc('customer_cancel_order', { p_order_id: id })
    if (error) alert(error.message)
    load()
  }

  return (
    <div className="portal">
      <header className="p-top">
        <div>
          <span className="p-eyebrow">{firstName ? `Hi, ${firstName}` : 'Welcome'}</span>
          <h1 className="p-h1">{company?.name || 'Your water'}</h1>
        </div>
        <button className="p-link" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>

      <main className="p-main">
        {!tank && (
          <section className="p-card">
            <p className="p-strong">Your tank isn't set up yet.</p>
            <p className="p-muted">Give {company?.name || 'your water company'} a call and they'll add it.</p>
          </section>
        )}

        {tank && (
          <section className="p-card p-tank" aria-label="Tank level">
            <div className="p-gauge" role="img" aria-label={`Tank about ${pct} percent full`}>
              <div className={`p-fill ${level}`} style={{ height: `${pct}%` }} />
              <i style={{ top: '25%' }} /><i style={{ top: '50%', width: 22 }} /><i style={{ top: '75%' }} />
            </div>
            <div className="p-tank-txt">
              <span className="p-eyebrow">Your {fmt(tank.capacity_gal)} gal tank</span>
              {est && est.est_days_left != null ? (
                <>
                  <span className="p-big">{days < 1 ? '<1' : Math.floor(days)}<small>{Math.floor(days) === 1 ? 'day' : 'days'}</small></span>
                  <span className="p-muted">left at your usual pace</span>
                  <span className="p-strong">About {fmt(est.est_level_gal)} gal remaining</span>
                  {days <= 3 && !open && <span className="p-pill warn">Time to order</span>}
                </>
              ) : (
                <span className="p-muted">We'll estimate your level after your first delivery.</span>
              )}
            </div>
          </section>
        )}

        {open?.status === 'en_route' ? (
          <section className="p-card p-otw" aria-live="polite">
            <span className="p-otw-dot" aria-hidden="true" />
            <div>
              <span className="p-strong">Your water is on the way</span>
              <span className="p-muted">{fmt(open.requested_gallons)} gal · the driver is headed to you now</span>
            </div>
          </section>
        ) : open ? (
          <section className="p-card">
            <div className="p-row between">
              <span className="p-muted p-strong-sm">Your delivery</span>
              <span className={`p-pill ${open.status === 'scheduled' ? 'blue' : ''}`}>{STATUS[open.status]}</span>
            </div>
            <span className="p-strong">{fmt(open.requested_gallons)} gal{open.window_start ? ` · ${day(open.window_start)}` : ' · soonest available'}</span>
            {open.is_urgent && <span className="p-muted">Marked urgent</span>}
            {open.status === 'requested' && (
              <button className="p-link left" onClick={() => cancel(open.id)}>Cancel request</button>
            )}
          </section>
        ) : tank && (
          <button className="p-btn" onClick={() => setView('order')}>Order water</button>
        )}

        <section className="p-section">
          <h2 className="p-h2">Recent deliveries</h2>
          {history.length === 0 && <p className="p-muted">No deliveries yet.</p>}
          {history.length > 0 && (
            <div className="p-card flush">
              {history.map((o) => {
                const d = one(o.delivery)
                return (
                  <div key={o.id} className="p-line">
                    <span className="p-strong">
                      {d ? new Date(d.delivered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} · {fmt(d?.gallons_delivered ?? o.requested_gallons)} gal
                    </span>
                    <span className="p-pill green">Delivered</span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <ReferCard me={me} company={company} credits={credits} />

        {company?.phone && (
          <a className="p-btn ghost" href={`tel:${company.phone}`}>Call {company.name}</a>
        )}
      </main>
    </div>
  )
}

function OrderWater({ tank, est, onDone, onBack }) {
  const room = Math.max(100, Math.floor((tank.capacity_gal - (est?.est_level_gal || 0)) / 100) * 100)
  const options = [
    { id: 'fill', gal: room, label: 'Fill it up', sub: `~${fmt(room)} gal` },
    ...[1000, 1500, 2000].filter((g) => g < room).map((g) => ({ id: String(g), gal: g, label: `${fmt(g)} gal`, sub: g === 1000 ? 'Top-off' : '' })),
  ]
  const [pick, setPick] = useState('fill')
  const [when, setWhen] = useState('soon')
  const [date, setDate] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const chosen = options.find((o) => o.id === pick) || options[0]

  async function submit() {
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('customer_request_order', {
      p_gallons: chosen.gal,
      p_window_start: when === 'pick' ? (date || null) : null,
      p_is_urgent: urgent,
      p_notes: notes || null,
      p_tank_id: tank.id,
    })
    setBusy(false)
    if (error) return setErr(error.message)
    onDone()
  }

  return (
    <div className="portal">
      <header className="p-top start">
        <button className="p-icon" aria-label="Back" onClick={onBack}>
          <Back />
        </button>
        <h1 className="p-h1">Order water</h1>
      </header>
      <main className="p-main">
        <fieldset className="p-fs">
          <legend className="p-h2">How much?</legend>
          <div className="p-grid2">
            {options.map((o) => (
              <button key={o.id} type="button" aria-pressed={pick === o.id} className={`p-chip ${pick === o.id ? 'on' : ''}`} onClick={() => setPick(o.id)}>
                <span className="p-strong">{o.label}</span>
                {o.sub && <span className="p-small">{o.sub}</span>}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="p-fs">
          <legend className="p-h2">When?</legend>
          <div className="p-pills">
            <button type="button" aria-pressed={when === 'soon'} className={`p-pillbtn ${when === 'soon' ? 'on' : ''}`} onClick={() => setWhen('soon')}>Soonest</button>
            <button type="button" aria-pressed={when === 'pick'} className={`p-pillbtn ${when === 'pick' ? 'on' : ''}`} onClick={() => setWhen('pick')}>Pick a date</button>
          </div>
          {when === 'pick' && (
            <label className="p-field"><span>Date</span>
              <input type="date" min={todayLocal()} value={date} onChange={(e) => setDate(e.target.value)} /></label>
          )}
        </fieldset>

        <button type="button" aria-pressed={urgent} className={`p-toggle ${urgent ? 'on' : ''}`} onClick={() => setUrgent(!urgent)}>
          <span className="p-toggle-txt">
            <span className="p-strong">I'm out of water</span>
            <span className="p-small">Flags this as urgent</span>
          </span>
          <span className="p-switch" aria-hidden="true"><span /></span>
        </button>

        <label className="p-field"><span>Notes for the driver</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></label>

        {err && <p className="p-err">{err}</p>}
      </main>
      <footer className="p-foot">
        <span className="p-muted">{fmt(chosen.gal)} gal · {when === 'pick' && date ? day(date) : 'Soonest'}{urgent ? ' · Urgent' : ''}</span>
        <button className="p-btn" disabled={busy || (when === 'pick' && !date)} onClick={submit}>{busy ? 'Sending…' : 'Request delivery'}</button>
      </footer>
    </div>
  )
}
