import { useEffect, useState } from 'react'
import { supabase, fmt } from '../supabase'
import { pendingReferral, clearPendingReferral } from '../invite'

const Back = ({ onClick }) => (
  <button className="p-icon" aria-label="Back" onClick={onClick}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
  </button>
)

// Homeowner without a hauler: pick a town, browse haulers, request service.
// A referral link skips straight to the request form for that hauler.
export default function FindWater({ onBack, onSent }) {
  const refCode = pendingReferral()
  const [referral, setReferral] = useState(undefined) // undefined = loading
  const [towns, setTowns] = useState(null)
  const [town, setTown] = useState('')
  const [results, setResults] = useState(null)
  const [picked, setPicked] = useState(null)
  const [noArea, setNoArea] = useState(false)

  useEffect(() => {
    if (!refCode) { setReferral(null); return }
    supabase.rpc('referral_preview', { p_code: refCode }).then(({ data }) => {
      const r = data?.[0] || null
      if (!r) clearPendingReferral() // expired or turned off: fall back to browsing
      setReferral(r)
    })
  }, [refCode])

  useEffect(() => {
    supabase.rpc('directory_towns').then(({ data }) => setTowns((data || []).map((x) => (typeof x === 'string' ? x : x.directory_towns))))
  }, [])

  useEffect(() => {
    if (!town) { setResults(null); return }
    supabase.rpc('directory_search', { p_town: town }).then(({ data }) => setResults(data || []))
  }, [town])

  if (referral === undefined) return <div className="portal p-center">Loading…</div>

  if (referral) {
    return (
      <RequestForm
        company={{ id: referral.company_id, name: referral.company_name }}
        referral={referral}
        referralCode={refCode}
        onBack={() => { clearPendingReferral(); setReferral(null) }}
        onDone={() => { clearPendingReferral(); onSent() }}
      />
    )
  }

  if (picked) return <RequestForm company={picked} town={town} onBack={() => setPicked(null)} onDone={onSent} />
  if (noArea) return <AreaForm town={town} onBack={() => setNoArea(false)} />

  return (
    <div className="portal">
      <header className="p-top start">
        <Back onClick={onBack} />
        <h1 className="p-h1">Find a water hauler</h1>
      </header>
      <main className="p-main">
        <label className="p-field">
          <span>Where do you need water?</span>
          <select className="p-select" value={town} onChange={(e) => setTown(e.target.value)}>
            <option value="">Choose your town</option>
            {(towns || []).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <button className="p-link left" onClick={() => setNoArea(true)}>My town isn't listed</button>

        {towns && towns.length === 0 && (
          <section className="p-card">
            <p className="p-strong">No haulers are listed yet.</p>
            <p className="p-muted">Leave your town and we'll let you know when one joins.</p>
          </section>
        )}

        {results && results.length === 0 && (
          <section className="p-card">
            <p className="p-strong">No listed haulers deliver to {town} yet.</p>
            <button className="p-btn ghost" onClick={() => setNoArea(true)}>Tell us you need service here</button>
          </section>
        )}

        {(results || []).map((c) => (
          <section key={c.id} className="p-card p-hauler">
            <div className="p-row between">
              <h2 className="p-h2 flush">{c.name}</h2>
              {c.price_from_per_1000 != null && (
                <span className="p-pill blue">from ${Number(c.price_from_per_1000).toFixed(0)} / 1,000 gal</span>
              )}
            </div>
            {c.about && <p className="p-muted">{c.about}</p>}
            <p className="p-small">
              Delivers to {(c.service_towns || []).join(', ')}
              {c.min_gallons ? ` · ${fmt(c.min_gallons)} gal minimum` : ''}
            </p>
            <div className="p-row two">
              {c.phone && <a className="p-btn ghost" href={`tel:${c.phone}`}>Call</a>}
              <button className="p-btn" onClick={() => setPicked(c)}>Request service</button>
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}

function RequestForm({ company, town, referral, referralCode, onBack, onDone }) {
  const [f, setF] = useState({ name: '', phone: '', address: '', town: town || '', tank: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('request_service', {
      p_company_id: company.id,
      p_full_name: f.name, p_phone: f.phone,
      p_address: f.address || null, p_town: f.town || null,
      p_tank_capacity: f.tank ? parseInt(f.tank, 10) : null,
      p_notes: f.notes || null,
      p_referral_code: referralCode || null,
    })
    setBusy(false)
    if (error) return setErr(error.message)
    onDone()
  }

  return (
    <div className="portal">
      <header className="p-top start">
        <Back onClick={onBack} />
        <h1 className="p-h1">Request service</h1>
      </header>
      <form className="p-main" onSubmit={submit}>
        <section className="p-card">
          <span className="p-eyebrow">Sending to</span>
          <span className="p-strong">{company.name}</span>
          {referral && (
            <span className="p-small">
              Recommended by {referral.referrer_first_name}
              {Number(referral.credit) > 0 && ` · you'll both get $${Number(referral.credit).toFixed(0)} off after your first delivery`}
            </span>
          )}
        </section>
        <label className="p-field"><span>Your name</span>
          <input required autoComplete="name" value={f.name} onChange={set('name')} /></label>
        <label className="p-field"><span>Phone</span>
          <input required type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} /></label>
        <label className="p-field"><span>Delivery address</span>
          <input required autoComplete="street-address" value={f.address} onChange={set('address')} /></label>
        <label className="p-field"><span>Town</span>
          <input value={f.town} onChange={set('town')} autoComplete="address-level2" /></label>
        <label className="p-field"><span>Tank size in gallons (if you know it)</span>
          <input inputMode="numeric" value={f.tank} onChange={(e) => setF({ ...f, tank: e.target.value.replace(/\D/g, '') })} /></label>
        <label className="p-field"><span>Anything they should know?</span>
          <input value={f.notes} onChange={set('notes')} placeholder="Gate, road, how soon you need water…" /></label>
        {err && <p className="p-err">{err}</p>}
        <button className="p-btn" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
        <p className="p-muted p-small">{company.name} will reach out to confirm and set up your account. Nothing is charged here.</p>
      </form>
    </div>
  )
}

function AreaForm({ town, onBack }) {
  const [f, setF] = useState({ town: town || '', address: '', name: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('leave_area_request', {
      p_town: f.town, p_address: f.address || null, p_full_name: f.name || null, p_phone: f.phone || null,
    })
    setBusy(false)
    if (error) return setErr(error.message)
    setDone(true)
  }

  return (
    <div className="portal">
      <header className="p-top start">
        <Back onClick={onBack} />
        <h1 className="p-h1">Not in your area yet</h1>
      </header>
      {done ? (
        <main className="p-main">
          <section className="p-card">
            <p className="p-strong">Thanks, we've got it.</p>
            <p className="p-muted">We're working on bringing a hauler to {f.town}. We'll reach out when one is available.</p>
          </section>
          <button className="p-btn ghost" onClick={onBack}>Back</button>
        </main>
      ) : (
        <form className="p-main" onSubmit={submit}>
          <p className="p-muted">Tell us where you need water and we'll let you know when a hauler serves your area.</p>
          <label className="p-field"><span>Town</span>
            <input required value={f.town} onChange={set('town')} autoComplete="address-level2" /></label>
          <label className="p-field"><span>Address (optional)</span>
            <input value={f.address} onChange={set('address')} autoComplete="street-address" /></label>
          <label className="p-field"><span>Name (optional)</span>
            <input value={f.name} onChange={set('name')} autoComplete="name" /></label>
          <label className="p-field"><span>Phone (optional)</span>
            <input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" /></label>
          {err && <p className="p-err">{err}</p>}
          <button className="p-btn" disabled={busy}>{busy ? 'Sending…' : 'Notify me'}</button>
        </form>
      )}
    </div>
  )
}

export function RequestStatus({ request, onChanged }) {
  const [busy, setBusy] = useState(false)

  async function withdraw() {
    if (!window.confirm(`Withdraw your request to ${request.company_name}?`)) return
    setBusy(true)
    await supabase.rpc('withdraw_service_request', { p_id: request.id })
    setBusy(false)
    onChanged()
  }

  return (
    <div className="portal">
      <header className="p-top">
        <h1 className="p-h1">Request sent</h1>
        <button className="p-link" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>
      <main className="p-main">
        <section className="p-card">
          <span className="p-pill blue">{request.status === 'contacted' ? 'In touch' : 'Waiting to hear back'}</span>
          <span className="p-strong">{request.company_name}</span>
          <span className="p-muted">
            They'll contact you to confirm delivery details. Once they set up your account, this screen turns into your tank and ordering page.
          </span>
        </section>
        {request.company_phone && <a className="p-btn ghost" href={`tel:${request.company_phone}`}>Call {request.company_name}</a>}
        <button className="p-link left" disabled={busy} onClick={withdraw}>Withdraw and choose a different hauler</button>
      </main>
    </div>
  )
}
