import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { pendingInvite, clearPendingInvite, pendingReferral } from '../invite'
import FindWater, { RequestStatus } from './FindWater'

const OPEN = ['new', 'contacted']

export default function Onboarding({ email, onReady }) {
  const code = pendingInvite()
  const refCode = pendingReferral()
  const [mode, setMode] = useState(code ? 'join' : refCode ? 'water' : null) // 'create' | 'join' | 'water'
  const [requests, setRequests] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [f, setF] = useState({ company: '', name: '', phone: '', area: '', code: code || '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const loadRequests = useCallback(async () => {
    const { data } = await supabase.rpc('my_service_requests')
    setRequests(data || [])
  }, [])
  useEffect(() => { loadRequests() }, [loadRequests])

  // A hauler accepting the request turns this account into a customer: check now and then
  useEffect(() => {
    const open = (requests || []).some((r) => OPEN.includes(r.status))
    if (!open) return
    const t = setInterval(onReady, 30000)
    const onVisible = () => { if (document.visibilityState === 'visible') { onReady(); loadRequests() } }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible) }
  }, [requests, onReady, loadRequests])

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    if (mode === 'create') {
      const { data: cid, error } = await supabase.rpc('create_company', { p_name: f.company, p_phone: f.phone, p_service_area: f.area, p_full_name: f.name })
      if (error) { setBusy(false); return setErr(error.message) }
      const towns = f.area.split(',').map((t) => t.trim()).filter(Boolean)
      if (towns.length) await supabase.from('companies').update({ service_towns: towns }).eq('id', cid)
    } else {
      const { error } = await supabase.rpc('accept_invite', { p_code: f.code, p_full_name: f.name })
      if (error) { setBusy(false); return setErr(error.message) }
    }
    setBusy(false)
    clearPendingInvite()
    onReady()
  }

  if (requests === null) return <div className="screen center muted">Loading…</div>

  const open = requests.find((r) => OPEN.includes(r.status))
  if (open) return <RequestStatus request={open} onChanged={loadRequests} />

  if (mode === 'water') {
    return <FindWater onBack={() => setMode(null)} onSent={loadRequests} />
  }

  if (!mode) {
    const declined = requests.find((r) => r.status === 'declined')
    return (
      <div className="screen">
        <header className="top">
          <span className="eyebrow">Signed in as {email}</span>
          <h1>Welcome to TankFull</h1>
        </header>
        <main className="stack pad">
          {declined && (
            <p className="note">{declined.company_name} couldn't take your request. Try another hauler below.</p>
          )}
          <button className="choice big" onClick={() => setMode('water')}>
            <span className="strong">I need water delivered</span>
            <span className="small sub">Find a hauler in your area and request service</span>
          </button>
          <button className="choice big" onClick={() => setMode('join')}>
            <span className="strong">I have an invite code</span>
            <span className="small sub">From your water company, or from your employer if you drive or dispatch</span>
          </button>
          <button className="choice big" onClick={() => setMode('create')}>
            <span className="strong">I run a water hauling company</span>
            <span className="small sub">Set up your company, trucks and team</span>
          </button>
          <button className="btn link" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </main>
      </div>
    )
  }

  return (
    <div className="screen">
      <header className="top row">
        <button className="icon" aria-label="Back" onClick={() => { setMode(null); setErr('') }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1>{mode === 'create' ? 'Set up your company' : 'Enter your invite code'}</h1>
      </header>
      <form className="stack pad" onSubmit={submit}>
        {mode === 'create' ? (
          <>
            <label className="field"><span>Company name</span>
              <input required value={f.company} onChange={set('company')} placeholder="e.g. Smith Water Hauling" /></label>
            <label className="field"><span>Your name</span>
              <input required value={f.name} onChange={set('name')} autoComplete="name" /></label>
            <label className="field"><span>Business phone</span>
              <input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" /></label>
            <label className="field"><span>Towns you deliver to</span>
              <input value={f.area} onChange={set('area')} placeholder="e.g. Chino Valley, Paulden, Dewey-Humboldt" /></label>
          </>
        ) : (
          <>
            <label className="field"><span>Invite code</span>
              <input required value={f.code} onChange={set('code')} autoCapitalize="characters" autoComplete="off" placeholder="8-character code" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }} /></label>
            <label className="field"><span>Your name</span>
              <input required value={f.name} onChange={set('name')} autoComplete="name" /></label>
          </>
        )}
        {err && <p className="note">{err}</p>}
        <button className="btn primary big" disabled={busy}>
          {busy ? 'One sec…' : mode === 'create' ? 'Create company' : 'Join'}
        </button>
      </form>
    </div>
  )
}
