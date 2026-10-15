import { useCallback, useEffect, useState } from 'react'
import { supabase, fmt, useLive } from '../supabase'
import { CustomerForm } from './Customers'

const SOURCE = { directory: 'Found you in TankFull', referral: 'Referral' }
const ago = (t) => {
  const m = Math.round((Date.now() - new Date(t).getTime()) / 60000)
  if (m < 60) return `${Math.max(1, m)} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Leads({ goCustomers }) {
  const [open, setOpen] = useState([])
  const [done, setDone] = useState([])
  const [referrers, setReferrers] = useState({})
  const [converting, setConverting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const [o, d] = await Promise.all([
      supabase.from('leads').select('*').in('status', ['new', 'contacted']).order('created_at', { ascending: false }),
      supabase.from('leads').select('id, full_name, status, source, updated_at')
        .in('status', ['converted', 'declined', 'withdrawn']).order('updated_at', { ascending: false }).limit(10),
    ])
    if (o.error) setErr(o.error.message)
    const rows = o.data || []
    setOpen(rows); setDone(d.data || [])
    const ids = [...new Set(rows.map((r) => r.referred_by_customer_id).filter(Boolean))]
    if (ids.length) {
      const { data } = await supabase.from('customers').select('id, full_name').in('id', ids)
      setReferrers(Object.fromEntries((data || []).map((c) => [c.id, c.full_name])))
    }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])
  useLive('leads', ['leads'], load)

  async function setStatus(id, status) {
    setErr('')
    const { error } = await supabase.from('leads').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) setErr(error.message)
    load()
  }

  if (converting) {
    return (
      <main className="board">
        <div className="col detail-col narrow">
          <CustomerForm
            lead={converting}
            onCancel={() => setConverting(null)}
            onDone={() => { setConverting(null); load(); goCustomers?.() }}
          />
        </div>
      </main>
    )
  }

  return (
    <main className="board">
      <div className="board-head">
        <div>
          <h1>Leads</h1>
          <span className="muted">People asking for service, from the TankFull directory and customer referrals</span>
        </div>
      </div>
      {err && <p className="note">{err}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && open.length === 0 && (
        <div className="col">
          <p className="strong">No new requests.</p>
          <p className="muted small">Turn on your directory listing and referrals in Company → Setup to start getting them.</p>
        </div>
      )}

      <div className="cols">
        {open.map((l) => {
          const sms = `sms:${l.phone}?&body=${encodeURIComponent(`Hi ${l.full_name.split(' ')[0]}, thanks for reaching out about water delivery! `)}`
          return (
            <section key={l.id} className={`col lead ${l.status === 'new' ? 'is-new' : ''}`} aria-label={`Request from ${l.full_name}`}>
              <div className="row between">
                <span className="strong big-name">{l.full_name}</span>
                <span className={`chip ${l.status === 'new' ? 'blue' : ''}`}>{l.status === 'new' ? 'New' : 'Contacted'}</span>
              </div>
              <span className="small sub">
                {l.source === 'referral'
                  ? `Referred by ${referrers[l.referred_by_customer_id] || 'a customer'}${l.promised_credit ? ` · $${Number(l.promised_credit).toFixed(0)} credit each after first delivery` : ''}`
                  : SOURCE[l.source]}
                {' · '}{ago(l.created_at)}
              </span>
              <div className="info">
                {(l.address || l.town) && <span className="strong">{[l.address, l.town].filter(Boolean).join(', ')}</span>}
                <span className="small">{l.phone}{l.email ? ` · ${l.email}` : ''}</span>
                {l.tank_capacity && <span className="small sub">Tank: {fmt(l.tank_capacity)} gal</span>}
                {l.notes && <span className="small">“{l.notes}”</span>}
              </div>
              <div className="row two">
                <a className="btn ghost sm" href={`tel:${l.phone}`} onClick={() => l.status === 'new' && setStatus(l.id, 'contacted')}>Call</a>
                <a className="btn ghost sm" href={sms} onClick={() => l.status === 'new' && setStatus(l.id, 'contacted')}>Text</a>
              </div>
              <button className="btn primary sm" onClick={() => setConverting(l)}>Add as customer</button>
              <button className="btn link sm danger" onClick={() => window.confirm(`Decline ${l.full_name}'s request? They'll be told you can't take it and can pick another hauler.`) && setStatus(l.id, 'declined')}>
                Can't take them
              </button>
            </section>
          )
        })}
      </div>

      {done.length > 0 && (
        <section className="col">
          <h2>Recent</h2>
          {done.map((l) => (
            <div key={l.id} className="line">
              <div className="grow">
                <span className="strong">{l.full_name}</span>
                <span className="small sub">{SOURCE[l.source]} · {ago(l.updated_at)}</span>
              </div>
              <span className={`chip ${l.status === 'converted' ? 'green' : ''}`}>
                {l.status === 'converted' ? 'Customer' : l.status === 'declined' ? 'Declined' : 'Withdrew'}
              </span>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}
