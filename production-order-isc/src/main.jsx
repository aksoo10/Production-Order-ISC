import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

async function clearLegacyAppCaches() {
  if (!('serviceWorker' in navigator) && !('caches' in window)) return false;

  const wasControlled = Boolean(navigator.serviceWorker?.controller);
  const registrations = 'serviceWorker' in navigator
    ? await navigator.serviceWorker.getRegistrations()
    : [];
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }

  if (!wasControlled) return false;
  try {
    if (sessionStorage.getItem('isc_service_worker_cache_cleared') === '1') {
      sessionStorage.removeItem('isc_service_worker_cache_cleared');
      return false;
    }
    sessionStorage.setItem('isc_service_worker_cache_cleared', '1');
    window.location.reload();
    return true;
  } catch (error) {
    console.error('[cache cleanup] Unable to reload after unregistering the service worker.', error);
    return false;
  }
}

clearLegacyAppCaches()
  .then((reloaded) => {
    if (!reloaded) {
      createRoot(document.getElementById('root')).render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
    }
  })
  .catch((error) => {
    console.error('[cache cleanup] Failed to clear old application caches.', error);
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
