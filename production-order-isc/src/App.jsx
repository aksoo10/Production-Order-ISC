import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoginView from './components/LoginView';
import ScannerView from './components/views/ScannerView';
import OrdersListView from './components/views/OrdersListView';
import ChangePasswordModal from './components/ChangePasswordModal';
import ExcelImportModal from './components/ExcelImportModal';
import ErrorBoundary from './components/ErrorBoundary';
import { INITIAL_PERSONNEL, INITIAL_ORDERS, isDummyPersonnel } from './utils/initialData';
import { exportToExcel, downloadTemplateExcel } from './utils/excelHelper';
import { orderApiService } from './services/orderApiService';
import {
  setStorageItem,
  getStorageItem,
  removeStorageItem,
  isStorageItemExpired,
  purgeExpiredStorage,
  STORAGE_EXPIRY_MS
} from './utils/storageHelper';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import './index.css';

export default function App() {
  // Authentication & Session state (Expires after 1 minute)
  const [currentUserSession, setCurrentUserSession] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const role = urlParams.get('role') || urlParams.get('mode');
        const isOperatorUrl = urlParams.get('operator') === 'true' || role === 'operator' || role === 'user' || window.location.hash === '#operator';
        if (isOperatorUrl) {
          const directSession = {
            role: 'user',
            username: 'Operator Bengkel',
            operator: null
          };
          setStorageItem('isc_production_session', directSession);
          return directSession;
        }
      }

      const saved = getStorageItem('isc_production_session');
      if (saved) {
        if (saved?.operator && isDummyPersonnel(saved.operator)) {
          saved.operator = null;
        }
        return saved;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Direct URL Operator Link Handler (e.g. ?role=operator)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const role = urlParams.get('role') || urlParams.get('mode');
      const isOperatorUrl = urlParams.get('operator') === 'true' || role === 'operator' || role === 'user' || window.location.hash === '#operator';
      if (isOperatorUrl) {
        const directSession = {
          role: 'user',
          username: 'Operator Bengkel',
          operator: null
        };
        setCurrentUserSession(directSession);
        setStorageItem('isc_production_session', directSession);
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

  // Orders state with 1-minute localStorage persistence
  const [orders, setOrders] = useState(() => {
    try {
      const saved = getStorageItem('isc_production_orders');
      if (saved && Array.isArray(saved) && saved.length > 0 && !isDummyOrders(saved)) {
        return saved;
      }
      return INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  // Admin password with 1-minute localStorage persistence (Default: 'isc-admin')
  const [adminPassword, setAdminPassword] = useState(() => {
    return getStorageItem('isc_production_admin_password') || 'isc-admin';
  });

  // User password with 1-minute localStorage persistence (Default: 'isc-operator')
  const [userPassword, setUserPassword] = useState(() => {
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
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
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

    const savedSession = getStorageItem('isc_production_session');
    if (savedSession?.operator && isDummyPersonnel(savedSession.operator)) {
      savedSession.operator = null;
      setStorageItem('isc_production_session', savedSession);
      setCurrentUserSession(savedSession);
      setSelectedOperator(null);
    }
  }, []);

  // Sync session to localStorage with 1-minute expiry
  useEffect(() => {
    if (currentUserSession) {
      setStorageItem('isc_production_session', currentUserSession);
    } else {
      removeStorageItem('isc_production_session');
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
  }, []);

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
    removeStorageItem('isc_production_session');
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
    showToast('Anda telah keluar dari sistem.', 'info');
  };

  // Mark active step as finished
  const handleMarkStepFinished = (orderNo, stepNumber) => {
    setOrders((prevOrders) => {
      const updated = prevOrders.map((step) => {
        if (
          String(step.NoProduksi).trim() === String(orderNo).trim() &&
          Number(step.Langkah) === Number(stepNumber)
        ) {
          return { ...step, Status: 'Selesai' };
        }
        return step;
      });

      const orderSteps = updated
        .filter((s) => String(s.NoProduksi).trim() === String(orderNo).trim())
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
      const targetOrder = prevOrders.find((o) => String(o.NoProduksi).trim() === String(orderNo).trim());
      if (targetOrder && targetOrder.id && targetOrder.id > 0) {
        orderApiService.updateOrder({
          id: targetOrder.id,
          orderNo: targetOrder.NoProduksi,
          title: targetOrder.title || targetOrder.NamaLangkah || '',
          status: nextActive ? 0 : 1
        }).catch((err) => console.warn('[AutoSync] Cloud update failed:', err));
      }

      return updated;
    });
  };

  // --- CLOUD CRUD HANDLERS (Power Automate & SharePoint) ---

  // 1. READ: Sync orders from Cloud SharePoint
  const handleSyncCloud = async (silent = false) => {
    setIsLoadingCloud(true);
    try {
      const res = await orderApiService.getAllOrders();
      if (res && res.success && Array.isArray(res.data)) {
        const validOrders = res.data.filter(
          (o) => o && o.NoProduksi && o.NoProduksi !== '-' && (o.customers || o.title || o.materialDescription)
        );
        if (validOrders.length > 0) {
          setOrders((prevOrders) => {
            // Keep any locally created/imported orders that have not yet synced to cloud
            const cloudOrderNos = new Set(validOrders.map((o) => String(o.NoProduksi).trim()));
            const pendingLocal = (prevOrders || []).filter(
              (lo) => lo && lo.NoProduksi && !cloudOrderNos.has(String(lo.NoProduksi).trim())
            );
            return [...validOrders, ...pendingLocal];
          });

          setSelectedOrderNo((prev) =>
            prev && validOrders.some((o) => o.NoProduksi === prev) ? prev : validOrders[0].NoProduksi
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
  }, []);

  // 2. CREATE: Insert new order to Cloud SharePoint
  const handleCreateOrder = async (orderData) => {
    setIsLoadingCloud(true);
    try {
      const itemsToCreate = (orderData.steps && Array.isArray(orderData.steps) && orderData.steps.length > 0)
        ? orderData.steps.map((st, idx) => ({
            ...orderData,
            Langkah: idx + 1,
            NamaLangkah: st.NamaLangkah || `${orderData.title} - Langkah ${idx + 1}`,
            NoKonfirmasi: st.NoKonfirmasi || orderData.orderNo || '1000000',
            Status: st.Status || 'Berjalan',
            status: st.Status === 'Selesai' ? 1 : 0
          }))
        : [orderData];

      await orderApiService.createOrders(itemsToCreate);
      showToast(`Order #${orderData.orderNo} (${itemsToCreate.length} langkah) berhasil disimpan ke SharePoint Cloud!`, 'success');
      await handleSyncCloud();
    } catch (err) {
      showToast(`Gagal membuat order: ${err.message}`, 'error');
      setIsLoadingCloud(false);
    }
  };

  // 3. UPDATE: Update order in Cloud SharePoint
  const handleUpdateOrder = async (orderData) => {
    setIsLoadingCloud(true);
    try {
      await orderApiService.updateOrder(orderData);
      showToast(`Perubahan Order #${orderData.orderNo} berhasil diupdate ke SharePoint!`, 'success');
      setOrders((prev) => {
        if (orderData.steps && Array.isArray(orderData.steps) && orderData.steps.length > 0) {
          const targetNo = String(orderData.orderNo || '').trim();
          const otherOrders = prev.filter((o) => {
            const oNo = String(o.NoProduksi || o.orderNo || '').trim();
            const oId = o.id || o.ID;
            return oNo !== targetNo && (!orderData.id || oId !== orderData.id);
          });

          const updatedSteps = orderData.steps.map((st, idx) => ({
            id: st.id || (idx === 0 ? orderData.id : Date.now() + idx),
            ID: st.id || (idx === 0 ? orderData.id : Date.now() + idx),
            ...orderData,
            NoProduksi: targetNo,
            orderNo: targetNo,
            title: orderData.title,
            Langkah: idx + 1,
            NamaLangkah: st.NamaLangkah || `${orderData.title} - Langkah ${idx + 1}`,
            NoKonfirmasi: st.NoKonfirmasi || orderData.orderNo || '1000000',
            Status: st.Status || (orderData.status === 1 ? 'Selesai' : 'Berjalan'),
            status: st.Status === 'Selesai' ? 1 : (orderData.status || 0)
          }));

          return [...otherOrders, ...updatedSteps];
        }

        return prev.map((o) => {
          if ((orderData.id && o.id === orderData.id) || o.NoProduksi === orderData.orderNo) {
            return {
              ...o,
              ...orderData,
              Status: orderData.status === 1 ? 'Selesai' : 'Berjalan'
            };
          }
          return o;
        });
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
      if (orderObj.id && orderObj.id > 0) {
        try {
          await orderApiService.deleteOrder(orderObj.id);
        } catch (cloudErr) {
          console.warn('[handleDeleteOrder] Cloud delete note:', cloudErr);
        }
      }
      // Always remove order and all its steps from local state and storage
      setOrders((prev) =>
        prev.filter((o) => o.NoProduksi !== orderObj.NoProduksi && (!orderObj.id || o.id !== orderObj.id))
      );
      if (selectedOrderNo === orderObj.NoProduksi) {
        setSelectedOrderNo('');
      }
      showToast(`Order #${orderObj.NoProduksi} berhasil dihapus dari sistem & cloud.`, 'success');
    } catch (err) {
      showToast(`Gagal menghapus order: ${err.message}`, 'error');
    } finally {
      setIsLoadingCloud(false);
    }
  };

  // Reset steps for testing mode
  const handleResetOrderSteps = (orderNo) => {
    setOrders((prevOrders) =>
      prevOrders.map((step) => {
        if (String(step.NoProduksi).trim() === String(orderNo).trim()) {
          return { ...step, Status: 'Berjalan' };
        }
        return step;
      })
    );
    showToast(`Status seluruh langkah Order ${orderNo} dikembalikan ke Berjalan.`, 'info');
  };

  // Excel Import Success Handler: Saves to Local State AND Persists to Cloud Database (SharePoint via Power Automate)
  const handleImportSuccess = async (newOrders, newPersonnel) => {
    setIsLoadingCloud(true);

    if (newPersonnel && newPersonnel.length > 0) {
      setPersonnel(newPersonnel);
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
    setAdminPassword('isc-admin');
    showToast('Kata sandi admin telah direset ke default: isc-admin', 'info');
  };

  // Cross-view shortcuts
  const handleSelectOrderAndOpenScanner = (orderNo) => {
    setSelectedOrderNo(orderNo);
    setActiveTab('scanner');
  };

  const handleSelectOperatorAndOpenScanner = (op) => {
    setSelectedOperator(op);
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
