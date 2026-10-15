import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { captureInviteFromUrl } from './invite'

captureInviteFromUrl()

createRoot(document.getElementById('root')).render(<App />)

// Installable app: register the service worker in production builds only
// (in dev it would cache files and hide your edits).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
