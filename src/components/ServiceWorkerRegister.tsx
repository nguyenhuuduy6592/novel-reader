'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') {
      return
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.info('[SW] Service worker registered:', registration.scope)
        })
        .catch((error) => {
          console.error('[SW] Service worker registration failed:', error)
        })
    }
  }, [])

  return null
}
