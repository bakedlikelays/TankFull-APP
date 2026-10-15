import { useState } from 'react'
import { supabase } from '../supabase'

// Creates an order for one customer's property/tank.
export default function NewOrderForm({ customerId, propertyId, tankId, defaultGallons = 2000, defaultDate, defaultUrgent = false, onDone, onCancel }) {
  const [gallons, setGallons] = useState(String(defaultGallons))
  const [date, setDate] = useState(defaultDate || '')
  const [urgent, setUrgent] = useState(defaultUrgent)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('create_order', {
      p_customer_id: customerId,
      p_property_id: propertyId,
      p_tank_id: tankId || null,
      p_gallons: parseInt(gallons, 10),
      p_window_start: date || null,
      p_is_urgent: urgent,
      p_notes: notes || null,
      p_source: 'phone',
    })
    setBusy(false)
    if (error) return setErr(error.message)
    onDone?.()
  }

  return (
    <form className="stack tight order-form" onSubmit={submit}>
      <div className="row two">
        <label className="field"><span>Gallons</span>
          <input inputMode="numeric" required value={gallons} onChange={(e) => setGallons(e.target.value.replace(/\D/g, ''))} /></label>
        <label className="field"><span>Deliver on</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      </div>
      <label className="check">
        <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
        <span>Urgent (out of water)</span>
      </label>
      <label className="field"><span>Notes</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></label>
      {err && <p className="note">{err}</p>}
      <div className="row two">
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}
        <button className="btn primary" disabled={busy || !gallons}>{busy ? 'Saving…' : 'Create order'}</button>
      </div>
    </form>
  )
}
