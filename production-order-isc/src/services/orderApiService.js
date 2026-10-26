/**
 * ANDRITZ ISC - Production Order API Service
 * Centralized CRUD service interfacing with the backend proxy
 */

import { INITIAL_ORDERS } from '../utils/initialData';

const API_BASE = import.meta.env.VITE_API_BASE_URL || './api';

// Helper to determine URL path whether ending with .php or directory
function getEndpointUrl(action) {
  const cleanBase = API_BASE.replace(/\/+$/, '');
  const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
  if (isVercel) {
    return `${cleanBase}/orders?action=${encodeURIComponent(action)}`;
  }
  return `${cleanBase}/orders.php?action=${encodeURIComponent(action)}`;
}

export const orderApiService = {
  /**
   * 1. GET ALL ORDERS from Cloud / SharePoint
   * @returns {Promise<{success: boolean, data: Array, total: number}>}
   */
  async getAllOrders() {
    try {
      const primaryUrl = getEndpointUrl('get');
      let response;
      try {
        response = await fetch(primaryUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
      } catch (networkErr) {
        // Try fallback endpoint without .php if failed
        const altUrl = primaryUrl.includes('.php')
          ? primaryUrl.replace('orders.php', 'orders')
          : primaryUrl.replace('/orders?', '/orders.php?');
        response = await fetch(altUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gagal mengambil data dari cloud (HTTP ${response.status}): ${errorText}`);
      }

      const json = await response.json();
      return json;
    } catch (err) {
      console.warn('[orderApiService] Error fetching orders, using baseline data:', err);
      if (Array.isArray(INITIAL_ORDERS) && INITIAL_ORDERS.length > 0) {
        return {
          success: true,
          total: INITIAL_ORDERS.length,
          data: INITIAL_ORDERS,
          fallback: true
        };
      }
      throw err;
    }
  },

  /**
   * 2. CREATE NEW ORDER(S) in Cloud / SharePoint
   * @param {Object|Array} orderData - Single order object or array of orders
   * @returns {Promise<Object>}
   */
  async createOrders(orderData) {
    try {
      const items = Array.isArray(orderData) ? orderData : [orderData];
      const response = await fetch(getEndpointUrl('create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ items })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gagal membuat order di cloud (HTTP ${response.status}): ${errorText}`);
      }

      const json = await response.json();
      return json;
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
      const items = Array.isArray(updateData) ? updateData : [updateData];
      const response = await fetch(getEndpointUrl('update'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ items })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gagal mengupdate order di cloud (HTTP ${response.status}): ${errorText}`);
      }

      const json = await response.json();
      return json;
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
        throw new Error(`ID order tidak valid untuk penghapusan: ${id}`);
      }

      const response = await fetch(getEndpointUrl('delete'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ ID: numId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gagal menghapus order di cloud (HTTP ${response.status}): ${errorText}`);
      }

      const json = await response.json();
      return json;
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
      const res = await fetch(getEndpointUrl('health'));
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

export default orderApiService;
