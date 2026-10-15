import { useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)

// Route dates are stored in the hauler's local day (Arizona, no DST).
export function todayLocal(tz = 'America/Phoenix') {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
}

export const fmt = (n) => Number(n || 0).toLocaleString('en-US')

export async function uploadPhoto(companyId, folder, file) {
  if (!file) return null
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${companyId}/${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('photos').upload(path, file, {
    contentType: file.type || 'image/jpeg',
  })
  if (error) throw error
  return path
}

// Re-run `onChange` (debounced) whenever rows change in any of `tables`.
// Supabase Realtime applies row-level security, so each viewer only hears about their own data.
export function useLive(name, tables, onChange) {
  const cb = useRef(onChange)
  cb.current = onChange
  const key = tables.join(',')

  useEffect(() => {
    let timer
    const fire = () => {
      clearTimeout(timer)
      timer = setTimeout(() => cb.current(), 400)
    }
    const channel = supabase.channel(`${name}-${Math.random().toString(36).slice(2)}`)
    key.split(',').forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, fire)
    })
    channel.subscribe()
    // also refresh when the app comes back to the foreground (phones pause sockets)
    const onVisible = () => { if (document.visibilityState === 'visible') fire() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [name, key])
}
