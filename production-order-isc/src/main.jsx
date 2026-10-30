import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary
      onReset={() => {
        try {
          if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.setItem('isc_production_active_tab', 'scanner');
          }
          window.location.reload();
        } catch {
          window.location.reload();
        }
      }}
    >
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

async function clearLegacyAppCaches() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }
  } catch (error) {
    console.error('[cache cleanup] Failed to clear legacy app caches.', error);
  }
}

void clearLegacyAppCaches();
