import React, { useState, useEffect, useMemo, useRef } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoginView from './components/LoginView';
import ScannerView from './components/views/ScannerView';
import OrdersListView from './components/views/OrdersListView';
import DashboardChartView from './components/views/DashboardChartView';
import ProgressTrackerView from './components/views/ProgressTrackerView';
import ChangePasswordModal from './components/ChangePasswordModal';
import ExcelImportModal from './components/ExcelImportModal';
import ErrorBoundary from './components/ErrorBoundary';
import {
  INITIAL_PERSONNEL,
  isDummyPersonnel
} from './utils/initialData';
import { exportToExcel, downloadTemplateExcel } from './utils/excelHelper';
import { orderApiService } from './services/orderApiService';
import {
  setStorageItem,
  getStorageItem,
  removeStorageItem
} from './utils/storageHelper';
import {
  getEmbedConfig,
  notifyParentFrameHeight,
  openInStandaloneTab
} from './utils/embedHelper';
import { CheckCircle2, AlertCircle, Info, ExternalLink, RefreshCw } from 'lucide-react';
import './index.css';

const ORDER_CACHE_KEY = 'isc_production_orders_v2';
const ORDER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export default function App() {
  // SharePoint & Embed configuration
  const embedConfig = useMemo(() => getEmbedConfig(), []);
  const isEmbedded = embedConfig.isEmbedded;

  // Add .is-embedded class to document body for global embed styling
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isEmbedded) {
        document.body.classList.add('is-embedded');
      } else {
        document.body.classList.remove('is-embedded');
      }
    }
  }, [isEmbedded]);

  // Authentication & Session state:
  // Session is stored in sessionStorage so fresh visits require logging in first
  const [currentUserSession, setCurrentUserSession] = useState(() => {
    try {
      // Proactively clear any legacy persistent session from localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('isc_production_session');
      }

      if (typeof window !== 'undefined' && window.sessionStorage) {
        const saved = window.sessionStorage.getItem('isc_production_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.operator && isDummyPersonnel(parsed.operator)) {
            parsed.operator = null;
          }
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  // Clean sensitive parameters (role, mode) while strictly preserving embed, tab, group parameters for SharePoint
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      let modified = false;
      ['role', 'mode'].forEach((p) => {
        if (urlParams.has(p)) {
          urlParams.delete(p);
          modified = true;
        }
      });
      if (window.location.hash === '#operator') {
        window.history.replaceState({}, '', window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : ''));
      } else if (modified) {
        const newSearch = urlParams.toString() ? `?${urlParams.toString()}` : '';
        window.history.replaceState({}, '', window.location.pathname + newSearch);
      }
    }
  }, []);

  // Navigation tab: 'dashboard' | 'scanner' | 'orders' | 'tracker'
  const [activeTab, setActiveTab] = useState(() => {
    try {
      // 1. Honor tab specified in SharePoint embed URL (?tab=tracker etc.)
      if (embedConfig.tab && ['dashboard', 'scanner', 'orders', 'tracker'].includes(embedConfig.tab.toLowerCase())) {
        return embedConfig.tab.toLowerCase();
      }
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const savedTab = window.sessionStorage.getItem('isc_production_active_tab');
        if (savedTab && ['dashboard', 'scanner', 'orders', 'tracker'].includes(savedTab)) {
          return savedTab;
        }
      }
      // If user session is already admin, default to 'dashboard' (top menu), else 'scanner'
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const savedSession = window.sessionStorage.getItem('isc_production_session');
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          if (parsed?.role === 'admin') {
            return 'dashboard';
          }
        }
      }
      return 'scanner';
    } catch {
      return 'scanner';
    }
  });

  // Persist activeTab to sessionStorage across page refreshes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('isc_production_active_tab', activeTab);
      }
    } catch {
      // Ignore storage errors
    }
  }, [activeTab]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (embedConfig.sidebar === 'collapsed' || embedConfig.compact) {
      return true;
    }
    if (embedConfig.sidebar === 'expanded') {
      return false;
    }
    if (typeof window !== 'undefined') {
      // In SharePoint embed mode, collapse by default on screens <= 1280px to save width
      if (embedConfig.isEmbedded && window.innerWidth <= 1280) {
        return true;
      }
      if (window.innerWidth <= 1024) {
        return true;
      }
    }
    const val = getStorageItem('isc_production_sidebar');
    return val === true || val === 'true';
  });

  // Automatically collapse sidebar on window resize if split into 2 (width <= 1024px)
  useEffect(() => {
    const handleWindowResize = () => {
      if (window.innerWidth <= 1024) {
        setSidebarCollapsed(true);
      }
      if (isEmbedded) {
        notifyParentFrameHeight();
      }
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [isEmbedded]);

  // Notify parent frame (SharePoint) on height/view/session changes
  useEffect(() => {
    if (isEmbedded) {
      notifyParentFrameHeight();
      const timer = setTimeout(() => {
        notifyParentFrameHeight();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [activeTab, currentUserSession, sidebarCollapsed, isEmbedded]);

  // Personnel state with 1-minute localStorage persistence
  const [personnel, setPersonnel] = useState(() => {
    try {
      const saved = getStorageItem('isc_production_personnel');
      if (saved && Array.isArray(saved) && saved.length > 0) {
        const map = new Map();
        INITIAL_PERSONNEL.forEach((p) => map.set(String(p.NoPersonal), p));
        saved.forEach((p) => map.set(String(p.NoPersonal), p));
        return Array.from(map.values());
      }
      return INITIAL_PERSONNEL;
    } catch {
      return INITIAL_PERSONNEL;
    }
  });

  // Orders always come from SharePoint; this cache is read only when the server is offline.
  const [orders, setOrders] = useState([]);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncError, setSyncError] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const syncInProgressRef = useRef(false);

  // Admin password with localStorage persistence (Default: 'admin123')
  const [adminPassword, setAdminPassword] = useState(() => {
    const saved = getStorageItem('isc_production_admin_password');
    if (saved === 'isc-admin' || !saved) {
      return 'admin123';
    }
    return saved;
  });

  // User password with 1-minute localStorage persistence (Default: 'isc-operator')
  const [userPassword] = useState(() => {
    return getStorageItem('isc_production_user_password') || 'isc-operator';
  });

  // Mode: Admin vs User (Derived from current user session)
  const isAdmin = currentUserSession?.role === 'admin';

  // Selections
  const [selectedOperator, setSelectedOperator] = useState(() => {
    if (currentUserSession?.operator) {
      return currentUserSession.operator;
    }
    return personnel[0] || INITIAL_PERSONNEL[0] || null;
  });

  const [selectedOrderNo, setSelectedOrderNo] = useState(() => {
    if (embedConfig.order) {
      return embedConfig.order.trim();
    }
    return orders[0]?.NoProduksi || orders[0]?.orderNo || '';
  });
  const [selectedGroup, setSelectedGroup] = useState(() => {
    if (embedConfig.group) {
      return embedConfig.group.toUpperCase();
    }
    return 'ALL';
  });

  // Theme state ('light' by default for authentic ANDRITZ engineering standard)
  const [theme, setTheme] = useState(() => {
    return getStorageItem('isc_production_theme') || 'light';
  });

  // Display zoom level
  const [zoomLevel, setZoomLevel] = useState(() => {
    const saved = getStorageItem('isc_production_zoom');
    return saved ? parseInt(saved, 10) : 100;
  });

  // Modals
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Startup scrub: proactively purge any dummy personnel from localStorage and session
  useEffect(() => {
    const savedP = getStorageItem('isc_production_personnel');
    if (savedP && Array.isArray(savedP)) {
      const cleaned = savedP.filter((p) => !isDummyPersonnel(p));
      if (cleaned.length !== savedP.length) {
        setStorageItem('isc_production_personnel', cleaned);
        setPersonnel(cleaned);
      }
    }

    if (currentUserSession?.operator && isDummyPersonnel(currentUserSession.operator)) {
      const cleanedSession = { ...currentUserSession, operator: null };
      setCurrentUserSession(cleanedSession);
      setSelectedOperator(null);
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('isc_production_session', JSON.stringify(cleanedSession));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync session to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (currentUserSession) {
        if (window.sessionStorage) {
          window.sessionStorage.setItem('isc_production_session', JSON.stringify(currentUserSession));
        }
      } else {
        if (window.sessionStorage) {
          window.sessionStorage.removeItem('isc_production_session');
        }
      }
      if (window.localStorage) {
        window.localStorage.removeItem('isc_production_session');
      }
    }
  }, [currentUserSession]);

  // Sync state to localStorage with 1-minute expiry
  useEffect(() => {
    setStorageItem('isc_production_personnel', personnel);
  }, [personnel]);

  useEffect(() => {
    setStorageItem('isc_production_admin_password', adminPassword);
  }, [adminPassword]);

  useEffect(() => {
    setStorageItem('isc_production_user_password', userPassword);
  }, [userPassword]);

  useEffect(() => {
    setStorageItem('isc_production_zoom', String(zoomLevel));
  }, [zoomLevel]);

  useEffect(() => {
    setStorageItem('isc_production_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    setStorageItem('isc_production_sidebar', String(sidebarCollapsed));
  }, [sidebarCollapsed]);


  // Extract unique ProductGroups
  const availableGroups = useMemo(() => {
    const set = new Set();
    orders.forEach((o) => {
      if (o.ProductGroup) set.add(o.ProductGroup.trim());
    });
    personnel.forEach((p) => {
      if (p.ProductGroup) set.add(p.ProductGroup.trim());
    });
    return Array.from(set).sort();
  }, [orders, personnel]);

  // Unique orders count
  const uniqueOrdersCount = useMemo(() => {
    return new Set(orders.map((o) => String(o.NoProduksi).trim())).size;
  }, [orders]);

  // Login handler
  const handleLoginSuccess = (session) => {
    setCurrentUserSession(session);
    if (typeof window !== 'undefined') {
      if (window.sessionStorage) {
        window.sessionStorage.setItem('isc_production_session', JSON.stringify(session));
      }
      if (window.localStorage) {
        window.localStorage.removeItem('isc_production_session');
      }
    }
    if (session.role === 'admin') {
      // Default Admin to top menu (dashboard) if no tab previously selected
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const savedTab = window.sessionStorage.getItem('isc_production_active_tab');
        if (!savedTab) {
          setActiveTab('dashboard');
        }
      } else {
        setActiveTab('dashboard');
      }
      showToast('Successfully logged in as ISC Administrator!', 'success');
    } else {
      if (session.operator) {
        setSelectedOperator(session.operator);
      }
      setActiveTab('scanner');
      showToast(`Welcome to ISC Workshop, ${session.username}!`, 'success');
    }
  };

  // Guard: if non-admin is on dashboard, fallback to scanner
  useEffect(() => {
    if (!isAdmin && activeTab === 'dashboard') {
      setActiveTab('scanner');
    }
  }, [isAdmin, activeTab]);

  // Logout handler
  const handleLogout = () => {
    setCurrentUserSession(null);
    if (typeof window !== 'undefined') {
      if (window.sessionStorage) {
        window.sessionStorage.removeItem('isc_production_session');
        window.sessionStorage.removeItem('isc_production_active_tab');
      }
      if (window.localStorage) {
        window.localStorage.removeItem('isc_production_session');
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
    setActiveTab('scanner');
    showToast('You have logged out of the system.', 'info');
  };

  const persistOrderSnapshot = (snapshot) => {
    setStorageItem(ORDER_CACHE_KEY, snapshot, ORDER_CACHE_TTL_MS);
  };

  const updateStepInCloud = async (orderNo, stepNumber, stepId, patch) => {
    const target = orders.find((step) =>
      String(step.NoProduksi || step.orderNo).trim() === String(orderNo).trim() &&
      (stepId
        ? String(step.id || step.ID) === String(stepId)
        : Number(step.Langkah || step.stepNo) === Number(stepNumber))
    );
    if (!target || !(Number(target.id || target.ID) > 0)) {
      throw new Error('Langkah tidak memiliki ID SharePoint yang valid. Muat ulang data sebelum mengubahnya.');
    }

    const updatedStep = {
      ...target,
      ...patch,
      id: Number(target.id || target.ID),
      orderNo: target.NoProduksi || target.orderNo,
      stepNo: Number(target.Langkah || target.stepNo) || Number(stepNumber),
      stepName: target.NamaLangkah || target.stepName || target.title
    };
    setIsLoadingCloud(true);
    try {
      await orderApiService.updateOrder(updatedStep);
      const updatedOrders = orders.map((step) =>
        Number(step.id || step.ID) === updatedStep.id ? { ...step, ...patch } : step
      );
      setOrders(updatedOrders);
      persistOrderSnapshot(updatedOrders);
      setLastSyncedAt(new Date());
      setSyncError('');
      return updatedOrders;
    } finally {
      setIsLoadingCloud(false);
    }
  };

  // Mark active step as finished
  const handleMarkStepFinished = async (orderNo, stepNumber) => {
    try {
      const updated = await updateStepInCloud(orderNo, stepNumber, null, { Status: 'Selesai', status: 1 });
      const orderSteps = updated
        .filter((step) => String(step.NoProduksi || step.orderNo).trim() === String(orderNo).trim())
        .sort((a, b) => Number(a.Langkah) - Number(b.Langkah));
      const nextActive = orderSteps.find((step) => String(step.Status).toLowerCase() !== 'selesai');
      showToast(nextActive
        ? `Langkah ${stepNumber} selesai. Langkah ${nextActive.Langkah} berikutnya aktif.`
        : `Semua langkah order ${orderNo} selesai.`, 'success');
    } catch (err) {
      setSyncError(err.message || 'Penyimpanan langkah ke SharePoint gagal.');
      showToast(`Gagal menyimpan status langkah ke SharePoint: ${err.message}`, 'error');
    }
  };

  // Revert finished step back to in-progress / unfinished (Admin feature)
  const handleRevertStep = async (orderNo, stepNumber, stepId) => {
    try {
      await updateStepInCloud(orderNo, stepNumber, stepId, { Status: 'Berjalan', status: 0 });
      showToast(`Status langkah ${stepNumber} order #${orderNo} dikembalikan ke Berjalan.`, 'success');
    } catch (err) {
      setSyncError(err.message || 'Penyimpanan langkah ke SharePoint gagal.');
      showToast(`Gagal mengubah status di SharePoint: ${err.message}`, 'error');
    }
  };

  // Update step status via Status Barcode dropdown (PROG vs FIN) with backend synchronization
  const handleUpdateStepStatus = async (orderNo, stepNumber, newStatus, stepId) => {
    const isFinished = newStatus === 'FIN';
    try {
      await updateStepInCloud(orderNo, stepNumber, stepId, {
        Status: isFinished ? 'Selesai' : 'Berjalan',
        status: isFinished ? 1 : 0,
        barcodeStatus: newStatus
      });
      showToast(`Status langkah disimpan ke SharePoint (${newStatus}).`, 'success');
    } catch (err) {
      setSyncError(err.message || 'Penyimpanan langkah ke SharePoint gagal.');
      showToast(`Gagal menyimpan status langkah ke SharePoint: ${err.message}`, 'error');
    }
  };

  // --- CLOUD CRUD HANDLERS (Power Automate & SharePoint) ---

  const handleSyncCloud = async (silent = false, allowOfflineCache = false) => {
    if (syncInProgressRef.current) return false;
    syncInProgressRef.current = true;
    setIsLoadingCloud(true);

    try {
      const res = await orderApiService.getAllOrders();
      const serverOrders = res.data;
      setOrders(serverOrders);
      persistOrderSnapshot(serverOrders);
      setLastSyncedAt(new Date());
      setSyncError('');
      setIsInitialLoading(false);
      setSelectedOrderNo((current) =>
        current && serverOrders.some((order) => String(order.NoProduksi || order.orderNo) === current)
          ? current
          : (serverOrders[0]?.NoProduksi || serverOrders[0]?.orderNo || '')
      );
      if (!silent) {
        showToast(`Berhasil memuat ${serverOrders.length} langkah dari SharePoint.`, 'success');
      }
      return true;
    } catch (err) {
      console.error('[SyncCloud] SharePoint sync failed:', err);
      setSyncError(err.message || 'Tidak dapat terhubung ke SharePoint.');
      setIsInitialLoading(false);
      if (allowOfflineCache && orders.length === 0) {
        const cachedOrders = getStorageItem(ORDER_CACHE_KEY);
        if (Array.isArray(cachedOrders)) {
          setOrders(cachedOrders);
          setSyncError('Server tidak tersedia. Menampilkan cache offline; perubahan memerlukan koneksi.');
        }
      }
      if (!silent || allowOfflineCache) {
        showToast(`Gagal memuat data SharePoint: ${err.message}`, 'error');
      }
      return false;
    } finally {
      syncInProgressRef.current = false;
      setIsLoadingCloud(false);
    }
  };

  useEffect(() => {
    removeStorageItem('isc_production_orders');
    removeStorageItem('isc_production_order_steps');
    removeStorageItem('isc_production_deleted_orders');
    handleSyncCloud(true, true);

    const pollTimer = setInterval(() => handleSyncCloud(true), 30000);
    return () => clearInterval(pollTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. CREATE: Insert new order to Cloud SharePoint
  const handleCreateOrder = async (orderData) => {
    setIsLoadingCloud(true);
    try {
      const targetNo = String(orderData.orderNo || '').trim();
      const steps = Array.isArray(orderData.steps) && orderData.steps.length > 0
        ? orderData.steps
        : [{ Langkah: 1, NamaLangkah: orderData.title, Status: 'Berjalan' }];
      const itemsToCreate = steps.map((step, index) => ({
        ...orderData,
        ProductGroup: orderData.ProductGroup || orderData.orderDivision || 'PKW',
        Langkah: index + 1,
        stepNo: index + 1,
        NamaLangkah: step.NamaLangkah || `${orderData.title} - Langkah ${index + 1}`,
        stepName: step.NamaLangkah || `${orderData.title} - Langkah ${index + 1}`,
        NoKonfirmasi: step.NoKonfirmasi || targetNo,
        Status: step.Status || 'Berjalan',
        status: String(step.Status).toLowerCase() === 'selesai' ? 1 : 0
      }));
      await orderApiService.createOrders(itemsToCreate);
      if (await handleSyncCloud(true)) {
        showToast(`Order #${targetNo} (${itemsToCreate.length} langkah) tersimpan di SharePoint.`, 'success');
      } else {
        showToast(`Order #${targetNo} terkirim ke SharePoint, tetapi pembacaan ulang gagal. Tekan Refresh.`, 'warning');
      }
    } catch (err) {
      setSyncError(err.message || 'Pembuatan order SharePoint gagal.');
      showToast(`Gagal membuat order di SharePoint: ${err.message}`, 'error');
    } finally {
      setIsLoadingCloud(false);
    }
  };

  // 3. UPDATE: Update order in Cloud SharePoint
  const handleUpdateOrder = async (orderData) => {
    setIsLoadingCloud(true);
    try {
      const targetNo = String(orderData.orderNo || '').trim();
      const representative = orders.find((step) => Number(step.id || step.ID) === Number(orderData.id));
      const originalNo = String(representative?.NoProduksi || representative?.orderNo || targetNo).trim();
      const existingSteps = orders.filter(
        (step) => String(step.NoProduksi || step.orderNo).trim() === originalNo
      );
      const submittedSteps = Array.isArray(orderData.steps) && orderData.steps.length > 0
        ? orderData.steps
        : [{ id: orderData.id, Langkah: 1, NamaLangkah: orderData.title, Status: orderData.Status || 'Berjalan' }];
      const items = submittedSteps.map((step, index) => ({
        ...orderData,
        id: step.id || step.ID,
        orderNo: targetNo,
        NoProduksi: targetNo,
        ProductGroup: orderData.ProductGroup || orderData.orderDivision || 'PKW',
        Langkah: index + 1,
        stepNo: index + 1,
        NamaLangkah: step.NamaLangkah || `${orderData.title} - Langkah ${index + 1}`,
        stepName: step.NamaLangkah || `${orderData.title} - Langkah ${index + 1}`,
        NoKonfirmasi: step.NoKonfirmasi || targetNo,
        Status: step.Status || 'Berjalan',
        status: String(step.Status).toLowerCase() === 'selesai' ? 1 : 0
      }));
      const idsToKeep = new Set(items.map((item) => Number(item.id)).filter((id) => id > 0));
      const itemsToUpdate = items.filter((item) => Number(item.id) > 0);
      const itemsToCreate = items.filter((item) => !(Number(item.id) > 0));
      const itemsToDelete = existingSteps.filter((step) => !idsToKeep.has(Number(step.id || step.ID)));

      if (itemsToUpdate.length) await orderApiService.updateOrder(itemsToUpdate);
      if (itemsToCreate.length) await orderApiService.createOrders(itemsToCreate);
      for (const step of itemsToDelete) {
        await orderApiService.deleteOrder(step.id || step.ID);
      }
      if (await handleSyncCloud(true)) {
        showToast(`Perubahan order #${targetNo} tersimpan di SharePoint.`, 'success');
      } else {
        showToast(`Order #${targetNo} tersimpan, tetapi pembacaan ulang gagal. Tekan Refresh.`, 'warning');
      }
    } catch (err) {
      setSyncError(err.message || 'Pembaruan order SharePoint gagal.');
      showToast(`Gagal memperbarui order di SharePoint: ${err.message}`, 'error');
    } finally {
      setIsLoadingCloud(false);
    }
  };

  // 4. DELETE: Delete order from Cloud SharePoint and local state
  const handleDeleteOrder = async (orderObj) => {
    setIsLoadingCloud(true);
    try {
      const targetNo = String(orderObj.NoProduksi || orderObj.orderNo || '').trim();
      const stepRecords = orders.filter(
        (step) => String(step.NoProduksi || step.orderNo).trim() === targetNo
      );
      const idsToDelete = [...new Set(
        [...stepRecords, ...(orderObj.steps || []), orderObj]
          .map((step) => Number(step.id || step.ID))
          .filter((id) => id > 0)
      )];
      if (idsToDelete.length === 0) {
        throw new Error('Order tidak memiliki ID SharePoint yang valid.');
      }

      for (const id of idsToDelete) {
        await orderApiService.deleteOrder(id);
      }
      if (!(await handleSyncCloud(true))) {
        throw new Error('Penghapusan dikirim, tetapi data SharePoint gagal dimuat ulang.');
      }
      if (selectedOrderNo === targetNo) setSelectedOrderNo('');
      showToast(`Order #${targetNo} berhasil dihapus dari SharePoint.`, 'success');
    } catch (err) {
      setSyncError(err.message || 'Penghapusan order SharePoint gagal.');
      showToast(`Gagal menghapus order dari SharePoint: ${err.message}`, 'error');
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const handleResetOrderSteps = async (orderNo) => {
    try {
      const records = orders
        .filter((step) => String(step.NoProduksi || step.orderNo).trim() === String(orderNo).trim())
        .map((step) => ({
          ...step,
          id: step.id || step.ID,
          orderNo: step.NoProduksi || step.orderNo,
          stepNo: step.Langkah || step.stepNo,
          stepName: step.NamaLangkah || step.stepName,
          Status: 'Berjalan',
          status: 0
        }));
      if (records.length === 0) throw new Error('Order tidak ditemukan di SharePoint.');
      await orderApiService.updateOrder(records);
      if (!(await handleSyncCloud(true))) {
        throw new Error('Status tersimpan, tetapi pembacaan ulang SharePoint gagal.');
      }
      showToast(`Semua langkah order ${orderNo} kembali ke Berjalan.`, 'success');
    } catch (err) {
      setSyncError(err.message || 'Reset status SharePoint gagal.');
      showToast(`Gagal mereset status di SharePoint: ${err.message}`, 'error');
    }
  };

  // Excel Import Success Handler: Restricted strictly to Admin, persists to Cloud Database (SharePoint via Power Automate)
  const handleImportSuccess = async (newOrders, newPersonnel) => {
    if (!isAdmin) {
      showToast('Access denied: Only Admin role is authorized to import Excel data.', 'error');
      throw new Error('Access denied: Only Admin role is authorized to import data.');
    }

    if (!Array.isArray(newOrders) || newOrders.length === 0) {
      showToast('No order data processed.', 'warning');
      return { success: true, count: 0 };
    }

    setIsLoadingCloud(true);
    try {
      const stepCounts = new Map();
      const existingByKey = new Map(orders.map((step) => [
        `${String(step.NoProduksi || step.orderNo).trim()}:${Number(step.Langkah || step.stepNo) || 1}`,
        step
      ]));
      const preparedOrders = newOrders.map((row) => {
        const orderNo = String(row.NoProduksi || row.orderNo || '').trim();
        const inferredStepNo = (stepCounts.get(orderNo) || 0) + 1;
        const stepNo = Number(row.Langkah || row.stepNo) || inferredStepNo;
        stepCounts.set(orderNo, Math.max(inferredStepNo, stepNo));
        const existing = existingByKey.get(`${orderNo}:${stepNo}`);
        const status = String(row.Status || '').toLowerCase() === 'selesai' || Number(row.status) === 1;
        return {
          ...row,
          id: existing?.id || existing?.ID || row.id || row.ID,
          orderNo,
          NoProduksi: orderNo,
          stepNo,
          Langkah: stepNo,
          stepName: row.stepName || row.NamaLangkah || row.title || `Langkah ${stepNo}`,
          NamaLangkah: row.NamaLangkah || row.stepName || row.title || `Langkah ${stepNo}`,
          Status: status ? 'Selesai' : 'Berjalan',
          status: status ? 1 : 0
        };
      });
      const toCreate = preparedOrders.filter((row) => !(Number(row.id || row.ID) > 0));
      const toUpdate = preparedOrders.filter((row) => Number(row.id || row.ID) > 0);

      if (toCreate.length > 0) {
        await orderApiService.createOrders(toCreate);
      }
      if (toUpdate.length > 0) {
        await orderApiService.updateOrder(toUpdate);
      }

      if (newPersonnel?.length) setPersonnel(newPersonnel);
      if (preparedOrders.length) setSelectedOrderNo(preparedOrders[0].NoProduksi);
      const refreshed = await handleSyncCloud(true);
      showToast(refreshed
        ? `${preparedOrders.length} langkah berhasil diimpor ke SharePoint.`
        : 'Import tersimpan, tetapi pembacaan ulang SharePoint gagal. Tekan Refresh.', refreshed ? 'success' : 'warning');
      return { success: true, count: preparedOrders.length };
    } catch (err) {
      console.error('[handleImportSuccess] SharePoint import failed:', err);
      setSyncError(err.message || 'Import ke SharePoint gagal.');
      showToast(`Import gagal disimpan ke SharePoint: ${err.message}`, 'error');
      throw err;
    } finally {
      setIsLoadingCloud(false);
    }
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    try {
      exportToExcel(orders, personnel);
      showToast('Latest Excel status file successfully downloaded.', 'success');
    } catch (err) {
      showToast(`Failed to download Excel: ${err.message}`, 'error');
    }
  };

  // Template Download Handler
  const handleDownloadTemplate = () => {
    try {
      downloadTemplateExcel();
      showToast('Excel template format successfully downloaded.', 'success');
    } catch (err) {
      showToast(`Failed to download template: ${err.message}`, 'error');
    }
  };

  // Password management
  const handleUpdatePassword = (newPass) => {
    setAdminPassword(newPass);
    showToast('Admin password successfully updated!', 'success');
  };

  const handleResetAdminPassword = () => {
    setAdminPassword('admin123');
    showToast('Admin password reset to default: admin123', 'info');
  };

  // Cross-view shortcuts
  const handleSelectOrderAndOpenScanner = (orderNo) => {
    setSelectedOrderNo(orderNo);
    setActiveTab('scanner');
  };

  // IF NOT AUTHENTICATED: SHOW FULLPAGE LOGIN PORTAL
  if (!currentUserSession) {
    return (
      <div className={`login-root-container ${isEmbedded ? 'embedded-mode' : ''}`}>
        {isEmbedded && (
          <div className="sharepoint-embed-topbar">
            <span className="text-xs font-mono text-cyan-400">Mode SharePoint Terhubung</span>
            <button
              type="button"
              className="btn btn-xs btn-outline-cyan flex items-center gap-1"
              onClick={openInStandaloneTab}
              title="Buka portal di tab browser baru untuk layar penuh"
            >
              <ExternalLink size={12} />
              <span>Buka Tab Penuh</span>
            </button>
          </div>
        )}
        <LoginView
          personnel={personnel}
          adminPassword={adminPassword}
          userPassword={userPassword}
          onLoginSuccess={handleLoginSuccess}
          onResetAdminPassword={handleResetAdminPassword}
        />
        {toast && (
          <div className="toast-banner">
            {toast.type === 'success' && <CheckCircle2 size={18} color="#10B981" />}
            {toast.type === 'error' && <AlertCircle size={18} color="#EF4444" />}
            {toast.type === 'info' && <Info size={18} color="#00A3E0" />}
            <span className="font-heading text-sm text-white">{toast.message}</span>
          </div>
        )}
      </div>
    );
  }

  // Render active view
  const renderActiveView = () => {
    switch (activeTab) {
      case 'scanner':
        return (
          <ScannerView
            personnel={personnel}
            selectedOperator={selectedOperator}
            onSelectOperator={setSelectedOperator}
            orders={orders}
            selectedOrderNo={selectedOrderNo}
            onSelectOrderNo={setSelectedOrderNo}
            onMarkStepFinished={handleMarkStepFinished}
            onResetOrderSteps={handleResetOrderSteps}
            onRevertStep={handleRevertStep}
            onUpdateStepStatus={handleUpdateStepStatus}
            isAdmin={isAdmin}
            selectedGroup={selectedGroup}
          />
        );
      case 'orders':
        return (
          <OrdersListView
            orders={orders}
            onSelectOrderAndOpenScanner={handleSelectOrderAndOpenScanner}
            onMarkStepFinished={handleMarkStepFinished}
            onRevertStep={handleRevertStep}
            isAdmin={isAdmin}
            selectedGroup={selectedGroup}
            onSyncCloud={handleSyncCloud}
            onCreateOrder={handleCreateOrder}
            onUpdateOrder={handleUpdateOrder}
            onDeleteOrder={handleDeleteOrder}
            isLoadingCloud={isLoadingCloud}
            onOpenImport={() => {
              if (isAdmin) {
                setIsImportModalOpen(true);
              }
            }}
            onExportExcel={handleExportExcel}
          />
        );
      case 'tracker':
        return (
          <ProgressTrackerView
            orders={orders}
            selectedGroup={selectedGroup}
            isAdmin={isAdmin}
            currentUser={currentUserSession}
            onMarkStepFinished={handleMarkStepFinished}
            onRevertStep={handleRevertStep}
            onUpdateStepStatus={handleUpdateStepStatus}
            onSelectOrderAndOpenScanner={handleSelectOrderAndOpenScanner}
            onSyncCloud={handleSyncCloud}
            isLoadingCloud={isLoadingCloud}
          />
        );
      case 'dashboard':
        if (!isAdmin) {
          return (
            <div className="view-container">
              <div className="alert-box alert-danger">
                <strong>Access Denied:</strong> Dashboard Chart view can only be accessed by Administrators.
              </div>
            </div>
          );
        }
        return (
          <DashboardChartView
            orders={orders}
            selectedGroup={selectedGroup}
            isAdmin={isAdmin}
            onSyncCloud={handleSyncCloud}
            isLoadingCloud={isLoadingCloud}
          />
        );
      default:
        return (
          <ScannerView
            personnel={personnel}
            selectedOperator={selectedOperator}
            onSelectOperator={setSelectedOperator}
            orders={orders}
            selectedOrderNo={selectedOrderNo}
            onSelectOrderNo={setSelectedOrderNo}
            onMarkStepFinished={handleMarkStepFinished}
            onResetOrderSteps={handleResetOrderSteps}
            onRevertStep={handleRevertStep}
            onUpdateStepStatus={handleUpdateStepStatus}
            isAdmin={isAdmin}
            selectedGroup={selectedGroup}
          />
        );
    }
  };

  return (
    <div className={`app-root-layout ${isEmbedded ? 'embedded-mode' : ''} ${embedConfig.compact ? 'compact-mode' : ''}`}>
      {/* Top Navbar */}
      <Navbar
        isAdmin={isAdmin}
        currentUser={currentUserSession}
        onLogout={handleLogout}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
        onExportExcel={handleExportExcel}
        onDownloadTemplate={handleDownloadTemplate}
        selectedGroup={selectedGroup}
        setSelectedGroup={setSelectedGroup}
        availableGroups={availableGroups}
        personnel={personnel}
        selectedOperator={selectedOperator}
        onSelectOperator={setSelectedOperator}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        theme={theme}
        setTheme={setTheme}
        isEmbedded={isEmbedded}
        onOpenStandalone={openInStandaloneTab}
      />

      {/* Main Body Layout: Sidebar + Active Content View */}
      <div className="app-body-layout">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isAdmin={isAdmin}
          currentUser={currentUserSession}
          onLogout={handleLogout}
          onOpenImport={() => setIsImportModalOpen(true)}
          onExportExcel={handleExportExcel}
          onDownloadTemplate={handleDownloadTemplate}
          onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
          onSyncCloud={handleSyncCloud}
          isLoadingCloud={isLoadingCloud}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          ordersCount={uniqueOrdersCount}
          personnelCount={personnel.length}
          theme={theme}
          setTheme={setTheme}
        />

        {/* Active Content Area */}
        <main
          className="app-main-workspace"
          style={{
            transform: `scale(${zoomLevel / 100})`,
            width: `${100 / (zoomLevel / 100)}%`
          }}
        >
          <div
            className="sync-status-bar"
            role="status"
            aria-live="polite"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}
          >
            <span className={syncError ? 'text-amber-500' : 'text-muted'}>
              {isInitialLoading
                ? 'Memuat data dari SharePoint...'
                : `Terakhir disinkronkan: ${lastSyncedAt ? lastSyncedAt.toLocaleString('id-ID') : 'belum pernah'}${syncError ? ` | ${syncError}` : ''}`}
            </span>
            <button
              type="button"
              className="btn btn-outline flex items-center gap-1.5 text-xs font-semibold"
              onClick={() => handleSyncCloud(false)}
              disabled={isLoadingCloud}
              aria-label="Refresh data SharePoint"
            >
              <RefreshCw size={14} className={isLoadingCloud ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
          <ErrorBoundary onReset={() => setActiveTab('scanner')}>
            {renderActiveView()}
          </ErrorBoundary>
        </main>
      </div>

      {/* Modals */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        currentPassword={adminPassword}
        onUpdatePassword={handleUpdatePassword}
      />

      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
        currentPersonnel={personnel}
        existingOrders={orders}
        isAdmin={isAdmin}
      />

      {/* Toast Notification Banner */}
      {toast && (
        <div className="toast-banner">
          {toast.type === 'success' && <CheckCircle2 size={18} color="#10B981" />}
          {toast.type === 'error' && <AlertCircle size={18} color="#EF4444" />}
          {toast.type === 'info' && <Info size={18} color="#00A3E0" />}
          <span className="font-heading text-sm text-white">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
