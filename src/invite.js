// Join links:     https://<app>/join/AB12CD34  (team or customer-portal invite)
// Referral links: https://<app>/r/AB12CD34     (a customer referring a friend)
// Codes are remembered on this device until used, so they survive creating an
// account and coming back from the email-confirmation link.
const INVITE = 'tankfull.pendingInvite'
const REFERRAL = 'tankfull.pendingReferral'

const get = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const set = (k, v) => { try { localStorage.setItem(k, v) } catch { /* storage blocked */ } }
const del = (k) => { try { localStorage.removeItem(k) } catch { /* ignore */ } }

export function captureInviteFromUrl() {
  const path = window.location.pathname
  const join = path.match(/^\/join\/([A-Za-z0-9]{4,16})\/?$/)
  const ref = path.match(/^\/r\/([A-Za-z0-9]{4,16})\/?$/)
  if (join) { set(INVITE, join[1].toUpperCase()); del(REFERRAL) }
  if (ref) { set(REFERRAL, ref[1].toUpperCase()); del(INVITE) }
  if (join || ref) window.history.replaceState(null, '', '/') // tidy URL
}

export const pendingInvite = () => get(INVITE)
export const clearPendingInvite = () => del(INVITE)
export const pendingReferral = () => get(REFERRAL)
export const clearPendingReferral = () => del(REFERRAL)

export const joinLink = (code) => `${window.location.origin}/join/${code}`
export const referralLink = (code) => `${window.location.origin}/r/${code}`
