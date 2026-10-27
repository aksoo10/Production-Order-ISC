import React, { useMemo } from 'react';
import {
  LogOut,
  Layers,
  UserCheck
} from 'lucide-react';
import andritzLogo from '../assets/andritz-logo.png';
import { INITIAL_PERSONNEL } from '../utils/initialData';

export default function Navbar({
  isAdmin,
  currentUser,
  onLogout,
  selectedGroup,
  setSelectedGroup,
  availableGroups = [],
  personnel = [],
  selectedOperator = null,
  onSelectOperator = () => {}
}) {
  // Ensure all personnel are loaded without exception
  const allPersonnel = useMemo(() => {
    const list = Array.isArray(personnel) && personnel.length > 0 ? personnel : INITIAL_PERSONNEL;
    const map = new Map();
    list.forEach((p) => {
      if (p && (p.NoPersonal || p.Nama)) {
        map.set(String(p.NoPersonal || p.Nama), p);
      }
    });
    INITIAL_PERSONNEL.forEach((base) => {
      if (!map.has(String(base.NoPersonal))) {
        map.set(String(base.NoPersonal), base);
      }
    });
    return Array.from(map.values());
  }, [personnel]);

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

      {/* Right Controls: Filters + Logout */}
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

        {/* Operator Filter (Murni Dropdown Filter, Tanpa Search) */}
        <div className="filter-pill-group">
          <UserCheck size={14} className="filter-icon" />
          <span className="filter-label">OPERATOR:</span>
          <select
            className="filter-select"
            value={selectedOperator?.NoPersonal || ''}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                onSelectOperator(null);
              } else {
                const op = allPersonnel.find((p) => String(p.NoPersonal) === String(val));
                onSelectOperator(op || null);
              }
            }}
            title="Saring data berdasarkan Operator"
          >
            <option value="">Semua Operator ({allPersonnel.length})</option>
            {allPersonnel.map((op) => (
              <option key={op.NoPersonal || op.Nama} value={op.NoPersonal}>
                {op.Nama}
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
