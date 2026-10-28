import React, { useState, useMemo } from 'react';
import { Users, Search, Scan } from 'lucide-react';
import BarcodeCard from '../BarcodeCard';

export default function PersonnelListView({
  personnel,
  onSelectOperatorAndOpenScanner,
  selectedGroup
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    return personnel.filter((person) => {
      const matchesGroup =
        selectedGroup === 'ALL' ||
        (person.ProductGroup && person.ProductGroup.toUpperCase() === selectedGroup.toUpperCase());

      if (!matchesGroup) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchName = person.Nama && String(person.Nama).toLowerCase().includes(term);
      const matchNo = person.NoPersonal && String(person.NoPersonal).toLowerCase().includes(term);

      return matchName || matchNo;
    });
  }, [personnel, selectedGroup, searchTerm]);

  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'OP';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'OP';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header-row">
        <div>
          <h2 className="view-title">Data Personel & Barcode Operator Bengkel</h2>
          <p className="view-subtitle">
            Katalog ID personel bengkel ISC untuk pemindaian No. Personal langsung ke SAP
          </p>
        </div>

        <div className="panel-search-box" style={{ width: '320px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Cari nama operator, No. Personal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid of Personnel Cards */}
      <div className="personnel-grid">
        {filtered.length === 0 ? (
          <div className="empty-state-large" style={{ gridColumn: '1 / -1' }}>
            <Users size={32} className="text-muted mb-2" />
            <div className="font-bold text-main">Tidak ada operator yang cocok</div>
            <div className="text-xs text-muted">Coba ubah kata kunci pencarian atau filter grup di atas.</div>
          </div>
        ) : (
          filtered.map((op, idx) => (
            <div key={op.NoPersonal || op.Nama || idx} className="personnel-card">
              <div className="personnel-card-header">
                <div className="showcase-avatar">
                  {getInitials(op.Nama)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-main text-base">{op.Nama}</h4>
                    <span className="group-tag">{op.ProductGroup || 'PKW'}</span>
                  </div>
                  <div className="text-xs font-mono text-muted">
                    No. Personal: <strong className="text-cyan">{op.NoPersonal}</strong>
                  </div>
                </div>
              </div>

              {/* Barcode of NoPersonal */}
              <div className="personnel-barcode-box">
                <BarcodeCard
                  value={op.NoPersonal}
                  label="NO. PERSONAL"
                  subtitle={op.Nama}
                  badgeText="Scan ke SAP"
                  height={56}
                  fontSize={15}
                  compact={true}
                />
              </div>

              <div className="personnel-card-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-cyan w-full"
                  onClick={() => onSelectOperatorAndOpenScanner(op)}
                  title="Pilih operator ini dan buka di terminal scanner"
                >
                  <Scan size={14} />
                  <span>Gunakan di Terminal Scanner</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
