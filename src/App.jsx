import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import Login from './screens/Login'
import Onboarding from './screens/Onboarding'
import RouteScreen from './screens/Route'
import StopScreen from './screens/Stop'
import FillLogScreen from './screens/FillLog'
import CompanyScreen from './screens/Company'
import Board from './screens/Board'
import Customers from './screens/Customers'
import ManagerNav from './components/ManagerNav'
import { Logo } from './components/Gauges'
import CustomerPortal from './screens/CustomerPortal'
import Leads from './screens/Leads'
import { clearPendingInvite, clearPendingReferral } from './invite'
import { useLive } from './supabase'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(undefined) // undefined = loading, null = no company yet
  const [ready, setReady] = useState(false)
  const [view, setView] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const loadProfile = useCallback(async () => {
    if (!session) { setProfile(undefined); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, company_id, role, full_name')
      .eq('id', session.user.id)
      .maybeSingle()
    setProfile(data ?? null)
  }, [session])

  useEffect(() => { loadProfile() }, [loadProfile])

  if (!ready) return <Splash />
  if (!session) return <Login />
  if (profile === undefined) return <Splash />
  if (profile === null) return <Onboarding email={session.user.email} onReady={loadProfile} />
  // Already in a company: a leftover join link no longer applies
  clearPendingInvite()
  clearPendingReferral()

  if (profile.role === 'customer') return <CustomerPortal profile={profile} />

  const isManager = profile.role === 'owner' || profile.role === 'dispatcher'
  const current = view || { name: isManager ? 'board' : 'route' }
  const go = (name, params = {}) => setView({ name, ...params })
  const home = () => go(isManager ? 'board' : 'route')

  // Full-screen driver task screens (no nav)
  if (current.name === 'stop') return <StopScreen profile={profile} stop={current.stop} truck={current.truck} onDone={() => go('route')} />
  if (current.name === 'fill') return <FillLogScreen profile={profile} truck={current.truck} onDone={() => go('route')} />

  if (!isManager) {
    return <RouteScreen profile={profile} go={go} />
  }

  return <ManagerShell profile={profile} current={current} go={go} home={home} />
}

function ManagerShell({ profile, current, go, home }) {
  const [newLeads, setNewLeads] = useState(0)
  const countLeads = useCallback(async () => {
    const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new')
    setNewLeads(count || 0)
  }, [])
  useEffect(() => { countLeads() }, [countLeads])
  useLive('lead-count', ['leads'], countLeads)

  let body
  if (current.name === 'customers') body = <Customers />
  else if (current.name === 'leads') body = <Leads goCustomers={() => go('customers')} />
  else if (current.name === 'route') body = <RouteScreen profile={profile} go={go} />
  else if (current.name === 'company') body = <CompanyScreen profile={profile} onBack={home} />
  else body = <Board profile={profile} />

  return (
    <div className="mshell">
      <ManagerNav current={current.name} go={go} newLeads={newLeads} name={profile.full_name} />
      {body}
    </div>
  )
}

function Splash() {
  return (
    <div className="screen center" aria-busy="true">
      <Logo size={56} />
      <span className="muted">Loading…</span>
    </div>
  )
}
