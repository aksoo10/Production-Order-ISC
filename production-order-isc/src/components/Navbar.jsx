import React from 'react';
import {
  Shield,
  ShieldCheck,
  LogOut,
  Upload,
  Download,
  Key,
  FileSpreadsheet,
  HelpCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Monitor,
  Sun,
  Moon,
  UserCheck
} from 'lucide-react';

export default function Navbar({
  isAdmin,
  currentUser,
  onLogout,
  onOpenImport,
  onOpenChangePassword,
  onExportExcel,
  onDownloadTemplate,
  onOpenHelp,
  selectedGroup,
  setSelectedGroup,
  availableGroups,
  zoomLevel,
  setZoomLevel,
  theme,
  setTheme
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
            <span className="brand-tag-bengkel">BENGKEL PRODUKSI</span>
          </div>
          <div className="brand-unit-sub font-mono">
            Production Order Tracking & SAP Confirmation Barcode System
          </div>
        </div>
      </div>

      {/* Middle Controls: Filter, Zoom, and Theme Toggle */}
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

        {/* Display Zoom Level */}
        <div className="zoom-controls-wrapper" title="Sesuaikan ukuran tampilan layar monitor bengkel">
          <Monitor size={14} color="#94A3B8" />
          <button
            type="button"
            className="zoom-btn"
            onClick={() => setZoomLevel((z) => Math.max(85, z - 10))}
            title="Perkecil layar"
          >
            <ZoomOut size={13} />
          </button>
          <span className="zoom-value font-mono">{zoomLevel}%</span>
          <button
            type="button"
            className="zoom-btn"
            onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
            title="Perbesar layar (Ctrl +)"
          >
            <ZoomIn size={13} />
          </button>
          {zoomLevel !== 100 && (
            <button
              type="button"
              className="zoom-reset-btn"
              onClick={() => setZoomLevel(100)}
              title="Reset ke 100%"
            >
              <RotateCcw size={12} />
            </button>
          )}
        </div>

        {/* Theme Toggle (Light / Dark) */}
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          title={theme === 'light' ? 'Ubah ke Mode Gelap' : 'Ubah ke Mode Terang (Standar ANDRITZ)'}
        >
          {theme === 'light' ? <Moon size={14} color="#38BDF8" /> : <Sun size={14} color="#FBBF24" />}
          <span>{theme === 'light' ? 'Gelap' : 'Terang'}</span>
        </button>
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
