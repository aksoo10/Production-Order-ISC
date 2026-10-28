import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoginView from './components/LoginView';
import ScannerView from './components/views/ScannerView';
import OrdersListView from './components/views/OrdersListView';
import ChangePasswordModal from './components/ChangePasswordModal';
import ExcelImportModal from './components/ExcelImportModal';
import ErrorBoundary from './components/ErrorBoundary';
import {
  INITIAL_PERSONNEL,
  INITIAL_ORDERS,
  isDummyPersonnel,
  DEFAULT_DELETED_ORDERS,
  DEFAULT_ORDER_STEPS
} from './utils/initialData';
import { exportToExcel, downloadTemplateExcel } from './utils/excelHelper';
import { orderApiService } from './services/orderApiService';
import {
  setStorageItem,
  getStorageItem,
  isStorageItemExpired,
  purgeExpiredStorage
} from './utils/storageHelper';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import './index.css';

export default function App() {
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

  // Clean URL parameters if any were passed (e.g. ?role=operator) without auto-bypassing login
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('role') || urlParams.has('operator') || urlParams.has('mode') || window.location.hash === '#operator') {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // Navigation tab: 'scanner' | 'orders' | 'personnel' | 'guide'
  const [activeTab, setActiveTab] = useState('scanner');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      return true;
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
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Helper to detect dummy orders in storage
  const isDummyOrders = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    const dummyNos = ['10048291', '10048292', '10049380', '10049455'];
    return arr.some((o) => dummyNos.includes(String(o.NoProduksi || o.orderNo || '').trim()));
  };

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

  // Orders state with localStorage persistence and custom steps hydration
  const [orders, setOrders] = useState(() => {
    try {
      const deletedList = getStorageItem('isc_production_deleted_orders', []) || [];
      const deletedSet = new Set([
        ...DEFAULT_DELETED_ORDERS,
        ...(deletedList || []).map((s) => String(s).trim())
      ]);
      setStorageItem('isc_production_deleted_orders', Array.from(deletedSet));

      const savedRegistry = getStorageItem('isc_production_order_steps', {}) || {};
      const registry = { ...DEFAULT_ORDER_STEPS, ...savedRegistry };
      DEFAULT_DELETED_ORDERS.forEach((delNo) => {
        if (registry[delNo]) {
          delete registry[delNo];
        }
      });
      setStorageItem('isc_production_order_steps', registry);

      const saved = getStorageItem('isc_production_orders');
      const rawBase = (saved && Array.isArray(saved) && saved.length > 0 && !isDummyOrders(saved))
        ? saved
        : INITIAL_ORDERS;

      // Filter out deleted orders from the base list
      const baseOrders = rawBase.filter((item) => {
        const num = String(item.NoProduksi || item.orderNo || '').trim();
        return num && !deletedSet.has(num);
      });

      let finalOrders = baseOrders;
      const topOrders = [];
      const normalOrders = [];
      const processed = new Set();

      const stepsCountByOrder = new Map();
      const hasFinishedByOrder = new Map();
      baseOrders.forEach((item) => {
        const num = String(item.NoProduksi || item.orderNo || '').trim();
        stepsCountByOrder.set(num, (stepsCountByOrder.get(num) || 0) + 1);
        if (String(item.Status).toLowerCase() === 'selesai' || item.status === 1) {
          hasFinishedByOrder.set(num, true);
        }
      });

      baseOrders.forEach((item) => {
        const num = String(item.NoProduksi || item.orderNo || '').trim();
        if (processed.has(num)) return;
        processed.add(num);

        const customSteps = registry ? registry[num] : null;
        if (customSteps && Array.isArray(customSteps) && customSteps.length > 0) {
          customSteps.forEach((st, idx) => {
            const defStep = DEFAULT_ORDER_STEPS[num]?.[idx];
            const isDone =
              String(st.Status).toLowerCase() === 'selesai' ||
              st.status === 1 ||
              (defStep && (String(defStep.Status).toLowerCase() === 'selesai' || defStep.status === 1));

            topOrders.push({
              ...item,
              Langkah: idx + 1,
              NamaLangkah: st.NamaLangkah || `${item.title || 'Langkah'} ${idx + 1}`,
              NoKonfirmasi: st.NoKonfirmasi || item.NoKonfirmasi || item.NoProduksi,
              Status: isDone ? 'Selesai' : 'Berjalan',
              status: isDone ? 1 : 0
            });
          });
        } else if ((stepsCountByOrder.get(num) || 0) > 1 || hasFinishedByOrder.get(num)) {
          baseOrders.filter((b) => String(b.NoProduksi || b.orderNo || '').trim() === num).forEach((b) => {
            topOrders.push(b);
          });
        } else {
          normalOrders.push(item);
        }
      });
      finalOrders = [...topOrders, ...normalOrders];

      // Persist the clean list so localStorage immediately reflects the deletion
      setStorageItem('isc_production_orders', finalOrders);
      return finalOrders;
    } catch {
      return INITIAL_ORDERS.filter((o) => !DEFAULT_DELETED_ORDERS.includes(String(o.NoProduksi || o.orderNo || '').trim()));
    }
  });

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
    return orders[0]?.NoProduksi || INITIAL_ORDERS[0]?.NoProduksi || '';
  });
  const [selectedGroup, setSelectedGroup] = useState('ALL');

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
    setStorageItem('isc_production_orders', orders);
  }, [orders]);

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
      showToast('Berhasil masuk sebagai Administrator ISC!', 'success');
    } else {
      if (session.operator) {
        setSelectedOperator(session.operator);
      }
      showToast(`Selamat datang di Bengkel ISC, ${session.username}!`, 'success');
    }
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUserSession(null);
    if (typeof window !== 'undefined') {
      if (window.sessionStorage) {
        window.sessionStorage.removeItem('isc_production_session');
      }
      if (window.localStorage) {
        window.localStorage.removeItem('isc_production_session');
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
    showToast('Anda telah keluar dari sistem.', 'info');
  };

  // Helper to read and save persistent custom order steps registry
  const getCustomStepsRegistry = () => {
    const saved = getStorageItem('isc_production_order_steps', {}) || {};
    const merged = { ...DEFAULT_ORDER_STEPS, ...saved };
    // Ensure default finished steps are preserved even if an older cached registry had 'Berjalan'
    Object.entries(DEFAULT_ORDER_STEPS).forEach(([no, defSteps]) => {
      if (merged[no] && Array.isArray(merged[no])) {
        merged[no] = merged[no].map((st, idx) => {
          const def = defSteps[idx];
          if (def && (String(def.Status).toLowerCase() === 'selesai' || def.status === 1)) {
            return { ...st, Status: 'Selesai', status: 1 };
          }
          return st;
        });
      }
    });
    return merged;
  };

  const saveCustomStepsRegistry = (registry) => {
    setStorageItem('isc_production_order_steps', registry);
  };

  // Mark active step as finished
  const handleMarkStepFinished = (orderNo, stepNumber) => {
    const sOrderNo = String(orderNo).trim();

    // 1. Update persistent custom steps registry
    try {
      const registry = getCustomStepsRegistry();
      if (registry[sOrderNo]) {
        registry[sOrderNo] = registry[sOrderNo].map((st) => {
          if (Number(st.Langkah) === Number(stepNumber)) {
            return { ...st, Status: 'Selesai' };
          }
          return st;
        });
        saveCustomStepsRegistry(registry);
      }
    } catch (e) {
      console.warn('[handleMarkStepFinished] Gagal update registry langkah:', e);
    }

    setOrders((prevOrders) => {
      const updated = prevOrders.map((step) => {
        if (
          String(step.NoProduksi).trim() === sOrderNo &&
          Number(step.Langkah) === Number(stepNumber)
        ) {
          return { ...step, Status: 'Selesai', status: 1 };
        }
        return step;
      });

      const orderSteps = updated
        .filter((s) => String(s.NoProduksi).trim() === sOrderNo)
        .sort((a, b) => Number(a.Langkah) - Number(b.Langkah));

      const nextActive = orderSteps.find(
        (s) => String(s.Status).toLowerCase() !== 'selesai'
      );

      if (nextActive) {
        showToast(
          `Langkah ${stepNumber} Selesai! Langkah ${nextActive.Langkah} (${nextActive.NamaLangkah}) kini aktif.`,
          'success'
        );
      } else {
        showToast(`Seluruh langkah untuk Order ${orderNo} telah selesai!`, 'success');
      }

      // Auto-sync status to SharePoint if order has cloud ID
      const targetOrder = prevOrders.find((o) => String(o.NoProduksi).trim() === sOrderNo);
      if (targetOrder && targetOrder.id && targetOrder.id > 0) {
        orderApiService.updateOrder({
          id: targetOrder.id,
          orderNo: targetOrder.NoProduksi,
          title: targetOrder.title || targetOrder.NamaLangkah || '',
          status: nextActive ? 0 : 1
        }).catch((err) => console.warn('[AutoSync] Cloud update failed:', err));
      }

      // Move the active working order to the top of the list
      const matchingOrderSteps = updated.filter((s) => String(s.NoProduksi).trim() === sOrderNo);
      const otherOrderSteps = updated.filter((s) => String(s.NoProduksi).trim() !== sOrderNo);
      const reordered = [...matchingOrderSteps, ...otherOrderSteps];

      setStorageItem('isc_production_orders', reordered);
      return reordered;
    });
  };

  // Revert finished step back to in-progress / unfinished (Admin feature)
  const handleRevertStep = (orderNo, stepNumber, stepId) => {
    const sOrderNo = String(orderNo).trim();

    // 1. Update persistent custom steps registry
    try {
      const registry = getCustomStepsRegistry();
      if (registry[sOrderNo]) {
        registry[sOrderNo] = registry[sOrderNo].map((st) => {
          const isMatch = stepId && (st.id === stepId || st.ID === stepId)
            ? true
            : Number(st.Langkah) === Number(stepNumber);
          if (isMatch) {
            return { ...st, Status: 'Berjalan' };
          }
          return st;
        });
        saveCustomStepsRegistry(registry);
      }
    } catch (e) {
      console.warn('[handleRevertStep] Gagal update registry langkah:', e);
    }

    setOrders((prevOrders) => {
      let matched = false;
      const updated = prevOrders.map((step) => {
        if (String(step.NoProduksi).trim() === sOrderNo) {
          const isMatch = stepId && (step.id === stepId || step.ID === stepId)
            ? true
            : (!matched && Number(step.Langkah) === Number(stepNumber));
          if (isMatch) {
            matched = true;
            return { ...step, Status: 'Berjalan', status: 0 };
          }
        }
        return step;
      });

      // Auto-sync status to SharePoint if order has cloud ID
      const targetOrder = prevOrders.find((o) => String(o.NoProduksi).trim() === sOrderNo);
      if (targetOrder && targetOrder.id && targetOrder.id > 0) {
        orderApiService.updateOrder({
          id: targetOrder.id,
          orderNo: targetOrder.NoProduksi,
          title: targetOrder.title || targetOrder.NamaLangkah || '',
          status: 0
        }).catch((err) => console.warn('[AutoSync] Cloud update failed:', err));
      }

      setStorageItem('isc_production_orders', updated);
      return updated;
    });

    showToast(`Langkah ${stepNumber} Order #${sOrderNo} dikembalikan ke Belum Selesai (Berjalan).`, 'info');
  };

  // --- CLOUD CRUD HANDLERS (Power Automate & SharePoint) ---

  // 1. READ: Sync orders from Cloud SharePoint while preserving all custom added steps
  const handleSyncCloud = async (silent = false) => {
    setIsLoadingCloud(true);
    try {
      const res = await orderApiService.getAllOrders();
      if (res && res.success && Array.isArray(res.data)) {
        const deletedList = getStorageItem('isc_production_deleted_orders', []) || [];
        const deletedSet = new Set([
          ...DEFAULT_DELETED_ORDERS,
          ...(deletedList || []).map((s) => String(s).trim())
        ]);

        const validOrders = res.data.filter(
          (o) => o && o.NoProduksi && o.NoProduksi !== '-' && (o.customers || o.title || o.materialDescription) && !deletedSet.has(String(o.NoProduksi || o.orderNo || '').trim())
        );

        if (validOrders.length > 0) {
          const registry = getCustomStepsRegistry();

          setOrders((prevOrders) => {
            // Group existing local steps by order number to ensure no added step is lost
            const localStepsByOrder = new Map();
            (prevOrders || []).forEach((item) => {
              const num = String(item.NoProduksi || item.orderNo || '').trim();
              if (!num || deletedSet.has(num)) return;
              if (!localStepsByOrder.has(num)) {
                localStepsByOrder.set(num, []);
              }
              localStepsByOrder.get(num).push(item);
            });

            // Group cloud valid orders by unique orderNo so each order is processed ONCE
            const cloudOrdersByNum = new Map();
            validOrders.forEach((cloudOrder) => {
              const num = String(cloudOrder.NoProduksi || cloudOrder.orderNo || '').trim();
              if (!num || deletedSet.has(num)) return;
              if (!cloudOrdersByNum.has(num)) {
                cloudOrdersByNum.set(num, []);
              }
              cloudOrdersByNum.get(num).push(cloudOrder);
            });

            const customStepOrders = [];
            const regularOrders = [];
            const cloudOrderNos = new Set();

            cloudOrdersByNum.forEach((cloudItems, orderNo) => {
              cloudOrderNos.add(orderNo);
              const primaryCloud = cloudItems[0];
              const registeredSteps = registry[orderNo];
              const prevStepItems = localStepsByOrder.get(orderNo);

              if (registeredSteps && Array.isArray(registeredSteps) && registeredSteps.length > 0) {
                registeredSteps.forEach((st, idx) => {
                  const cStep = cloudItems[idx];
                  const defStep = DEFAULT_ORDER_STEPS[orderNo]?.[idx];
                  const isDone =
                    String(st.Status).toLowerCase() === 'selesai' ||
                    st.status === 1 ||
                    (cStep && (String(cStep.Status).toLowerCase() === 'selesai' || cStep.status === 1)) ||
                    (defStep && (String(defStep.Status).toLowerCase() === 'selesai' || defStep.status === 1));

                  customStepOrders.push({
                    ...primaryCloud,
                    id: st.id || (idx === 0 ? primaryCloud.id : (primaryCloud.id ? primaryCloud.id * 1000 + idx : Date.now() + idx)),
                    ID: st.id || (idx === 0 ? primaryCloud.ID : (primaryCloud.ID ? primaryCloud.ID * 1000 + idx : Date.now() + idx)),
                    Langkah: idx + 1,
                    NamaLangkah: st.NamaLangkah || `${primaryCloud.title || 'Langkah'} ${idx + 1}`,
                    NoKonfirmasi: st.NoKonfirmasi || primaryCloud.NoKonfirmasi || primaryCloud.NoProduksi,
                    Status: isDone ? 'Selesai' : 'Berjalan',
                    status: isDone ? 1 : 0
                  });
                });
              } else if (cloudItems.length > 1) {
                // Cloud already has multiple steps for this order (e.g. from SharePoint/SAP rows)
                // Use each row as a step and preserve local completion status without duplicating
                cloudItems.forEach((cItem, idx) => {
                  const matchingPrev = prevStepItems?.find(
                    (p) => Number(p.Langkah) === (cItem.Langkah ? Number(cItem.Langkah) : idx + 1) || (p.id && p.id === cItem.id)
                  );
                  customStepOrders.push({
                    ...cItem,
                    Langkah: cItem.Langkah || idx + 1,
                    Status: matchingPrev?.Status || cItem.Status || 'Berjalan',
                    status: matchingPrev ? matchingPrev.status : (cItem.status !== undefined ? cItem.status : (String(cItem.Status).toLowerCase() === 'selesai' ? 1 : 0))
                  });
                });
              } else if (prevStepItems && prevStepItems.length > 1) {
                // Keep previously added local steps for this order
                prevStepItems.forEach((st, idx) => {
                  customStepOrders.push({
                    ...primaryCloud,
                    ...st,
                    id: st.id || (idx === 0 ? primaryCloud.id : (primaryCloud.id ? primaryCloud.id * 1000 + idx : Date.now() + idx)),
                    ID: st.ID || (idx === 0 ? primaryCloud.ID : (primaryCloud.ID ? primaryCloud.ID * 1000 + idx : Date.now() + idx)),
                    Langkah: idx + 1
                  });
                });
              } else {
                // Single baseline order from cloud
                const isFinished = String(primaryCloud.Status).toLowerCase() === 'selesai' || primaryCloud.status === 1;
                if (isFinished) {
                  customStepOrders.push(primaryCloud);
                } else {
                  regularOrders.push(primaryCloud);
                }
              }
            });

            // Keep any locally created/imported orders that have not yet synced to cloud, excluding deleted
            const pendingLocal = (prevOrders || []).filter(
              (lo) => lo && lo.NoProduksi && !cloudOrderNos.has(String(lo.NoProduksi).trim()) && !deletedSet.has(String(lo.NoProduksi).trim())
            );

            // Place custom-step orders and newly created local orders at the top
            const merged = [...customStepOrders, ...pendingLocal, ...regularOrders];
            setStorageItem('isc_production_orders', merged);
            return merged;
          });

          setSelectedOrderNo((prev) =>
            prev && validOrders.some((o) => o.NoProduksi === prev) ? prev : (validOrders[0]?.NoProduksi || '')
          );
        }
        if (!silent) {
          showToast(
            `Berhasil menyinkronkan ${validOrders.length || res.total} order dari SharePoint Cloud!`,
            'success'
          );
        }
      } else {
        if (!silent) {
          showToast('Data dari cloud kosong atau tidak berformat array.', 'info');
        }
      }
    } catch (err) {
      console.warn('[SyncCloud] Warning:', err);
      if (!silent) {
        showToast(`Gagal menyinkronkan cloud: ${err.message}`, 'error');
      }
    } finally {
      setIsLoadingCloud(false);
    }
  };

  // Auto-sync real cloud orders on initial application load
  useEffect(() => {
    handleSyncCloud(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1-Minute LocalStorage Cache Watcher:
  // Automatically purges expired cache and triggers background cloud re-sync without logging out the user
  useEffect(() => {
    const checkInterval = setInterval(() => {
      // 1. Orders cache expiration check: automatically sync latest data from cloud
      if (isStorageItemExpired('isc_production_orders')) {
        console.log('[StorageTTL] Cache order di localStorage telah melewati 1 menit. Mengambil data terbaru dari SharePoint...');
        handleSyncCloud(true);
      }

      // 2. Purge any other expired temporary cache keys (session and settings are protected)
      purgeExpiredStorage();
    }, 15000);

    return () => clearInterval(checkInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. CREATE: Insert new order to Cloud SharePoint
  const handleCreateOrder = async (orderData) => {
    setIsLoadingCloud(true);
    try {
      const targetNo = String(orderData.orderNo || '').trim();
      const divGroup = orderData.orderDivision ? orderData.orderDivision.split(/[\s&/]+/)[0].toUpperCase() : 'PKW';
      const prodGroup = orderData.ProductGroup || divGroup || 'PKW';

      // Un-delete if this orderNo was previously in the deleted registry
      const deletedList = getStorageItem('isc_production_deleted_orders', []) || [];
      if (deletedList.includes(targetNo)) {
        const nextDeleted = deletedList.filter((n) => n !== targetNo);
        setStorageItem('isc_production_deleted_orders', nextDeleted);
      }

      // Persist custom steps
      if (orderData.steps && Array.isArray(orderData.steps) && orderData.steps.length > 0) {
        const registry = getCustomStepsRegistry();
        registry[targetNo] = orderData.steps.map((st, idx) => ({
          Langkah: idx + 1,
          NamaLangkah: st.NamaLangkah || `${orderData.title} - Langkah ${idx + 1}`,
          NoKonfirmasi: st.NoKonfirmasi || orderData.orderNo || '1000000',
          Status: st.Status || 'Berjalan'
        }));
        saveCustomStepsRegistry(registry);
      }

      const itemsToCreate = (orderData.steps && Array.isArray(orderData.steps) && orderData.steps.length > 0)
        ? orderData.steps.map((st, idx) => ({
            ...orderData,
            ProductGroup: prodGroup,
            orderDivision: orderData.orderDivision || 'PKW Wood Process.Ser',
            Langkah: idx + 1,
            NamaLangkah: st.NamaLangkah || `${orderData.title} - Langkah ${idx + 1}`,
            NoKonfirmasi: st.NoKonfirmasi || orderData.orderNo || '1000000',
            Status: st.Status || 'Berjalan',
            status: st.Status === 'Selesai' ? 1 : 0
          }))
        : [{ ...orderData, ProductGroup: prodGroup }];

      await orderApiService.createOrders(itemsToCreate);
      showToast(`Order #${orderData.orderNo} (${itemsToCreate.length} langkah) berhasil disimpan ke SharePoint Cloud!`, 'success');
      setOrders((prev) => {
        const filtered = prev.filter((o) => String(o.NoProduksi || o.orderNo || '').trim() !== targetNo);
        const next = [...itemsToCreate, ...filtered];
        setStorageItem('isc_production_orders', next);
        return next;
      });
      await handleSyncCloud(true);
    } catch (err) {
      showToast(`Gagal membuat order: ${err.message}`, 'error');
      setIsLoadingCloud(false);
    }
  };

  // 3. UPDATE: Update order in Cloud SharePoint
  const handleUpdateOrder = async (orderData) => {
    setIsLoadingCloud(true);
    try {
      const targetNo = String(orderData.orderNo || '').trim();
      const divGroup = orderData.orderDivision ? orderData.orderDivision.split(/[\s&/]+/)[0].toUpperCase() : 'PKW';
      const prodGroup = orderData.ProductGroup || divGroup || 'PKW';

      const hasSteps = orderData.steps && Array.isArray(orderData.steps) && orderData.steps.length > 0;
      const allStepsDone = hasSteps
        ? orderData.steps.every((st) => String(st.Status).toLowerCase() === 'selesai')
        : (orderData.status === 1 || String(orderData.Status).toLowerCase() === 'selesai');
      const finalStatus = allStepsDone ? 1 : 0;

      // Persist custom steps to registry immediately
      if (hasSteps) {
        const registry = getCustomStepsRegistry();
        registry[targetNo] = orderData.steps.map((st, idx) => ({
          id: st.id,
          Langkah: idx + 1,
          NamaLangkah: st.NamaLangkah || `${orderData.title} - Langkah ${idx + 1}`,
          NoKonfirmasi: st.NoKonfirmasi || orderData.orderNo || '1000000',
          Status: st.Status || 'Berjalan'
        }));
        saveCustomStepsRegistry(registry);
      }

      await orderApiService.updateOrder({
        ...orderData,
        status: finalStatus,
        ProductGroup: prodGroup
      });
      showToast(`Perubahan Order #${orderData.orderNo} berhasil diupdate ke SharePoint!`, 'success');

      setOrders((prev) => {
        if (hasSteps) {
          const otherOrders = prev.filter((o) => {
            const oNo = String(o.NoProduksi || o.orderNo || '').trim();
            const oId = o.id || o.ID;
            return oNo !== targetNo && (!orderData.id || oId !== orderData.id);
          });

          const updatedSteps = orderData.steps.map((st, idx) => {
            const isStepDone = String(st.Status).toLowerCase() === 'selesai';
            return {
              id: st.id || (idx === 0 ? orderData.id : Date.now() + idx),
              ID: st.id || (idx === 0 ? orderData.id : Date.now() + idx),
              ...orderData,
              ProductGroup: prodGroup,
              orderDivision: orderData.orderDivision || 'PKW Wood Process.Ser',
              NoProduksi: targetNo,
              orderNo: targetNo,
              title: orderData.title,
              materialDescription: orderData.materialDescription || orderData.title,
              Langkah: idx + 1,
              NamaLangkah: st.NamaLangkah || `${orderData.title} - Langkah ${idx + 1}`,
              NoKonfirmasi: st.NoKonfirmasi || orderData.orderNo || '1000000',
              Status: st.Status || (finalStatus === 1 ? 'Selesai' : 'Berjalan'),
              status: isStepDone ? 1 : 0
            };
          });

          const nextList = [...updatedSteps, ...otherOrders];
          setStorageItem('isc_production_orders', nextList);
          return nextList;
        }

        const matchingOrders = [];
        const otherOrders = [];
        prev.forEach((o) => {
          if ((orderData.id && o.id === orderData.id) || o.NoProduksi === orderData.orderNo) {
            matchingOrders.push({
              ...o,
              ...orderData,
              status: finalStatus,
              ProductGroup: prodGroup,
              Status: finalStatus === 1 ? 'Selesai' : 'Berjalan'
            });
          } else {
            otherOrders.push(o);
          }
        });
        const nextList = [...matchingOrders, ...otherOrders];
        setStorageItem('isc_production_orders', nextList);
        return nextList;
      });
    } catch (err) {
      showToast(`Gagal mengupdate order: ${err.message}`, 'error');
    } finally {
      setIsLoadingCloud(false);
    }
  };

  // 4. DELETE: Delete order from Cloud SharePoint and local state
  const handleDeleteOrder = async (orderObj) => {
    setIsLoadingCloud(true);
    try {
      const targetNo = String(orderObj.NoProduksi || orderObj.orderNo || '').trim();
      const registry = getCustomStepsRegistry();
      if (registry[targetNo]) {
        delete registry[targetNo];
        saveCustomStepsRegistry(registry);
      }

      // Add to persistent deleted orders registry so it never comes back
      const deletedList = getStorageItem('isc_production_deleted_orders', []) || [];
      if (!deletedList.includes(targetNo)) {
        deletedList.push(targetNo);
        setStorageItem('isc_production_deleted_orders', deletedList);
      }

      // Collect all IDs for this order to delete in SharePoint
      const idsToDelete = new Set();
      if (orderObj.id && orderObj.id > 0) idsToDelete.add(orderObj.id);
      if (orderObj.ID && orderObj.ID > 0) idsToDelete.add(orderObj.ID);
      if (orderObj.steps && Array.isArray(orderObj.steps)) {
        orderObj.steps.forEach((st) => {
          if (st.id && st.id > 0) idsToDelete.add(st.id);
          if (st.ID && st.ID > 0) idsToDelete.add(st.ID);
        });
      }
      // Also check current orders state for any step with this targetNo
      orders.forEach((o) => {
        if (String(o.NoProduksi || o.orderNo || '').trim() === targetNo) {
          if (o.id && o.id > 0) idsToDelete.add(o.id);
          if (o.ID && o.ID > 0) idsToDelete.add(o.ID);
        }
      });

      // Call delete in cloud for each ID
      for (const id of idsToDelete) {
        try {
          await orderApiService.deleteOrder(id);
        } catch (cloudErr) {
          console.warn('[handleDeleteOrder] Cloud delete note for ID', id, cloudErr);
        }
      }

      // Always remove order and all its steps from local state and storage
      setOrders((prev) => {
        const nextList = prev.filter((o) => {
          const num = String(o.NoProduksi || o.orderNo || '').trim();
          const matchesNo = num === targetNo;
          const matchesId = (orderObj.id && o.id === orderObj.id) || idsToDelete.has(o.id) || idsToDelete.has(o.ID);
          return !matchesNo && !matchesId;
        });
        setStorageItem('isc_production_orders', nextList);
        return nextList;
      });

      if (selectedOrderNo === targetNo) {
        setSelectedOrderNo('');
      }
      showToast(`Order #${targetNo} berhasil dihapus dari sistem & cloud.`, 'success');
    } catch (err) {
      showToast(`Gagal menghapus order: ${err.message}`, 'error');
    } finally {
      setIsLoadingCloud(false);
    }
  };

  // Reset steps for testing mode
  const handleResetOrderSteps = (orderNo) => {
    const sOrderNo = String(orderNo).trim();
    const registry = getCustomStepsRegistry();
    if (registry[sOrderNo]) {
      registry[sOrderNo] = registry[sOrderNo].map((st) => ({ ...st, Status: 'Berjalan' }));
      saveCustomStepsRegistry(registry);
    }

    setOrders((prevOrders) => {
      const nextList = prevOrders.map((step) => {
        if (String(step.NoProduksi).trim() === sOrderNo) {
          return { ...step, Status: 'Berjalan', status: 0 };
        }
        return step;
      });
      setStorageItem('isc_production_orders', nextList);
      return nextList;
    });
    showToast(`Status seluruh langkah Order ${orderNo} dikembalikan ke Berjalan.`, 'info');
  };

  // Excel Import Success Handler: Saves to Local State AND Persists to Cloud Database (SharePoint via Power Automate)
  const handleImportSuccess = async (newOrders, newPersonnel) => {
    setIsLoadingCloud(true);

    if (newPersonnel && newPersonnel.length > 0) {
      setPersonnel(newPersonnel);
    }

    // Un-delete any imported orders from deleted registry
    const deletedList = getStorageItem('isc_production_deleted_orders', []) || [];
    if (deletedList.length > 0) {
      const importedNos = new Set(newOrders.map((o) => String(o.NoProduksi || o.orderNo || '').trim()));
      const nextDeleted = deletedList.filter((n) => !importedNos.has(n));
      setStorageItem('isc_production_deleted_orders', nextDeleted);
    }

    // Match existing orders to preserve existing SharePoint IDs if any match
    const existingMap = new Map();
    orders.forEach((o) => {
      if (o.id && o.id > 0) {
        existingMap.set(String(o.NoProduksi).trim(), o.id);
      }
    });

    const preparedOrders = newOrders.map((no) => {
      const existingId = existingMap.get(String(no.NoProduksi).trim());
      if (existingId) {
        return { ...no, id: existingId, ID: existingId };
      }
      return no;
    });

    // Immediately update local state and localStorage so user sees imported data right away
    setOrders(preparedOrders);
    if (preparedOrders.length > 0) {
      setSelectedOrderNo(preparedOrders[0].NoProduksi);
    }

    // Group into items to create (new) vs update (existing)
    const toCreate = [];
    const toUpdate = [];
    preparedOrders.forEach((o) => {
      if (o.id && o.id > 0) {
        toUpdate.push(o);
      } else {
        toCreate.push(o);
      }
    });

    showToast(
      `Menyimpan ${preparedOrders.length} order ke database SharePoint Cloud...`,
      'info'
    );

    try {
      if (toCreate.length > 0) {
        await orderApiService.createOrders(toCreate);
      }
      if (toUpdate.length > 0) {
        await orderApiService.updateOrder(toUpdate);
      }

      showToast(
        `Sukses! ${preparedOrders.length} order berhasil diimpor & disimpan permanen ke SharePoint Database.`,
        'success'
      );

      // Re-fetch cloud orders after short delay to retrieve real SharePoint IDs
      setTimeout(async () => {
        await handleSyncCloud(true);
      }, 1500);

      return { success: true, count: preparedOrders.length };
    } catch (cloudErr) {
      console.error('[handleImportSuccess] Error saving to cloud:', cloudErr);
      showToast(
        `Order tersimpan lokal, namun gagal sync ke cloud: ${cloudErr.message}`,
        'warning'
      );
      throw cloudErr;
    } finally {
      setIsLoadingCloud(false);
    }
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    try {
      exportToExcel(orders, personnel);
      showToast('File Excel status terbaru berhasil diunduh.', 'success');
    } catch (err) {
      showToast(`Gagal mengunduh Excel: ${err.message}`, 'error');
    }
  };

  // Template Download Handler
  const handleDownloadTemplate = () => {
    try {
      downloadTemplateExcel();
      showToast('Format template Excel berhasil diunduh.', 'success');
    } catch (err) {
      showToast(`Gagal mengunduh template: ${err.message}`, 'error');
    }
  };

  // Password management
  const handleUpdatePassword = (newPass) => {
    setAdminPassword(newPass);
    showToast('Kata sandi admin berhasil diperbarui!', 'success');
  };

  const handleResetAdminPassword = () => {
    setAdminPassword('admin123');
    showToast('Kata sandi admin telah direset ke default: admin123', 'info');
  };

  // Cross-view shortcuts
  const handleSelectOrderAndOpenScanner = (orderNo) => {
    setSelectedOrderNo(orderNo);
    setActiveTab('scanner');
  };

  // IF NOT AUTHENTICATED: SHOW FULLPAGE LOGIN PORTAL
  if (!currentUserSession) {
    return (
      <>
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
      </>
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
            isAdmin={isAdmin}
            selectedGroup={selectedGroup}
          />
        );
    }
  };

  return (
    <div className="app-root-layout">
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
