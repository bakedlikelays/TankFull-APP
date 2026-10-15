import { useCallback, useEffect, useState } from 'react'
import { supabase, fmt } from '../supabase'
import { joinLink } from '../invite'

const ROLE_LABEL = { owner: 'Owner', dispatcher: 'Dispatcher', driver: 'Driver', customer: 'Customer' }

export default function CompanyScreen({ profile, onBack }) {
  const [tab, setTab] = useState('setup')
  const isOwner = profile.role === 'owner'

  return (
    <div className="screen">
      <header className="top">
        <div className="row">
          <button className="icon" aria-label="Back to route" onClick={onBack}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h1>Company</h1>
        </div>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'setup'} className={tab === 'setup' ? 'on' : ''} onClick={() => setTab('setup')}>Setup</button>
          <button role="tab" aria-selected={tab === 'team'} className={tab === 'team' ? 'on' : ''} onClick={() => setTab('team')}>Team</button>
        </div>
      </header>
      <main className="stack pad">
        {tab === 'setup' ? <Setup profile={profile} isOwner={isOwner} /> : <Team profile={profile} isOwner={isOwner} />}
      </main>
    </div>
  )
}

/* ---------------- Setup: company details, trucks, fill stations ---------------- */
function Setup({ profile, isOwner }) {
  const [company, setCompany] = useState(null)
  const [trucks, setTrucks] = useState([])
  const [stations, setStations] = useState([])
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const [c, t, s] = await Promise.all([
      supabase.from('companies')
        .select('id, name, phone, service_area, service_towns, listed, about, price_from_per_1000, min_gallons, show_pricing, referrals_enabled, referral_credit')
        .eq('id', profile.company_id).single(),
      supabase.from('trucks').select('id, name, capacity_gal, potable_permit_no, permit_expires_on').order('created_at'),
      supabase.from('fill_stations').select('id, name, cost_per_1000gal').order('created_at'),
    ])
    setCompany(c.data ? { ...c.data, townsText: (c.data.service_towns || []).join(', ') } : null)
    setTrucks(t.data || []); setStations(s.data || [])
  }, [profile.company_id])
  useEffect(() => { load() }, [load])

  const [saved, setSaved] = useState('')
  const flash = (which, error) => {
    setSaved(error ? `${which}:${error.message}` : `${which}:ok`)
    setTimeout(() => setSaved(''), 2500)
  }
  const label = (which, text) => (saved === `${which}:ok` ? 'Saved' : text)
  const errFor = (which) => (saved.startsWith(`${which}:`) && saved !== `${which}:ok` ? saved.slice(which.length + 1) : '')
  const upd = (k) => (e) => setCompany({ ...company, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function saveCompany(e) {
    e.preventDefault()
    const towns = company.townsText.split(',').map((t) => t.trim()).filter(Boolean)
    const { error } = await supabase.from('companies')
      .update({ name: company.name, phone: company.phone, service_towns: towns, service_area: towns.join(', ') })
      .eq('id', company.id)
    flash('details', error)
    setMsg('')
  }

  async function saveListing(e) {
    e.preventDefault()
    const num = (v) => (v === '' || v == null ? null : Number(v))
    const { error } = await supabase.from('companies').update({
      listed: company.listed, about: company.about || null,
      price_from_per_1000: num(company.price_from_per_1000), min_gallons: num(company.min_gallons),
      show_pricing: company.show_pricing,
    }).eq('id', company.id)
    flash('listing', error)
  }

  async function saveReferrals(e) {
    e.preventDefault()
    const { error } = await supabase.from('companies').update({
      referrals_enabled: company.referrals_enabled,
      referral_credit: Number(company.referral_credit || 0),
    }).eq('id', company.id)
    flash('referrals', error)
  }

  return (
    <>
      {company && (
        <form className="card dark-card" onSubmit={saveCompany}>
          <h2>Company details</h2>
          <label className="field"><span>Name</span>
            <input disabled={!isOwner} value={company.name || ''} onChange={(e) => setCompany({ ...company, name: e.target.value })} /></label>
          <div className="row two">
            <label className="field"><span>Phone</span>
              <input disabled={!isOwner} type="tel" value={company.phone || ''} onChange={(e) => setCompany({ ...company, phone: e.target.value })} /></label>
            <label className="field"><span>Towns you deliver to</span>
              <input disabled={!isOwner} value={company.townsText} onChange={upd('townsText')} placeholder="Chino Valley, Paulden" /></label>
          </div>
          {errFor('details') && <p className="note">{errFor('details')}</p>}
          {isOwner && <button className="btn outline">{msg || label('details', 'Save details')}</button>}
        </form>
      )}

      {company && (
        <form className="card dark-card" onSubmit={saveListing}>
          <h2>TankFull directory</h2>
          <p className="muted small">
            When listed, people looking for water in your towns can find you and send a service request. Requests show up under Leads. Your customers and data are never shown.
          </p>
          <label className="check">
            <input type="checkbox" disabled={!isOwner} checked={company.listed} onChange={upd('listed')} />
            <span>List my company in the directory</span>
          </label>
          {company.listed && (company.service_towns || []).length === 0 && (
            <p className="note">Add the towns you deliver to above, or nobody will find you.</p>
          )}
          <label className="field"><span>About (one or two lines)</span>
            <input disabled={!isOwner} value={company.about || ''} onChange={upd('about')} placeholder="Family owned since 2004. Potable water, same-week delivery." /></label>
          <div className="row two">
            <label className="field"><span>Starting price per 1,000 gal</span>
              <input disabled={!isOwner} inputMode="decimal" value={company.price_from_per_1000 ?? ''} onChange={(e) => setCompany({ ...company, price_from_per_1000: e.target.value.replace(/[^\d.]/g, '') })} /></label>
            <label className="field"><span>Minimum order (gal)</span>
              <input disabled={!isOwner} inputMode="numeric" value={company.min_gallons ?? ''} onChange={(e) => setCompany({ ...company, min_gallons: e.target.value.replace(/\D/g, '') })} /></label>
          </div>
          <label className="check">
            <input type="checkbox" disabled={!isOwner} checked={company.show_pricing} onChange={upd('show_pricing')} />
            <span>Show pricing in the directory</span>
          </label>
          {errFor('listing') && <p className="note">{errFor('listing')}</p>}
          {isOwner && <button className="btn outline">{label('listing', 'Save listing')}</button>}
        </form>
      )}

      {company && (
        <form className="card dark-card" onSubmit={saveReferrals}>
          <h2>Customer referrals</h2>
          <p className="muted small">
            Customers get a share link in their portal. When a friend they refer gets their first delivery, both get the credit below. The app tracks it; you take it off their bill.
          </p>
          <label className="check">
            <input type="checkbox" disabled={!isOwner} checked={company.referrals_enabled} onChange={upd('referrals_enabled')} />
            <span>Turn on referrals</span>
          </label>
          <label className="field inline"><span>Credit for each person ($)</span>
            <input disabled={!isOwner} inputMode="decimal" value={company.referral_credit ?? ''} style={{ maxWidth: 120 }}
              onChange={(e) => setCompany({ ...company, referral_credit: e.target.value.replace(/[^\d.]/g, '') })} /></label>
          {errFor('referrals') && <p className="note">{errFor('referrals')}</p>}
          {isOwner && <button className="btn outline">{label('referrals', 'Save referrals')}</button>}
        </form>
      )}

      <section className="card dark-card">
        <h2>Trucks</h2>
        {trucks.length === 0 && <p className="muted small">Add at least one truck so drivers can run routes and log fills.</p>}
        {trucks.map((t) => (
          <div key={t.id} className="line">
            <div className="grow">
              <span className="strong">{t.name}</span>
              <span className="small sub">
                {fmt(t.capacity_gal)} gal
                {t.potable_permit_no ? ` · Permit ${t.potable_permit_no}` : ''}
                {t.permit_expires_on ? ` · exp ${t.permit_expires_on}` : ''}
              </span>
            </div>
          </div>
        ))}
        <AddForm
          button="Add truck"
          fields={[
            { k: 'name', label: 'Truck name', required: true, placeholder: 'Truck 1' },
            { k: 'capacity_gal', label: 'Tank size (gal)', required: true, numeric: true },
            { k: 'potable_permit_no', label: 'Potable permit #' },
            { k: 'permit_expires_on', label: 'Permit expires', type: 'date' },
          ]}
          onSave={async (v) => {
            const { error } = await supabase.from('trucks').insert({
              company_id: profile.company_id, name: v.name, capacity_gal: parseInt(v.capacity_gal, 10),
              potable_permit_no: v.potable_permit_no || null, permit_expires_on: v.permit_expires_on || null,
            })
            if (!error) load()
            return error
          }}
        />
      </section>

      <section className="card dark-card">
        <h2>Fill stations</h2>
        {stations.length === 0 && <p className="muted small">Where your trucks load water. Drivers pick one when they log a fill.</p>}
        {stations.map((s) => (
          <div key={s.id} className="line">
            <div className="grow">
              <span className="strong">{s.name}</span>
              {s.cost_per_1000gal != null && <span className="small sub">${s.cost_per_1000gal} per 1,000 gal</span>}
            </div>
          </div>
        ))}
        <AddForm
          button="Add fill station"
          fields={[
            { k: 'name', label: 'Station name', required: true },
            { k: 'cost_per_1000gal', label: 'Cost per 1,000 gal', decimal: true },
          ]}
          onSave={async (v) => {
            const { error } = await supabase.from('fill_stations').insert({
              company_id: profile.company_id, name: v.name,
              cost_per_1000gal: v.cost_per_1000gal === '' || v.cost_per_1000gal == null ? null : Number(v.cost_per_1000gal),
            })
            if (!error) load()
            return error
          }}
        />
      </section>
    </>
  )
}

function AddForm({ button, fields, onSave }) {
  const [open, setOpen] = useState(false)
  const [v, setV] = useState({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (!open) return <button className="btn ghost" onClick={() => setOpen(true)}>+ {button}</button>

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    const error = await onSave(v)
    setBusy(false)
    if (error) return setErr(error.message)
    setV({}); setOpen(false)
  }

  return (
    <form className="stack tight" onSubmit={submit}>
      {fields.map((fl) => (
        <label key={fl.k} className="field"><span>{fl.label}</span>
          <input
            type={fl.type || 'text'}
            required={fl.required}
            placeholder={fl.placeholder}
            inputMode={fl.numeric ? 'numeric' : fl.decimal ? 'decimal' : undefined}
            value={v[fl.k] || ''}
            onChange={(e) => {
              let val = e.target.value
              if (fl.numeric) val = val.replace(/\D/g, '')
              if (fl.decimal) val = val.replace(/[^\d.]/g, '')
              setV({ ...v, [fl.k]: val })
            }}
          />
        </label>
      ))}
      {err && <p className="note">{err}</p>}
      <div className="row two">
        <button type="button" className="btn ghost" onClick={() => { setOpen(false); setErr('') }}>Cancel</button>
        <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}

/* ---------------- Team: members and invite codes ---------------- */
function Team({ profile, isOwner }) {
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [companyName, setCompanyName] = useState('')
  const [role, setRole] = useState('driver')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [fresh, setFresh] = useState(null)

  const load = useCallback(async () => {
    const now = new Date().toISOString()
    const [m, i, c] = await Promise.all([
      supabase.from('profiles').select('id, full_name, role').eq('company_id', profile.company_id).neq('role', 'customer').order('created_at'),
      supabase.from('invites').select('id, code, role, label, expires_at, reusable')
        .is('used_at', null).gt('expires_at', now).neq('role', 'customer').order('created_at', { ascending: false }),
      supabase.from('companies').select('name').eq('id', profile.company_id).single(),
    ])
    setMembers(m.data || []); setInvites(i.data || []); setCompanyName(c.data?.name || '')
  }, [profile.company_id])
  useEffect(() => { load() }, [load])

  async function createInvite(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    const { data, error } = await supabase.from('invites')
      .insert({ company_id: profile.company_id, role, label: label || null, created_by: profile.id })
      .select('id, code, role, label, expires_at, reusable').single()
    setBusy(false)
    if (error) return setErr(error.message)
    setLabel(''); setFresh(data); load()
  }

  async function revoke(id) {
    await supabase.from('invites').update({ expires_at: new Date().toISOString() }).eq('id', id)
    if (fresh?.id === id) setFresh(null)
    load()
  }

  const shareText = (inv) =>
    `You're invited to join ${companyName} on TankFull as a ${ROLE_LABEL[inv.role].toLowerCase()}. ` +
    `Tap to join: ${joinLink(inv.code)} (or enter code ${inv.code} after signing up).`

  async function share(inv) {
    const text = shareText(inv)
    if (navigator.share) {
      try { await navigator.share({ text }) } catch { /* user closed the share sheet */ }
    } else {
      try { await navigator.clipboard.writeText(text); setErr('Invite message copied') } catch { setErr(text) }
    }
  }

  return (
    <>
      <section className="card dark-card">
        <h2>Team</h2>
        {members.map((m) => (
          <div key={m.id} className="line">
            <div className="grow">
              <span className="strong">{m.full_name || 'Unnamed'}{m.id === profile.id ? ' (you)' : ''}</span>
              <span className="small sub">{ROLE_LABEL[m.role]}</span>
            </div>
          </div>
        ))}
      </section>

      <form className="card dark-card" onSubmit={createInvite}>
        <h2>Invite someone</h2>
        <div className="seg" role="radiogroup" aria-label="Role">
          <button type="button" role="radio" aria-checked={role === 'driver'} className={role === 'driver' ? 'on' : ''} onClick={() => setRole('driver')}>Driver</button>
          {isOwner && (
            <button type="button" role="radio" aria-checked={role === 'dispatcher'} className={role === 'dispatcher' ? 'on' : ''} onClick={() => setRole('dispatcher')}>Dispatcher</button>
          )}
        </div>
        <label className="field"><span>Their name (optional)</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="So you know whose code it is" /></label>
        {err && <p className="note">{err}</p>}
        <button className="btn primary" disabled={busy}>{busy ? 'Creating…' : 'Create invite code'}</button>

        {fresh && (
          <div className="code-box">
            <span className="small sub">Code for {fresh.label || ROLE_LABEL[fresh.role]}</span>
            <span className="code">{fresh.code}</span>
            <div className="row two" style={{ alignSelf: 'stretch' }}>
              <button type="button" className="btn outline" onClick={() => share(fresh)}>Send invite</button>
              <button type="button" className="btn ghost" onClick={async () => {
                try { await navigator.clipboard.writeText(joinLink(fresh.code)); setErr('Join link copied') } catch { setErr(joinLink(fresh.code)) }
              }}>Copy link</button>
            </div>
          </div>
        )}
      </form>

      {invites.length > 0 && (
        <section className="card dark-card">
          <h2>Open invites</h2>
          {invites.map((inv) => (
            <div key={inv.id} className="line">
              <div className="grow">
                <span className="strong mono">{inv.code}</span>
                <span className="small sub">
                  {ROLE_LABEL[inv.role]}{inv.label ? ` · ${inv.label}` : ''}
                  {inv.reusable ? ' · reusable' : ` · expires ${new Date(inv.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </span>
              </div>
              <button className="btn link small-btn" onClick={() => share(inv)}>Send</button>
              <button className="btn link small-btn danger" onClick={() => revoke(inv.id)}>Cancel</button>
            </div>
          ))}
        </section>
      )}
    </>
  )
}
