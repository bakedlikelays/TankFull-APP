// Preview-only stand-in for src/supabase.js: same exports, sample data, no network.
// Pick who you are with ?as=owner | driver | customer | new | out
import { useEffect, useRef } from 'react'

const as = new URLSearchParams(location.search).get('as') || 'owner'
const CO = 'c0'
export function todayLocal(tz = 'America/Phoenix') {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
}
const today = todayLocal()
const iso = (h, m = 0) => new Date(`${today}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-07:00`).toISOString()
const plus = (d) => { const x = new Date(`${today}T12:00:00`); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10) }

const profiles = {
  owner: { id: 'u1', company_id: CO, role: 'owner', full_name: 'Dale Reyes' },
  driver: { id: 'u2', company_id: CO, role: 'driver', full_name: 'Marco Ruiz' },
  customer: { id: 'u9', company_id: CO, role: 'customer', full_name: 'Linda Hart' },
}

const props = {
  p1: { id: 'p1', address: '4410 N Bighorn Trl, Chino Valley', gate_code: '4471', access_notes: 'Second gate past the cattle guard. Tank is behind the red barn, fill port faces east.', dogs_on_property: true, hose_length_ft: 60, road_condition: 'Dirt, 4x4 after rain' },
  p2: { id: 'p2', address: '1290 W Road 3 N, Chino Valley', gate_code: null, access_notes: null, dogs_on_property: false, hose_length_ft: 40, road_condition: 'Graded dirt' },
  p3: { id: 'p3', address: '9875 E Cienega Dr, Dewey-Humboldt', gate_code: '1960', access_notes: 'Call when at the gate.', dogs_on_property: false, hose_length_ft: 100, road_condition: null },
  p4: { id: 'p4', address: '22 Juniper Wash Rd, Paulden', gate_code: null, access_notes: null, dogs_on_property: true, hose_length_ft: null, road_condition: 'Washboard' },
  p6: { id: 'p6', address: '18 Antelope Spring Rd, Paulden', gate_code: null, access_notes: null, dogs_on_property: false, hose_length_ft: 50, road_condition: null },
  p7: { id: 'p7', address: '5560 N Yavapai Ranch Rd, Chino Valley', gate_code: '2210', access_notes: null, dogs_on_property: true, hose_length_ft: 80, road_condition: 'Dirt' },
  p5: { id: 'p5', address: '715 Granite Mesa Way, Prescott Valley', gate_code: '0808', access_notes: null, dogs_on_property: false, hose_length_ft: 30, road_condition: null },
}
const cust = {
  k1: { id: 'k1', full_name: 'Linda Hart', phone: '928-555-0142' },
  k2: { id: 'k2', full_name: 'Tom & Becky Alvarez', phone: '928-555-0187' },
  k3: { id: 'k3', full_name: 'Gene Whitaker', phone: '928-555-0110' },
  k4: { id: 'k4', full_name: 'Sara Lindqvist', phone: '928-555-0163' },
  k5: { id: 'k5', full_name: 'Ray Begay', phone: '928-555-0199' },
  k6: { id: 'k6', full_name: 'Wes Holloway', phone: '928-555-0131' },
  k7: { id: 'k7', full_name: 'Maria Chee', phone: '928-555-0158' },
}

const order = (id, k, p, gal, status, extra = {}) => ({ id, status, requested_gallons: gal, is_urgent: false, window_start: today, customer_notes: null, tank_id: 't' + k.slice(1), customer: cust[k], property: props[p], delivery: [], ...extra })
const stops = [
  { id: 's1', seq: 1, removed: false, order: order('o1', 'k2', 'p2', 2000, 'delivered', { delivery: [{ gallons_delivered: 2000, delivered_at: iso(8, 12) }] }) },
  { id: 's2', seq: 2, removed: false, order: order('o2', 'k1', 'p1', 2500, 'en_route') },
  { id: 's3', seq: 3, removed: false, order: order('o3', 'k3', 'p3', 1500, 'scheduled', { is_urgent: true }) },
  { id: 's4', seq: 4, removed: false, order: order('o4', 'k5', 'p5', 2000, 'scheduled') },
]
const truck = { id: 'tr1', name: 'Truck 2 · Kenworth', capacity_gal: 4000 }

