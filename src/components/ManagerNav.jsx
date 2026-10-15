const TABS = [
  { k: 'board', label: 'Board' },
  { k: 'leads', label: 'Leads' },
  { k: 'customers', label: 'Customers' },
  { k: 'route', label: 'My route' },
  { k: 'company', label: 'Company' },
]

export default function ManagerNav({ current, go, newLeads = 0 }) {
  return (
    <nav className="mnav" aria-label="Main">
      <span className="brand">TankFull</span>
      <div className="mnav-tabs">
        {TABS.map((t) => (
          <button key={t.k} className={current === t.k ? 'on' : ''} aria-current={current === t.k ? 'page' : undefined} onClick={() => go(t.k)}>
            {t.label}
            {t.k === 'leads' && newLeads > 0 && <span className="badge" aria-label={`${newLeads} new`}>{newLeads}</span>}
          </button>
        ))}
      </div>
    </nav>
  )
}
