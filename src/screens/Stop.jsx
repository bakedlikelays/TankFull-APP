import { useState } from 'react'
import { supabase, uploadPhoto, fmt } from '../supabase'
import { Back, Nav, Chat, Camera, Check, Dog, Road } from '../components/Icons'

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
        <button className="icon" aria-label="Back to route" onClick={onDone}><Back /></button>
        <div className="grow">
          <span className="eyebrow">Stop {stop.pos}{o.is_urgent ? ', out of water' : ''}</span>
          <h1>{o.customer.full_name}</h1>
        </div>
      </header>

      <main className="stack pad">
        <div className="quick">
          <a className="btn dark" href={mapsUrl} target="_blank" rel="noreferrer" onClick={onTheWay}><Nav />Navigate</a>
          <a className="btn dark" href={smsUrl} onClick={onTheWay}><Chat />Text ETA</a>
        </div>

        <section className="card light" aria-label="Access details">
          <span className="addr">{p.address}</span>
          <div className="access-grid">
            <div><span className="label">Gate code</span><span className="big-num">{p.gate_code || '—'}</span></div>
            <div><span className="label">Hose run</span><span className="big-num">{p.hose_length_ft ? `${p.hose_length_ft} ft` : '—'}</span></div>
          </div>
          {p.access_notes && <p>{p.access_notes}</p>}
          {(p.dogs_on_property || p.road_condition) && (
            <span className="tags">
              {p.dogs_on_property && <span className="tag warn"><Dog size={14} />Dogs on property</span>}
              {p.road_condition && <span className="tag"><Road size={14} />{p.road_condition}</span>}
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
          <span className="muted small">
            Ordered {fmt(o.requested_gallons)} gal
            {gallons !== o.requested_gallons && gallons > 0 && ` · ${gallons > o.requested_gallons ? '+' : '−'}${fmt(Math.abs(gallons - o.requested_gallons))}`}
          </span>
        </div>

        <label className={`btn photo ${photo ? 'has' : ''}`}>
          <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          {photo ? <><Check />Tank photo added</> : <><Camera />Add tank photo</>}
        </label>

        <label className="field">
          <span>Notes (optional)</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the office should know" />
        </label>

        {err && <p className="note">{err}</p>}
      </main>

      <footer className="actions">
        <button className="btn primary big" disabled={busy || gallons <= 0} onClick={deliver}>
          {busy ? 'Saving…' : `Mark ${fmt(gallons)} gal delivered`}
        </button>
      </footer>
    </div>
  )
}