const T = {
  routes: [{ id: 'r1', status: 'active', route_date: today, driver_id: 'u2', truck_id: 'tr1', truck, route_stops: stops, created_at: iso(6) }],
  trucks: [truck, { id: 'tr2', name: 'Truck 3 · Peterbilt', capacity_gal: 3500, potable_permit_no: 'AZ-PW-3312', permit_expires_on: plus(40) }].map((t) => ({ potable_permit_no: 'AZ-PW-2104', permit_expires_on: plus(200), active: true, ...t })),
  profiles: [profiles.owner, profiles.driver, { id: 'u3', role: 'dispatcher', full_name: 'Kim Ostrander' }],
  fill_logs: [{ gallons_loaded: 4000 }, { gallons_loaded: 1500 }],
  deliveries: [{ gallons_delivered: 2000 }],
  fill_stations: [
    { id: 'fs1', name: 'Chino Valley standpipe', hours_note: 'Open 24/7 · card reader', cost_per_1000gal: 6.5 },
    { id: 'fs2', name: 'Prescott Valley Water Co. hydrant', hours_note: 'Mon–Sat 6am–6pm', cost_per_1000gal: 8 },
  ],
  tank_forecast: [
    { tank_id: 't1', capacity_gal: 2500, est_level_gal: 640, est_days_left: 4.3 },
    { tank_id: 't2', capacity_gal: 3000, est_level_gal: 2800, est_days_left: 18.6 },
    { tank_id: 't3', capacity_gal: 1500, est_level_gal: 90, est_days_left: 0.6 },
    { tank_id: 't4', capacity_gal: 2500, est_level_gal: 420, est_days_left: 2.4 },
    { tank_id: 't5', capacity_gal: 2000, est_level_gal: 1500, est_days_left: 10.0 },
    { tank_id: 't6', capacity_gal: 2500, est_level_gal: 260, est_days_left: 1.7 },
    { tank_id: 't7', capacity_gal: 3000, est_level_gal: 760, est_days_left: 3.8 },
  ],
  tanks: ['1', '2', '3', '4', '5', '6', '7'].map((n) => ({ id: 't' + n, property: { ...props['p' + n], customer: cust['k' + n] } })),
  orders: [
    order('o6', 'k4', 'p4', 2000, 'requested', { window_start: plus(1), customer_notes: 'Gate is unlocked till noon' }),
    order('o7', 'k3', 'p3', 1500, 'requested', { is_urgent: true, window_start: null }),
    ...stops.map((s) => s.order),
  ],
  customers: Object.values(cust).map((c, i) => ({
    ...c, email: i === 0 ? 'linda.hart@example.com' : null, profile_id: i === 0 ? 'u9' : null, referred_by_customer_id: i === 3 ? 'k1' : null,
    referral_code: 'LINDA25',
    properties: [{ ...props['p' + (i + 1)], tanks: [{ id: 't' + (i + 1), capacity_gal: [2500, 3000, 1500, 2500, 2000, 2500, 3000][i], est_daily_usage_gal: 150, last_fill_at: iso(7) }] }],
  })),
  companies: [{ id: CO, name: 'High Desert Water Hauling', phone: '928-555-0100', service_area: 'Chino Valley, Paulden, Dewey-Humboldt', service_towns: ['Chino Valley', 'Paulden', 'Dewey-Humboldt'], listed: true, about: 'Family-run potable water delivery since 2004.', price_from_per_1000: 95, min_gallons: 1000, show_pricing: true, referrals_enabled: true, referral_credit: 25 }],
  referral_credits: [{ id: 'rc1', amount: 25, kind: 'referrer', note: 'Referred Sara Lindqvist', created_at: iso(9) }],
  leads: [
    { id: 'l1', full_name: 'Jordan Pike', status: 'new', source: 'directory', phone: '928-555-0121', email: 'jpike@example.com', address: '3301 Pinon Rd', town: 'Paulden', tank_capacity: 2500, notes: 'Just bought the place, tank is empty.', created_at: new Date(Date.now() - 18 * 60000).toISOString(), updated_at: iso(9) },
    { id: 'l2', full_name: 'Ana Morales', status: 'contacted', source: 'referral', referred_by_customer_id: 'k1', promised_credit: 25, phone: '928-555-0175', email: null, address: null, town: 'Chino Valley', tank_capacity: null, notes: null, created_at: iso(7), updated_at: iso(8) },
    { id: 'l3', full_name: 'Pete Sandoval', status: 'converted', source: 'directory', updated_at: iso(6) },
  ],
}
if (as === 'customer') {
  T.customers = [T.customers[0]]
  T.tank_forecast = [T.tank_forecast[0]]
  T.orders = [{ ...stops[1].order, created_at: iso(7) }, { id: 'h1', status: 'delivered', requested_gallons: 2500, created_at: plus(-12), delivery: [{ gallons_delivered: 2450, delivered_at: plus(-12) + 'T15:00:00Z' }] }, { id: 'h2', status: 'delivered', requested_gallons: 2500, created_at: plus(-27), delivery: [{ gallons_delivered: 2500, delivered_at: plus(-27) + 'T15:00:00Z' }] }]
}

