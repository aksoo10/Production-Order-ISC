import React, { useState, useMemo } from 'react';
import { Search, UserCheck, Users, BadgeCheck, ShieldAlert, X } from 'lucide-react';
import { isDummyPersonnel } from '../utils/initialData';
import BarcodeCard from './BarcodeCard';

export default function OperatorPanel({
  personnel = [],
  selectedOperator,
  onSelectOperator,
  selectedGroup
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter out any dummy operators
  const cleanPersonnel = useMemo(() => {
    return (personnel || []).filter((p) => !isDummyPersonnel(p));
  }, [personnel]);

  // Safeguard selectedOperator from showing dummy data
  const activeOperator = selectedOperator && !isDummyPersonnel(selectedOperator) ? selectedOperator : null;

  // Filter personnel by search term and selectedGroup
  const filteredPersonnel = useMemo(() => {
    return cleanPersonnel.filter((person) => {
      // Group filter check
      const matchesGroup =
        selectedGroup === 'ALL' ||
        (person.ProductGroup && person.ProductGroup.toUpperCase() === selectedGroup.toUpperCase());

      if (!matchesGroup) return false;

      // Search term check (name or NoPersonal)
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchName = person.Nama && String(person.Nama).toLowerCase().includes(term);
      const matchNo = person.NoPersonal && String(person.NoPersonal).toLowerCase().includes(term);

      return matchName || matchNo;
    });
  }, [cleanPersonnel, searchTerm, selectedGroup]);

  // Generate initials for avatar
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'OP';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'OP';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="panel-container operator-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-title-group">
          <div className="panel-step-badge">KOLOM 1</div>
          <h2 className="panel-title">Operator Bengkel (Personel)</h2>
        </div>
        <span className="panel-count-badge">
          <Users size={13} />
          {cleanPersonnel.length} Operator
        </span>
      </div>

      {/* Search Bar */}
      <div className="panel-search-box">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Ketik nama atau No. Personal..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => setSearchTerm('')}
            title="Bersihkan pencarian"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Direct entry action if searching for an unregistered No. Personal */}
      {searchTerm.trim() && (
        <div className="px-3 pt-1 pb-2">
          <button
            type="button"
            className="btn btn-outline-cyan btn-sm w-full flex items-center justify-center gap-1.5 text-xs"
            onClick={() => {
              const term = searchTerm.trim();
              const customOp = {
                NoPersonal: term,
                Nama: isNaN(Number(term)) ? term : `Operator (${term})`,
                ProductGroup: selectedGroup !== 'ALL' ? selectedGroup : 'PKW'
              };
              onSelectOperator(customOp);
            }}
          >
            <UserCheck size={14} />
            <span>Gunakan No. Personal "{searchTerm.trim()}"</span>
          </button>
        </div>
      )}

      {/* Selected Operator Highlight & Barcode (High Priority for Scanner) */}
      {activeOperator ? (
        <div className="selected-operator-showcase">
          <div className="showcase-header">
            <div className="showcase-avatar">
              {getInitials(activeOperator.Nama)}
            </div>
            <div className="showcase-meta">
              <div className="showcase-name-row">
                <h3 className="showcase-name">{activeOperator.Nama}</h3>
                <span className="group-tag">{activeOperator.ProductGroup || 'UMUM'}</span>
              </div>
              <div className="showcase-no font-mono">
                No. Personal: <strong>{activeOperator.NoPersonal}</strong>
              </div>
            </div>
            <button
              type="button"
              className="btn-icon-subtle"
              onClick={() => onSelectOperator(null)}
              title="Ganti operator"
            >
              <X size={16} />
            </button>
          </div>

          {/* Barcode of NoPersonal */}
          <div className="showcase-barcode-section">
            <BarcodeCard
              value={activeOperator.NoPersonal}
              label="BARCODE NO. PERSONAL"
              subtitle={`Operator: ${activeOperator.Nama} (${activeOperator.ProductGroup || '-'})`}
              badgeText="1. Scan No. Personal ke SAP"
              highlightColor="#00A3E0"
              height={64}
              fontSize={16}
            />
          </div>
        </div>
      ) : (
        <div className="operator-select-prompt">
          <UserCheck size={32} className="text-cyan mb-2" />
          <div className="prompt-title">Pilih Operator di Bawah</div>
          <div className="prompt-subtitle">
            Ketik No. Personal pada pencarian di atas atau pilih operator untuk menampilkan Barcode yang akan di-scan ke SAP.
          </div>
        </div>
      )}

      {/* Operator List */}
      <div className="operator-list-section">
        <div className="section-label">Daftar Operator Terdaftar:</div>
        <div className="operator-cards-scroll">
          {cleanPersonnel.length === 0 ? (
            <div className="empty-state-small">
              <UserCheck size={22} className="text-muted mb-1" />
              <div className="font-semibold text-xs text-white mb-0.5">Belum Ada Operator Terdaftar</div>
              <span className="text-muted text-xs">
                Ketik No. Personal pada kolom pencarian di atas untuk membuat barcode langsung.
              </span>
            </div>
          ) : filteredPersonnel.length === 0 ? (
            <div className="empty-state-small">
              <ShieldAlert size={20} className="text-warning mb-1" />
              <span>Tidak ada operator yang cocok dengan filter.</span>
            </div>
          ) : (
            filteredPersonnel.map((op, idx) => {
              const isSelected =
                activeOperator && String(activeOperator.NoPersonal) === String(op.NoPersonal);

              return (
                <div
                  key={op.NoPersonal || op.Nama || idx}
                  className={`operator-item-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectOperator(op)}
                >
                  <div className="operator-card-left">
                    <div className="avatar-chip">{getInitials(op.Nama)}</div>
                    <div className="operator-card-info">
                      <div className="operator-card-name">{op.Nama}</div>
                      <div className="operator-card-no font-mono">
                        No. Personal: <span>{op.NoPersonal}</span>
                      </div>
                    </div>
                  </div>

                  <div className="operator-card-right">
                    <span className="group-pill">{op.ProductGroup || 'PKW'}</span>
                    {isSelected && <BadgeCheck size={18} color="#00A3E0" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
