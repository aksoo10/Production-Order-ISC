import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoginView from './components/LoginView';
import ScannerView from './components/views/ScannerView';
import OrdersListView from './components/views/OrdersListView';
import PersonnelListView from './components/views/PersonnelListView';
import ChangePasswordModal from './components/ChangePasswordModal';
import ExcelImportModal from './components/ExcelImportModal';
import { INITIAL_PERSONNEL, INITIAL_ORDERS } from './utils/initialData';
import { exportToExcel, downloadTemplateExcel } from './utils/excelHelper';
import { orderApiService } from './services/orderApiService';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import './index.css';

export default function App() {
  // Authentication & Session state
  const [currentUserSession, setCurrentUserSession] = useState(() => {
    try {
      const saved = localStorage.getItem('isc_production_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Navigation tab: 'scanner' | 'orders' | 'personnel' | 'guide'
  const [activeTab, setActiveTab] = useState('scanner');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('isc_production_sidebar') === 'true';
  });

  // Helper to detect dummy orders in storage
  const isDummyOrders = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    const dummyNos = ['10048291', '10048292', '10049380', '10049455'];
    return arr.some((o) => dummyNos.includes(String(o.NoProduksi || o.orderNo || '').trim()));
  };

  // Personnel state with localStorage persistence (Defaults to INITIAL_PERSONNEL)
  const [personnel, setPersonnel] = useState(() => {
    try {
      const saved = localStorage.getItem('isc_production_personnel');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_PERSONNEL;
    } catch {
      return INITIAL_PERSONNEL;
    }
  });

  // Orders state with localStorage persistence (Defaults to INITIAL_ORDERS)
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('isc_production_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && !isDummyOrders(parsed)) return parsed;
      }
      return INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  // Admin password with localStorage persistence (Default: 'isc-admin')
  const [adminPassword, setAdminPassword] = useState(() => {
    return localStorage.getItem('isc_production_admin_password') || 'isc-admin';
  });

  // User password with localStorage persistence (Default: 'isc-operator')
  const [userPassword, setUserPassword] = useState(() => {
    return localStorage.getItem('isc_production_user_password') || 'isc-operator';
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
    return localStorage.getItem('isc_production_theme') || 'light';
  });

  // Display zoom level
  const [zoomLevel, setZoomLevel] = useState(() => {
    const saved = localStorage.getItem('isc_production_zoom');
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

  // Sync session to localStorage
  useEffect(() => {
    if (currentUserSession) {
      localStorage.setItem('isc_production_session', JSON.stringify(currentUserSession));
    } else {
      localStorage.removeItem('isc_production_session');
    }
  }, [currentUserSession]);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('isc_production_personnel', JSON.stringify(personnel));
  }, [personnel]);

  useEffect(() => {
    localStorage.setItem('isc_production_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('isc_production_admin_password', adminPassword);
  }, [adminPassword]);

  useEffect(() => {
    localStorage.setItem('isc_production_user_password', userPassword);
  }, [userPassword]);

  useEffect(() => {
    localStorage.setItem('isc_production_zoom', String(zoomLevel));
  }, [zoomLevel]);

  useEffect(() => {
    localStorage.setItem('isc_production_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('isc_production_sidebar', String(sidebarCollapsed));
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
    localStorage.removeItem('isc_production_session');
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
          setOrders(validOrders);
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
      await orderApiService.createOrders(orderData);
      showToast(`Order #${orderData.orderNo} berhasil disimpan ke SharePoint Cloud!`, 'success');
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
      setOrders((prev) =>
        prev.map((o) => {
          if ((orderData.id && o.id === orderData.id) || o.NoProduksi === orderData.orderNo) {
            return {
              ...o,
              ...orderData,
              Status: orderData.status === 1 ? 'Selesai' : 'Berjalan'
            };
          }
          return o;
        })
      );
    } catch (err) {
      showToast(`Gagal mengupdate order: ${err.message}`, 'error');
    } finally {
      setIsLoadingCloud(false);
    }
  };

  // 4. DELETE: Delete order from Cloud SharePoint
  const handleDeleteOrder = async (orderObj) => {
    setIsLoadingCloud(true);
    try {
      if (orderObj.id && orderObj.id > 0) {
        await orderApiService.deleteOrder(orderObj.id);
      }
      setOrders((prev) =>
        prev.filter((o) => o.NoProduksi !== orderObj.NoProduksi && (!orderObj.id || o.id !== orderObj.id))
      );
      if (selectedOrderNo === orderObj.NoProduksi) {
        setSelectedOrderNo('');
      }
      showToast(`Order #${orderObj.NoProduksi} berhasil dihapus dari cloud dan sistem.`, 'success');
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

  // Excel Import Success Handler
  const handleImportSuccess = (newOrders, newPersonnel) => {
    setOrders(newOrders);
    if (newPersonnel && newPersonnel.length > 0) {
      setPersonnel(newPersonnel);
    }
    if (newOrders.length > 0) {
      setSelectedOrderNo(newOrders[0].NoProduksi);
    }
    showToast(
      `Berhasil mengimpor ${newOrders.length} langkah order ke dalam sistem.`,
      'success'
    );
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
      case 'personnel':
        return (
          <PersonnelListView
            personnel={personnel}
            onSelectOperatorAndOpenScanner={handleSelectOperatorAndOpenScanner}
            selectedGroup={selectedGroup}
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
          {renderActiveView()}
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
