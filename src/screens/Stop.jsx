import { useState } from 'react'
import { supabase, uploadPhoto, fmt } from '../supabase'

export default function StopScreen({ profile, stop, truck, onDone }) {
  const o = stop.order
  const p = o.property || {}
  const [gallons, setGallons] = useState(o.requested_gallons)
  const [photo, setPhoto] = useState(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.address || '')}`
  const smsBody = encodeURIComponent(`Hi ${o.customer.full_name}, this is your water delivery. I'm on my way now.`)
  const smsUrl = `sms:${o.customer.phone}?&body=${smsBody}`

  // Heading out (navigate or text ETA) marks the order "on the way" for the customer and office
  const onTheWay = () => {
    if (o.status === 'scheduled') supabase.rpc('start_stop', { p_order_id: o.id }).then(() => {})
  }

  async function deliver() {
    setBusy(true); setErr('')
    try {
      const photoPath = await uploadPhoto(profile.company_id, 'deliveries', photo)
      const { error } = await supabase.from('deliveries').insert({
        company_id: profile.company_id,
        order_id: o.id,
        truck_id: truck?.id,
        driver_id: profile.id,
        gallons_delivered: gallons,
        photo_path: photoPath,
        driver_notes: notes || null,
      })
      if (error) throw error
      onDone()
    } catch (e) {
      setErr(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <header className="top row">
        <button className="icon" aria-label="Back to route" onClick={onDone}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div>
          <span className="eyebrow">Stop {stop.pos}{o.is_urgent ? ' · Urgent' : ''}</span>
          <h1>{o.customer.full_name}</h1>
        </div>
      </header>

      <main className="stack pad">
        <div className="row two">
          <a className="btn dark" href={mapsUrl} target="_blank" rel="noreferrer" onClick={onTheWay}>Navigate</a>
          <a className="btn dark" href={smsUrl} onClick={onTheWay}>Text ETA</a>
        </div>

        <section className="card light">
          <span className="eyebrow dark">Before you pull in</span>
          <p className="strong">{p.address}</p>
          <div className="row two">
            <div><span className="label">Gate code</span><span className="big-num">{p.gate_code || '—'}</span></div>
            <div><span className="label">Hose run</span><span className="big-num">{p.hose_length_ft ? `${p.hose_length_ft} ft` : '—'}</span></div>
          </div>
          {p.access_notes && <p>{p.access_notes}</p>}
          {(p.dogs_on_property || p.road_condition) && (
            <span className="tags">
              {p.dogs_on_property && <span className="tag warn">Dogs on property</span>}
              {p.road_condition && <span className="tag">{p.road_condition}</span>}
            </span>
          )}
        </section>

        <div className="field">
          <label htmlFor="gal">Gallons delivered</label>
          <div className="stepper">
            <button type="button" aria-label="Subtract 100 gallons" onClick={() => setGallons((g) => Math.max(100, g - 100))}>−</button>
            <input id="gal" inputMode="numeric" value={gallons}
              onChange={(e) => setGallons(Math.max(0, parseInt(e.target.value.replace(/\D/g, '') || '0', 10)))} />
            <button type="button" aria-label="Add 100 gallons" onClick={() => setGallons((g) => g + 100)}>+</button>
          </div>
          <span className="muted small">Ordered {fmt(o.requested_gallons)} gal</span>
        </div>

        <label className={`btn photo ${photo ? 'has' : ''}`}>
          <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          {photo ? 'Tank photo added ✓' : 'Add tank photo'}
        </label>

        <label className="field">
          <span>Notes (optional)</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the office should know" />
        </label>

        {err && <p className="note">{err}</p>}
      </main>

      <footer className="actions">
        <button className="btn primary big" disabled={busy || gallons <= 0} onClick={deliver}>
          {busy ? 'Saving…' : 'Mark delivered'}
        </button>
      </footer>
    </div>
  )
}