const RPC = {
  my_service_requests: [],
  directory_towns: ['Chino Valley', 'Dewey-Humboldt', 'Paulden', 'Prescott Valley'],
  directory_search: [{ company_id: CO, name: 'High Desert Water Hauling', about: 'Family-run potable water delivery since 2004.', price_from_per_1000: 95, min_gallons: 1000, show_pricing: true, phone: '928-555-0100' }],
  invite_preview: [], referral_preview: [], invite_customer: 'HT7K2Q9P',
}

function builder(table) {
  let rows = (T[table] || []).slice()
  let mode = 'many'
  let count = false
  const b = {
    select(_c, opts) { if (opts?.count) count = true; return b },
    eq(c, v) { rows = rows.filter((r) => !(c in r) || r[c] === v); return b },
    neq(c, v) { rows = rows.filter((r) => !(c in r) || r[c] !== v); return b },
    in(c, vs) { rows = rows.filter((r) => !(c in r) || vs.includes(r[c])); return b },
    or() { return b }, order() { return b }, gte() { return b }, lte() { return b }, ilike() { return b }, limit() { return b },
    update() { return b }, insert() { return b }, delete() { return b }, upsert() { return b },
    maybeSingle() { mode = 'one'; return b }, single() { mode = 'one'; return b },
    then(res, rej) {
      const data = mode === 'one' ? rows[0] || null : rows
      return Promise.resolve({ data, error: null, count: count ? rows.length : null }).then(res, rej)
    },
  }
  return b
}

const session = as === 'out' ? null : { user: { id: (profiles[as] || { id: 'u0' }).id, email: 'dale@highdesertwater.com' } }
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => {}, signInWithPassword: async () => ({ data: {}, error: null }), signUp: async () => ({ data: {}, error: null }),
  },
  from: (t) => (t === 'profiles' && !T.__teamQuery ? profileBuilder() : builder(t)),
  rpc: async (n) => ({ data: RPC[n] ?? null, error: null }),
  channel: () => ({ on() { return this }, subscribe() { return this } }),
  removeChannel() {},
  storage: { from: () => ({ upload: async () => ({ error: null }) }) },
}
// App loads "my profile" with .eq('id', me).maybeSingle(); the board loads the team list
function profileBuilder() {
  const b = builder('profiles')
  const me = profiles[as] || null
  const one = b.maybeSingle
  b.maybeSingle = () => { b.then = (res) => Promise.resolve({ data: me, error: null }).then(res); return b }
  void one
  return b
}

export const fmt = (n) => Number(n || 0).toLocaleString('en-US')
export async function uploadPhoto() { return null }
export function useLive(_n, _t, onChange) { const r = useRef(onChange); r.current = onChange; useEffect(() => {}, []) }
