import { useEffect, useState } from 'react'
import { supabase, uploadPhoto } from '../supabase'
import { Back, Camera, Check } from '../components/Icons'

export default function FillLogScreen({ profile, truck, onDone }) {
  const [stations, setStations] = useState([])
  const [stationId, setStationId] = useState(null)
  const [gallons, setGallons] = useState(truck?.capacity_gal || '')
  const [cost, setCost] = useState('')
  const [ticket, setTicket] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.from('fill_stations').select('id, name, hours_note').order('created_at').then(({ data }) => {
      setStations(data || [])
      if (data?.length) setStationId(data[0].id)
    })
  }, [])

  async function save() {
    setBusy(true); setErr('')
    try {
      const path = await uploadPhoto(profile.company_id, 'fill-tickets', ticket)
      const { error } = await supabase.from('fill_logs').insert({
        company_id: profile.company_id,
        truck_id: truck.id,
        driver_id: profile.id,
        station_id: stationId,
        gallons_loaded: parseInt(gallons, 10),
        cost: cost === '' ? null : Number(cost),
        ticket_photo: path,
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
          <Back />
        </button>
        <div>
          <span className="eyebrow">{truck?.name}</span>
          <h1>Log a fill</h1>
        </div>
      </header>

      <main className="stack pad">
        <fieldset className="stack tight">
          <legend className="strong">Fill station</legend>
          {stations.map((s) => (
            <button key={s.id} type="button" aria-pressed={stationId === s.id}
              className={`choice ${stationId === s.id ? 'on' : ''}`} onClick={() => setStationId(s.id)}>
              <span className="strong">{s.name}</span>
              {s.hours_note && <span className="small sub">{s.hours_note}</span>}
            </button>
          ))}
        </fieldset>

        <div className="row two">
          <label className="field">
            <span>Gallons loaded</span>
            <input inputMode="numeric" value={gallons} onChange={(e) => setGallons(e.target.value.replace(/\D/g, ''))} />
          </label>
          <label className="field">
            <span>Cost</span>
            <input inputMode="decimal" placeholder="$0.00" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d.]/g, ''))} />
          </label>
        </div>

        <label className={`btn photo ${ticket ? 'has' : ''}`}>
          <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => setTicket(e.target.files?.[0] || null)} />
          {ticket ? <><Check />Ticket photo added</> : <><Camera />Snap the fill ticket</>}
        </label>

        <p className="muted small">Each fill is saved with the truck, driver and time, so your permit records build themselves.</p>
        {err && <p className="note">{err}</p>}
      </main>

      <footer className="actions">
        <button className="btn primary big" disabled={busy || !gallons || !stationId} onClick={save}>
          {busy ? 'Saving…' : gallons ? `Save ${Number(gallons).toLocaleString('en-US')} gal fill` : 'Save fill'}
        </button>
      </footer>
    </div>
  )
}
