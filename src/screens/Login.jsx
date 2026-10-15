import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { pendingInvite, pendingReferral } from '../invite'

const ROLE_WORD = { customer: 'a customer', driver: 'a driver', dispatcher: 'a dispatcher' }

export default function Login() {
  const code = pendingInvite()
  const refCode = pendingReferral()
  const [invite, setInvite] = useState(null)
  const [referral, setReferral] = useState(null)
  const [mode, setMode] = useState(code || refCode ? 'signup' : 'signin')

  useEffect(() => {
    if (!refCode) return
    supabase.rpc('referral_preview', { p_code: refCode }).then(({ data }) => setReferral(data?.[0] || null))
  }, [refCode])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  // Show who the invite is from, without needing an account yet
  useEffect(() => {
    if (!code) return
    supabase.rpc('invite_preview', { p_code: code }).then(({ data }) => setInvite(data?.[0] || null))
  }, [code])

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setMsg('')
    const { data, error } = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email, password,
          // bring them back to this app (not Supabase's default site URL) after confirming
          options: { emailRedirectTo: window.location.origin },
        })
    setBusy(false)
    if (error) return setMsg(error.message)
    if (mode === 'signup' && !data.session) setMsg('Check your email for a confirmation link, then come back and sign in.')
  }

  return (
    <div className="screen">
      <header className="top login-top">
        <img src="/icons/icon-192.png" alt="" width="56" height="56" className="login-icon" />
        <h1>TankFull</h1>
        <span className="eyebrow">For water haulers, their drivers and customers</span>
      </header>
      <form className="stack pad" onSubmit={submit}>
        {invite && (
          <div className="invite-banner">
            <span className="strong">You're invited to join {invite.company_name}</span>
            <span className="small">as {ROLE_WORD[invite.role] || invite.role}. {mode === 'signup' ? 'Create an account to accept.' : 'Sign in to accept.'}</span>
          </div>
        )}
        {referral && (
          <div className="invite-banner">
            <span className="strong">{referral.referrer_first_name} recommends {referral.company_name}</span>
            <span className="small">
              Create an account to request water delivery.
              {Number(referral.credit) > 0 && ` You'll both get $${Number(referral.credit).toFixed(0)} off after your first delivery.`}
            </span>
          </div>
        )}
        {code && !invite && (
          <div className="invite-banner">
            <span className="strong">Invite code {code}</span>
            <span className="small">Create an account or sign in, and we'll apply it.</span>
          </div>
        )}
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {msg && <p className="note">{msg}</p>}
        <button className="btn primary big" disabled={busy}>
          {busy ? 'One sec…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" className="btn link" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMsg('') }}>
          {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
