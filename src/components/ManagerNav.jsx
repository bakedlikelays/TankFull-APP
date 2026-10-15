import { Logo } from './Gauges'
import { Board, Inbox, People, Truck, Building } from './Icons'

const TABS = [
  { k: 'board', label: 'Board', Icon: Board },
  { k: 'leads', label: 'Leads', Icon: Inbox },
  { k: 'customers', label: 'Customers', Icon: People },
  { k: 'route', label: 'My route', Icon: Truck },
  { k: 'company', label: 'Company', Icon: Building },
]

export default function ManagerNav({ current, go, newLeads = 0, name }) {
  return (
    <nav className="mnav" aria-label="Main">
      <span className="brand"><Logo size={30} />TankFull</span>
      <div className="mnav-tabs">
        {TABS.map(({ k, label, Icon }) => (
          <button key={k} className={current === k ? 'on' : ''} aria-current={current === k ? 'page' : undefined} onClick={() => go(k)}>
            <Icon size={20} />
            <span>{label}</span>
            {k === 'leads' && newLeads > 0 && <span className="badge" aria-label={`${newLeads} new`}>{newLeads}</span>}
          </button>
        ))}
      </div>
      {name && <span className="mnav-user">{name}</span>}
    </nav>
  )
}
