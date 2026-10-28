import React from 'react';
import {
  Scan,
  Layers,
  ListChecks,
  Download,
  Upload,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  BarChart3
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  isAdmin,
  currentUser,
  onLogout,
  onOpenImport,
  onExportExcel,
  collapsed,
  setCollapsed,
  ordersCount
}) {
  const navItems = [
    {
      id: 'scanner',
      label: 'Terminal Scanner SAP',
      shortLabel: 'Scan',
      icon: Scan,
      badge: 'LIVE',
      badgeColor: '#10B981',
      desc: 'Kolom Operator & Barcode Aktif'
    },
    {
      id: 'orders',
      label: 'Daftar Order Produksi',
      shortLabel: 'Order',
      icon: Layers,
      badge: ordersCount,
      badgeColor: '#00A3E0',
      desc: 'Monitoring Rangkaian Langkah'
    },
    {
      id: 'tracker',
      label: 'Progress Tracker',
      shortLabel: 'Tracker',
      icon: ListChecks,
      badge: 'PROG / FIN',
      badgeColor: '#0284C7',
      desc: 'Pelacakan Langkah & Barcode'
    },
    ...(isAdmin ? [{
      id: 'dashboard',
      label: 'Dashboard → Only Chart',
      shortLabel: 'Chart',
      icon: BarChart3,
      badge: 'ADMIN',
      badgeColor: '#8B5CF6',
      desc: 'Visualisasi Grafik Database'
    }] : [])
  ];

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header with Collapse Button */}
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-title-badge">
            <span className="sidebar-section-title">NAVIGASI BENGKEL</span>
          </div>
        )}
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Scrollable Body: Workshop Navigation & Supervisor Controls directly together */}
      <div className="sidebar-body">
        {/* Main Navigation List */}
        <div className="sidebar-nav-section">
          {!collapsed && <div className="sidebar-group-label">MENU WORKSHOP</div>}
          <nav className="sidebar-nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                  title={collapsed ? item.label : undefined}
                >
                  <div className="nav-item-icon-wrapper">
                    <Icon size={18} />
                  </div>

                  {!collapsed && (
                    <div className="nav-item-text-group">
                      <span className="nav-item-label">{item.label}</span>
                      <span className="nav-item-desc">{item.desc}</span>
                    </div>
                  )}

                  {!collapsed && item.badge && (
                    <span
                      className="nav-item-badge"
                      style={{ backgroundColor: `${item.badgeColor}22`, color: item.badgeColor }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Admin Operations Section or Active Operator Card */}
        <div className="sidebar-admin-section">
          {isAdmin ? (
            <>
              {!collapsed && (
                <div className="sidebar-group-label flex items-center justify-between">
                  <span>KONTROL SUPERVISOR</span>
                  <span className="admin-status-dot"></span>
                </div>
              )}
              <div className="sidebar-admin-actions">
                {onOpenImport && (
                  <button
                    type="button"
                    className="sidebar-action-btn"
                    onClick={onOpenImport}
                    title="Impor order produksi dari file Excel (.xlsx / .xls)"
                  >
                    <Upload size={16} />
                    {!collapsed && <span>Impor Order (Excel)</span>}
                  </button>
                )}
                <button
                  type="button"
                  className="sidebar-action-btn"
                  onClick={onExportExcel}
                  title="Unduh status order terbaru ke Excel"
                >
                  <Download size={16} />
                  {!collapsed && <span>Unduh Order (Excel)</span>}
                </button>
              </div>
            </>
          ) : (
            /* Operator Status Info */
            !collapsed && (
              <div className="user-mode-card">
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck size={14} className="text-cyan" />
                  <span className="font-bold text-xs text-white">Sesi Operator Aktif</span>
                </div>
                <div className="text-xs font-semibold text-main mb-1" style={{ color: '#E2E8F0' }}>
                  {currentUser?.username || 'Operator'}
                </div>
                {currentUser?.operator?.NoPersonal && (
                  <div className="text-xs font-mono text-muted">
                    ID: <span className="text-cyan">{currentUser.operator.NoPersonal}</span> ({currentUser.operator.ProductGroup || 'PKW'})
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Sidebar Footer: Logout */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-logout-btn"
          onClick={onLogout}
          title="Keluar dari sesi ini dan kembali ke halaman login"
        >
          <LogOut size={16} />
          {!collapsed && <span>Keluar ({isAdmin ? 'Admin' : 'Operator'})</span>}
        </button>
      </div>
    </aside>
  );
}
