import {
  Scan,
  Layers,
  ListChecks,
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
  collapsed,
  setCollapsed,
  ordersCount
}) {
  const navItems = [
    ...(isAdmin ? [{
      id: 'dashboard',
      label: 'Dashboard → Only Chart',
      shortLabel: 'Chart',
      icon: BarChart3,
      badge: 'ADMIN',
      badgeColor: '#8B5CF6',
      desc: 'Database Chart Visualization'
    }] : []),
    {
      id: 'scanner',
      label: 'SAP Scanner Terminal',
      shortLabel: 'Scan',
      icon: Scan,
      badge: 'LIVE',
      badgeColor: '#10B981',
      desc: 'Active Operator & Barcode'
    },
    {
      id: 'orders',
      label: 'Production Order List',
      shortLabel: 'Order',
      icon: Layers,
      badge: ordersCount,
      badgeColor: '#00A3E0',
      desc: 'Step Sequence Monitoring'
    },
    {
      id: 'tracker',
      label: 'Progress Tracker',
      shortLabel: 'Tracker',
      icon: ListChecks,
      badge: 'PROG / FIN',
      badgeColor: '#0284C7',
      desc: 'Step & Barcode Tracking'
    }
  ];

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header with Collapse Button */}
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-title-badge">
            <span className="sidebar-section-title">WORKSHOP NAVIGATION</span>
          </div>
        )}
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="sidebar-body">
        {/* Main Navigation List */}
        <div className="sidebar-nav-section">
          {!collapsed && <div className="sidebar-group-label">WORKSHOP MENU</div>}
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

        {/* Active Operator Card (Shown only for Operator) */}
        {!isAdmin && !collapsed && (
          <div className="sidebar-admin-section">
            <div className="user-mode-card">
              <div className="flex items-center gap-2 mb-1">
                <UserCheck size={14} className="text-cyan" />
                <span className="font-bold text-xs text-white">Active Operator Session</span>
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
          </div>
        )}
      </div>

      {/* Sidebar Footer: Logout */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-logout-btn"
          onClick={onLogout}
          title="Sign out of this session and return to login page"
        >
          <LogOut size={16} />
          {!collapsed && <span>Logout ({isAdmin ? 'Admin' : 'Operator'})</span>}
        </button>
      </div>
    </aside>
  );
}
