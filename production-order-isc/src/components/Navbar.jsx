import React from 'react';
import {
  ShieldCheck,
  LogOut,
  Layers,
  UserCheck
} from 'lucide-react';

export default function Navbar({
  isAdmin,
  currentUser,
  onLogout,
  selectedGroup,
  setSelectedGroup,
  availableGroups
}) {
  return (
    <header className="app-header">
      {/* Brand & Title: Official ANDRITZ Corporate Identity */}
      <div className="header-brand-section">
        <div className="andritz-logo-container">
          <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="14" fill="#00A3E0"/>
            <path d="M50 18L77 78H62.5L56.5 63H43.5L37.5 78H23L50 18ZM50 36L46.5 52H53.5L50 36Z" fill="white"/>
          </svg>
          <div className="andritz-logotype">
            ANDRITZ <span className="andritz-logotype-cyan">ISC</span>
          </div>
        </div>

        <div className="brand-divider"></div>

        <div className="brand-meta-group">
          <div className="brand-unit-title">
            <span>INDONESIA SERVICE CENTER</span>
          </div>
          <div className="brand-unit-sub font-mono">
            Production Order Tracking & SAP Confirmation Barcode System
          </div>
        </div>
      </div>

      {/* Middle Controls: Filter */}
      <div className="header-center-controls">
        {/* Product Group Filter */}
        <div className="filter-pill-group">
          <Layers size={14} className="filter-icon" />
          <span className="filter-label">Grup:</span>
          <select
            className="filter-select"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            title="Saring data berdasarkan Product Group"
          >
            <option value="ALL">Semua Grup ({availableGroups.length})</option>
            {availableGroups.map((grp) => (
              <option key={grp} value={grp}>
                Grup {grp}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Controls: User Profile Info & Logout */}
      <div className="header-right-controls">
        {/* User Session Pill */}
        <div className={`status-mode-pill ${isAdmin ? 'admin-mode' : 'user-mode'}`}>
          {isAdmin ? (
            <>
              <ShieldCheck size={15} color="#34D399" />
              <span>Admin: {currentUser?.username || 'Supervisor'}</span>
            </>
          ) : (
            <>
              <UserCheck size={14} color="#38BDF8" />
              <span>Operator: {currentUser?.username || 'Operator'}</span>
            </>
          )}
        </div>

        {/* Logout Button */}
        <button
          type="button"
          className="btn btn-sm btn-danger-soft"
          onClick={onLogout}
          title="Keluar dari sesi ini dan kembali ke halaman login"
        >
          <LogOut size={14} />
          <span>Keluar</span>
        </button>
      </div>
    </header>
  );
}
