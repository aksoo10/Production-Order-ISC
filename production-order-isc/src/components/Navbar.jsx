import React from 'react';
import {
  LogOut,
  Layers
} from 'lucide-react';
import andritzLogo from '../assets/andritz-logo.png';

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
          <img
            src={andritzLogo}
            alt="ANDRITZ"
            className="andritz-brand-logo-img"
          />
          <span className="andritz-logotype-cyan">ISC</span>
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

      {/* Right Controls: Filter + Logout */}
      <div className="header-right-controls">
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
