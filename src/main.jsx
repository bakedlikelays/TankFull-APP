import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
// Fonts are bundled with the app (no Google request, and they work offline as a PWA)
import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-600.css'
import '@fontsource/barlow/latin-700.css'
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/barlow-condensed/latin-800.css'
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
