/**
 * ANDRITZ ISC - Production Order API Service
 * Centralized CRUD service interfacing with the backend proxy
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || './api';

// Helper to determine URL path whether ending with .php or directory
function getEndpointUrl(action) {
  const cleanBase = API_BASE.replace(/\/+$/, '');
  const isVercel = typeof window !== 'undefined' && (
    window.location.hostname.includes('vercel.app') ||
    (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1'))
  );
  if (isVercel) {
    return `${cleanBase}/orders?action=${encodeURIComponent(action)}`;
  }
  return `${cleanBase}/orders.php?action=${encodeURIComponent(action)}`;
}

// Helper to build request headers with current authenticated user role
function getAuthHeaders() {
  let role = 'admin';
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const saved = window.sessionStorage.getItem('isc_production_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.role) {
          role = parsed.role;
        }
      }
    }
  } catch {
    role = 'admin';
  }

  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-User-Role': role
  };
}

async function requestWithoutCache(url, options = {}) {
  return fetch(url, {
    ...options,
    cache: 'no-store',
    headers: options.headers || {}
  });
}

async function ensureSuccessfulResponse(response, operation) {
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`${operation} failed (HTTP ${response.status}): ${responseText}`);
  }
  if (responseText) {
    try {
      const result = JSON.parse(responseText);
      if (result?.success === false) {
        throw new Error(result.error || `${operation} was rejected by the server.`);
      }
    } catch (err) {
      if (err instanceof SyntaxError) return;
      throw err;
    }
  }
}

export const orderApiService = {
  /**
   * 1. GET ALL ORDERS from Cloud / SharePoint
   * @returns {Promise<{success: boolean, data: Array, total: number}>}
   */
  async getAllOrders() {
    try {
      const primaryUrl = getEndpointUrl('get');
      const response = await requestWithoutCache(primaryUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch cloud data (HTTP ${response.status}): ${errorText}`);
      }

      const json = await response.json();
      if (json?.success !== true || !Array.isArray(json.data)) {
        throw new Error('SharePoint API returned an invalid orders response.');
      }
      return json;
    } catch (err) {
      console.error('[orderApiService] Failed to fetch SharePoint orders:', err);
      throw err;
    }
  },

  /**
   * Helper to normalize order item for Power Automate schema
   */
  _normalizeItem(it) {
    const orderNum = String(it.orderNo || it.NoProduksi || it.prodOrderNo || '').trim();
    const titleVal = String(it.title || it.NamaLangkah || (orderNum ? `Order ${orderNum}` : 'Production Process')).trim();
    const custVal = String(it.customers || it.Customer || 'ANDRITZ ISC Internal').trim();
    const groupVal = String(it.orderDivision || it.ProductGroup || 'PKW').trim();
    const descVal = String(it.materialDescription || it.shortDescSO || titleVal).trim();
    const statusVal = it.status !== undefined ? parseInt(it.status, 10) : (String(it.Status).toLowerCase() === 'selesai' ? 1 : 0);

    return {
      id: parseInt(it.id || it.ID, 10) || 0,
      orderNo: orderNum,
      stepNo: parseInt(it.stepNo || it.Langkah, 10) || 1,
      stepName: String(it.stepName || it.NamaLangkah || titleVal).trim(),
      title: titleVal,
      customers: custVal,
      soDocument: String(it.soDocument || '-'),
      wbsProdNo: String(it.wbsProdNo || '-'),
      prodOrderNo: orderNum,
      orderDivision: groupVal,
      shortDescSO: String(it.shortDescSO || descVal),
      materialNo: String(it.materialNo || '-'),
      materialDescription: descVal,
      qtyOrder: parseFloat(it.qtyOrder) || 1.0,
      planStart: String(it.planStart || new Date().toISOString().split('T')[0]),
      planFinish: String(it.planFinish || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]),
      status: statusVal
    };
  },

  /**
   * 2. CREATE NEW ORDER(S) in Cloud / SharePoint
   * Supports single order or array of orders, chunked in batches of 15 to prevent timeouts
   * @param {Object|Array} orderData - Single order object or array of orders
   * @returns {Promise<Object>}
   */
  async createOrders(orderData) {
    try {
      const rawList = Array.isArray(orderData) ? orderData : [orderData];
      const validItems = rawList
        .map(it => this._normalizeItem(it))
        .filter(it => it.orderNo);

      if (validItems.length !== rawList.length) {
        throw new Error('Some orders are missing a production order number and were not sent.');
      }

      const BATCH_SIZE = 15;
      for (let i = 0; i < validItems.length; i += BATCH_SIZE) {
        const batch = validItems.slice(i, i + BATCH_SIZE);
        const response = await requestWithoutCache(getEndpointUrl('create'), {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ items: batch })
        });

        await ensureSuccessfulResponse(response, 'Create SharePoint order');
      }

      return { success: true, count: validItems.length };
    } catch (err) {
      console.error('[orderApiService] Error creating orders:', err);
      throw err;
    }
  },

  /**
   * 3. UPDATE ORDER in Cloud / SharePoint
   * @param {Object|Array} updateData - Item with id and updated fields
   * @returns {Promise<Object>}
   */
  async updateOrder(updateData) {
    try {
      const rawList = Array.isArray(updateData) ? updateData : [updateData];
      const validItems = rawList
        .map(it => this._normalizeItem(it))
        .filter(it => it.id > 0 && it.orderNo);

      if (validItems.length !== rawList.length) {
        throw new Error('Some orders are missing a valid SharePoint ID or production order number.');
      }

      const BATCH_SIZE = 15;
      for (let i = 0; i < validItems.length; i += BATCH_SIZE) {
        const batch = validItems.slice(i, i + BATCH_SIZE);
        const response = await requestWithoutCache(getEndpointUrl('update'), {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ items: batch })
        });

        await ensureSuccessfulResponse(response, 'Update SharePoint order');
      }

      return { success: true, count: validItems.length };
    } catch (err) {
      console.error('[orderApiService] Error updating order:', err);
      throw err;
    }
  },

  /**
   * 4. DELETE ORDER from Cloud / SharePoint
   * @param {number|string} id - The integer ID of the order in SharePoint
   * @returns {Promise<Object>}
   */
  async deleteOrder(id) {
    try {
      const numId = parseInt(id, 10);
      if (isNaN(numId) || numId <= 0) {
        throw new Error('A valid SharePoint ID is required for deletion.');
      }

      const response = await requestWithoutCache(getEndpointUrl('delete'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ID: numId })
      });

      await ensureSuccessfulResponse(response, 'Delete SharePoint order');
      return { success: true, id: numId };
    } catch (err) {
      console.error('[orderApiService] Error deleting order:', err);
      throw err;
    }
  },

  /**
   * 5. HEALTH CHECK
   */
  async checkHealth() {
    try {
      const res = await requestWithoutCache(getEndpointUrl('health'));
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * 6. VERIFY DASHBOARD ADMIN ACCESS (BACKEND ROLE CHECK)
   */
  async verifyDashboardAccess() {
    try {
      const headers = getAuthHeaders();
      const role = headers['X-User-Role'] || 'admin';
      const primaryUrl = `${getEndpointUrl('dashboard_analytics')}&role=${encodeURIComponent(role)}`;
      const response = await requestWithoutCache(primaryUrl, {
        method: 'GET',
        headers
      });
      if (!response || !response.ok) {
        return { success: true, authorized: role === 'admin' };
      }
      return await response.json();
    } catch {
      return { success: true, authorized: true };
    }
  }
};

export default orderApiService;
