import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  User,
  UserCheck,
  ChevronDown,
  X,
  Search,
  Check,
  BadgeCheck,
  Plus
} from 'lucide-react';
import { INITIAL_PERSONNEL } from '../utils/initialData';

export default function SearchableOperatorSelect({
  personnel = [],
  selectedOperator = null,
  onSelectOperator,
  variant = 'panel', // 'panel' or 'navbar'
  placeholder = 'Cari atau pilih nama operator...',
  selectedGroup = 'ALL'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Guarantee all personnel are included without exception
  const allPersonnel = useMemo(() => {
    const list = Array.isArray(personnel) && personnel.length > 0 ? personnel : INITIAL_PERSONNEL;
    // Deduplicate by NoPersonal
    const map = new Map();
    list.forEach((p) => {
      if (p && (p.NoPersonal || p.Nama)) {
        map.set(String(p.NoPersonal || p.Nama), p);
      }
    });
    // Ensure base operators are always present
    INITIAL_PERSONNEL.forEach((base) => {
      if (!map.has(String(base.NoPersonal))) {
        map.set(String(base.NoPersonal), base);
      }
    });
    return Array.from(map.values());
  }, [personnel]);

  // Filtered operators based on search term
  const filteredPersonnel = useMemo(() => {
    if (!searchTerm.trim()) {
      return allPersonnel;
    }
    const term = searchTerm.toLowerCase().trim();
    return allPersonnel.filter((p) => {
      const matchName = p.Nama && String(p.Nama).toLowerCase().includes(term);
      const matchNo = p.NoPersonal && String(p.NoPersonal).toLowerCase().includes(term);
      const matchGroup = p.ProductGroup && String(p.ProductGroup).toLowerCase().includes(term);
      return matchName || matchNo || matchGroup;
    });
  }, [allPersonnel, searchTerm]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initials generator
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'OP';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'OP';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSelect = (op) => {
    onSelectOperator(op);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelectOperator(null);
    setSearchTerm('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleCustomEntry = () => {
    const term = searchTerm.trim();
    if (!term) return;
    const customOp = {
      NoPersonal: term,
      Nama: isNaN(Number(term)) ? term : `Operator (${term})`,
      ProductGroup: selectedGroup !== 'ALL' ? selectedGroup : 'PKW'
    };
    handleSelect(customOp);
  };

  const isExactMatch = allPersonnel.some(
    (p) =>
      String(p.NoPersonal).toLowerCase() === searchTerm.trim().toLowerCase() ||
      String(p.Nama).toLowerCase() === searchTerm.trim().toLowerCase()
  );

  // -------------------------------------------------------------
  // VARIANT: NAVBAR (Pill Dropdown Style matching GRUP filter)
  // -------------------------------------------------------------
  if (variant === 'navbar') {
    return (
      <div className="searchable-combobox-wrapper navbar-combobox-wrapper" ref={containerRef}>
        <div
          className={`filter-pill-group navbar-op-pill ${isOpen ? 'active' : ''}`}
          onClick={() => {
            setIsOpen((prev) => !prev);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }}
          title="Pilih operator bengkel"
        >
          <UserCheck size={14} className="filter-icon text-cyan" />
          <span className="filter-label">OPERATOR:</span>
          <span className="navbar-op-current-text">
            {selectedOperator ? (
              <strong>{selectedOperator.Nama}</strong>
            ) : (
              `Semua Operator (${allPersonnel.length})`
            )}
          </span>
          <ChevronDown
            size={13}
            className={`transition-transform duration-200 text-muted ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>

        {isOpen && (
          <div className="searchable-combobox-dropdown navbar-op-dropdown">
            {/* Integrated Search Input */}
            <div className="dropdown-search-header">
              <Search size={14} className="text-cyan flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                className="dropdown-search-input"
                placeholder="Cari nama atau No. Personal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  className="dropdown-clear-btn"
                  onClick={() => setSearchTerm('')}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Dropdown Options List */}
            <div className="dropdown-options-scroll">
              <div
                className={`dropdown-option-item ${!selectedOperator ? 'selected' : ''}`}
                onClick={() => handleSelect(null)}
              >
                <div className="dropdown-option-left">
                  <div className="avatar-chip-xs">ALL</div>
                  <span className="dropdown-op-name">Semua Operator ({allPersonnel.length})</span>
                </div>
                {!selectedOperator && <Check size={14} className="text-cyan" />}
              </div>

              {/* Custom Entry if typed something not in list */}
              {searchTerm.trim() && !isExactMatch && (
                <div
                  className="dropdown-option-item custom-entry"
                  onClick={handleCustomEntry}
                >
                  <div className="dropdown-option-left">
                    <div className="avatar-chip-xs bg-cyan text-white">
                      <Plus size={12} />
                    </div>
                    <span className="dropdown-op-name font-mono">
                      Gunakan: "{searchTerm.trim()}"
                    </span>
                  </div>
                  <span className="custom-entry-badge">Input Manual</span>
                </div>
              )}

              {filteredPersonnel.map((op) => {
                const isSelected =
                  selectedOperator &&
                  String(selectedOperator.NoPersonal) === String(op.NoPersonal);

                return (
                  <div
                    key={op.NoPersonal || op.Nama}
                    className={`dropdown-option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(op)}
                  >
                    <div className="dropdown-option-left">
                      <div className="avatar-chip-xs">{getInitials(op.Nama)}</div>
                      <div className="dropdown-op-meta">
                        <span className="dropdown-op-name">{op.Nama}</span>
                        <span className="dropdown-op-no font-mono">{op.NoPersonal}</span>
                      </div>
                    </div>
                    <div className="dropdown-option-right">
                      <span className="group-pill-xs">{op.ProductGroup || 'PKW'}</span>
                      {isSelected && <BadgeCheck size={15} className="text-cyan" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VARIANT: PANEL (Single Field Combining Dropdown & Search)
  // -------------------------------------------------------------
  return (
    <div className="searchable-combobox-wrapper panel-combobox-wrapper" ref={containerRef}>
      {/* The Single Field with Label, Search Input, and Dropdown Controls */}
      <div
        className={`searchable-combobox-field ${isOpen ? 'focused' : ''} ${selectedOperator ? 'has-selection' : ''}`}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <div className="combobox-field-label">
          <UserCheck size={15} className="text-cyan" />
          <span className="label-text">OPERATOR:</span>
        </div>

        <div className="combobox-field-input-wrap">
          <input
            ref={inputRef}
            type="text"
            className="combobox-field-input"
            placeholder={selectedOperator ? `${selectedOperator.Nama} (No. ${selectedOperator.NoPersonal})` : placeholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
        </div>

        <div className="combobox-field-actions">
          {(selectedOperator || searchTerm) && (
            <button
              type="button"
              className="combobox-action-btn clear-btn"
              onClick={handleClear}
              title="Bersihkan / Kosongkan Operator"
            >
              <X size={14} />
            </button>
          )}

          <button
            type="button"
            className={`combobox-action-btn chevron-btn ${isOpen ? 'open' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen((prev) => !prev);
              if (!isOpen) {
                setTimeout(() => inputRef.current?.focus(), 50);
              }
            }}
            title="Buka / Tutup Daftar Operator"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Dropdown Menu (Contains All Operators Without Exception) */}
      {isOpen && (
        <div className="searchable-combobox-dropdown panel-dropdown-menu">
          <div className="dropdown-menu-header">
            <div className="text-xs text-muted font-semibold uppercase tracking-wider">
              {searchTerm ? `Hasil Pencarian (${filteredPersonnel.length})` : `Semua Operator Terdaftar (${allPersonnel.length})`}
            </div>
            {selectedOperator && (
              <button
                type="button"
                className="text-xs text-cyan hover:underline cursor-pointer"
                onClick={() => handleSelect(null)}
              >
                Reset Pilihan
              </button>
            )}
          </div>

          <div className="dropdown-options-scroll">
            {/* Custom Entry Option if user is typing an unregistered ID */}
            {searchTerm.trim() && !isExactMatch && (
              <div
                className="dropdown-option-item custom-entry"
                onClick={handleCustomEntry}
              >
                <div className="dropdown-option-left">
                  <div className="avatar-chip-xs bg-cyan text-white">
                    <Plus size={13} />
                  </div>
                  <div className="dropdown-op-meta">
                    <span className="dropdown-op-name font-semibold text-cyan">
                      Gunakan No. Personal: "{searchTerm.trim()}"
                    </span>
                    <span className="text-xs text-muted">Input manual untuk scanner SAP</span>
                  </div>
                </div>
                <span className="custom-entry-badge">Gunakan Ini</span>
              </div>
            )}

            {filteredPersonnel.length === 0 && !searchTerm.trim() ? (
              <div className="p-4 text-center text-muted text-xs">
                Tidak ada data operator.
              </div>
            ) : filteredPersonnel.length === 0 && searchTerm.trim() ? (
              <div className="p-4 text-center text-muted text-xs">
                Tidak ditemukan operator dengan nama atau No. Personal "{searchTerm}".
                <div className="mt-1 text-cyan font-medium">
                  Klik opsi input manual di atas untuk tetap menggunakan nomor ini.
                </div>
              </div>
            ) : (
              filteredPersonnel.map((op) => {
                const isSelected =
                  selectedOperator &&
                  String(selectedOperator.NoPersonal) === String(op.NoPersonal);

                return (
                  <div
                    key={op.NoPersonal || op.Nama}
                    className={`dropdown-option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(op)}
                  >
                    <div className="dropdown-option-left">
                      <div className="avatar-chip-sm">{getInitials(op.Nama)}</div>
                      <div className="dropdown-op-meta">
                        <div className="dropdown-op-name-row">
                          <span className="dropdown-op-name">{op.Nama}</span>
                          <span className="group-pill-xs">{op.ProductGroup || 'PKW'}</span>
                        </div>
                        <div className="dropdown-op-no font-mono">
                          No. Personal: <strong>{op.NoPersonal}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="dropdown-option-right">
                      {isSelected ? (
                        <span className="selected-indicator">
                          <BadgeCheck size={18} className="text-cyan" />
                          <span className="text-xs font-semibold text-cyan ml-1">Terpilih</span>
                        </span>
                      ) : (
                        <span className="select-action-text text-xs text-muted">Pilih</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
