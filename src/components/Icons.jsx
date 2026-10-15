// Small stroke icons, 24px grid. Decorative by default; give the parent an accessible name.
const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
const I = (paths) => function Icon({ size = 22, ...rest }) {
  return <svg {...base} width={size} height={size} {...rest}>{paths}</svg>
}

export const Back = I(<path d="M15 18l-6-6 6-6" />)
export const Gear = I(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>)
export const Board = I(<><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="10" y="4" width="5" height="11" rx="1.5" /><rect x="17" y="4" width="4" height="7" rx="1.5" /></>)
export const Inbox = I(<><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z" /></>)
export const People = I(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.2A6.5 6.5 0 0 1 21.5 20" /></>)
export const Truck = I(<><path d="M2 6h11v10H2z" /><path d="M13 9h4.5l3.5 3.5V16h-8z" /><circle cx="6" cy="17.5" r="2" /><circle cx="17" cy="17.5" r="2" /></>)
export const Building = I(<><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" /><path d="M16 9h2a2 2 0 0 1 2 2v10M2 21h20M8 7h4M8 11h4M8 15h4" /></>)
export const Phone = I(<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />)
export const Chat = I(<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z" />)
export const Nav = I(<path d="M3 11 21 3l-8 18-2-8z" />)
export const Camera = I(<><path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="12" cy="13" r="3.5" /></>)
export const Check = I(<path d="M5 12.5 10 17.5 19.5 7" />)
export const Plus = I(<path d="M12 5v14M5 12h14" />)
export const Drop = I(<path d="M12 2.7S5 10.2 5 14.5a7 7 0 0 0 14 0C19 10.2 12 2.7 12 2.7z" />)
export const Gate = I(<><path d="M3 21V5M21 21V5M3 9h18M3 15h18" /><path d="m7 9 4 6M13 9l4 6" /></>)
export const Hose = I(<><path d="M4 20c0-5 4-5 8-5s8 0 8-5V4" /><path d="M17 4h6" /></>)
export const Dog = I(<><path d="M10 5.2 8 3 5 4l-2 4 3 1 1 3v8h3v-4h5v4h3v-7l2-3-1-3-3 1z" /></>)
export const Road = I(<><path d="M5 21 9 3M19 21 15 3" /><path d="M12 6v2M12 11v2M12 16v2" /></>)
export const Logout = I(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></>)
