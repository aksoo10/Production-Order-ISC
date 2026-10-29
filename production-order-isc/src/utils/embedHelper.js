/**
 * ANDRITZ ISC - SharePoint & Iframe Embedding Integration Helper
 * Provides iframe detection, SharePoint message passing, URL parameter handling,
 * and responsive layout adaptation.
 */

/**
 * Determines whether the current window is embedded within an iframe (such as SharePoint Embed Web Part)
 * or explicitly instructed via URL parameter (?embed=true, ?sp=1, ?sharepoint=true).
 * @returns {boolean}
 */
export function isIframeEmbedded() {
  if (typeof window === 'undefined') return false;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (
      urlParams.get('embed') === 'true' ||
      urlParams.get('embed') === '1' ||
      urlParams.get('sharepoint') === 'true' ||
      urlParams.get('sp') === '1'
    ) {
      return true;
    }
  } catch {
    // URL parsing fallback
  }

  try {
    // Cross-origin iframes in SharePoint will return true or throw an error on window.top
    return window.self !== window.top;
  } catch {
    // Accessing window.top across different origins threw DOMException: definitely inside cross-origin iframe!
    return true;
  }
}

/**
 * Extracts embedding and deep-linking configuration from URL query parameters.
 * Allows SharePoint page authors to customize views per page.
 * Example: https://app-url/?embed=true&tab=tracker&group=PKW&sidebar=collapsed
 */
export function getEmbedConfig() {
  if (typeof window === 'undefined') {
    return {
      isEmbedded: false,
      tab: null,
      group: null,
      compact: false,
      sidebar: null,
      operator: null,
      order: null
    };
  }

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const isEmbedded = isIframeEmbedded();

    return {
      isEmbedded,
      tab: urlParams.get('tab'),
      group: urlParams.get('group'),
      compact: urlParams.get('compact') === 'true' || urlParams.get('compact') === '1',
      sidebar: urlParams.get('sidebar'),
      operator: urlParams.get('operator'),
      order: urlParams.get('order') || urlParams.get('orderno')
    };
  } catch {
    return {
      isEmbedded: isIframeEmbedded(),
      tab: null,
      group: null,
      compact: false,
      sidebar: null,
      operator: null,
      order: null
    };
  }
}

/**
 * Dispatches the current content height to the parent window (SharePoint host) via postMessage.
 * This enables responsive auto-resizing in SharePoint Embed web parts or custom wrapper scripts.
 * @param {number} extraPadding Additional safety padding in pixels (default: 24)
 */
export function notifyParentFrameHeight(extraPadding = 24) {
  if (typeof window === 'undefined' || !isIframeEmbedded()) return;

  try {
    const body = document.body;
    const html = document.documentElement;
    const root = document.getElementById('root');

    const calculatedHeight = Math.max(
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0,
      html ? html.clientHeight : 0,
      html ? html.scrollHeight : 0,
      html ? html.offsetHeight : 0,
      root ? root.scrollHeight : 0
    ) + extraPadding;

    const payload = {
      type: 'set-iframe-height',
      sender: 'andritz-isc-production-order',
      height: calculatedHeight,
      timestamp: Date.now()
    };

    window.parent.postMessage(payload, '*');
    // Also send standard alternate formats supported by various SharePoint SPFx wrapper parts
    window.parent.postMessage({ frameHeight: calculatedHeight }, '*');
    window.parent.postMessage({ resizeHeight: calculatedHeight }, '*');
  } catch {
    // Cross-origin or sandbox restrictions might ignore postMessage
  }
}

/**
 * Opens the current application in a clean, standalone browser tab (popping out of SharePoint).
 */
export function openInStandaloneTab() {
  if (typeof window === 'undefined') return;

  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('embed');
    url.searchParams.delete('sp');
    url.searchParams.delete('sharepoint');
    url.searchParams.delete('compact');
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  } catch {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  }
}

