import React, { useState, useMemo } from 'react';
import { UserCheck, Users, CheckCircle2, Search, X } from 'lucide-react';
import { INITIAL_PERSONNEL, isDummyPersonnel } from '../utils/initialData';

export default function OperatorPanel({
  personnel = [],
  selectedOperator,
  onSelectOperator
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Ensure all personnel are available without exception
  const allPersonnel = useMemo(() => {
    const list = Array.isArray(personnel) && personnel.length > 0 ? personnel : INITIAL_PERSONNEL;
    const map = new Map();
    list.forEach((p) => {
      if (p && (p.NoPersonal || p.Nama) && !isDummyPersonnel(p)) {
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

  const activeOperator = selectedOperator || null;

  // Handle search input changes, supporting quick barcode scanning of Personnel No.
  const handleSearchChange = (val) => {
    setSearchTerm(val);
    const trimmed = val.trim();
    if (trimmed) {
      const exact = allPersonnel.find(
        (p) => String(p.NoPersonal).toLowerCase() === trimmed.toLowerCase()
      );
      if (exact) {
        onSelectOperator(exact);
      }
    }
  };

  // Support Enter key in search box to select top matching operator
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && filteredPersonnel.length > 0) {
      e.preventDefault();
      onSelectOperator(filteredPersonnel[0]);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const isActiveInFiltered = Boolean(
    activeOperator &&
    filteredPersonnel.some((p) => String(p.NoPersonal) === String(activeOperator.NoPersonal))
  );

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
          <div className="panel-step-badge">COLUMN 1</div>
          <h2 className="panel-title">Workshop Operators (Personnel)</h2>
        </div>
        <span className="panel-count-badge">
          <Users size={13} />
          {allPersonnel.length} Operators
        </span>
      </div>

      {/* Operator Filter & Search Bar (Divided into 2: Search & Filter Nama Operator) */}
      <div className="operator-selector-bar">
        {/* 1. Search Box */}
        <div className="panel-search-box operator-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search operator, No. Personal..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search operator"
          />
          {searchTerm && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={handleClearSearch}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 2. Filter Nama Operator Dropdown */}
        <div className="operator-filter-pill-container">
          <div className="combobox-field-label">
            <UserCheck size={16} className="text-cyan" />
            <span className="label-text">OPERATOR:</span>
          </div>
          <select
            className="operator-select-dropdown"
            value={isActiveInFiltered ? (activeOperator?.NoPersonal || '') : ''}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                onSelectOperator(null);
              } else {
                const op = allPersonnel.find((p) => String(p.NoPersonal) === String(val));
                onSelectOperator(op || null);
              }
            }}
            title={activeOperator ? `${activeOperator.Nama} — Personnel No.: ${activeOperator.NoPersonal} (${activeOperator.ProductGroup || 'PKW'})` : "Select Workshop Operator"}
          >
            <option value="">
              {searchTerm.trim()
                ? (filteredPersonnel.length > 0 ? `-- Filtered (${filteredPersonnel.length}) --` : '-- No operator found --')
                : `-- Select Operator (${allPersonnel.length}) --`}
            </option>
            {filteredPersonnel.map((op) => (
              <option key={op.NoPersonal || op.Nama} value={op.NoPersonal}>
                {op.Nama} — Personnel No.: {op.NoPersonal} ({op.ProductGroup || 'PKW'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Operator Highlight & Barcode (Ready for Scanner) */}
      {activeOperator ? (
        <div className="selected-operator-showcase">
          <div className="showcase-header">
            <div className="showcase-avatar">
              {getInitials(activeOperator.Nama)}
            </div>
            <div className="showcase-meta">
              <div className="showcase-name-row">
                <h3 className="showcase-name">{activeOperator.Nama}</h3>
                <span className="group-tag">{activeOperator.ProductGroup || 'GENERAL'}</span>
              </div>
              <div className="showcase-no font-mono">
                Personnel No.: <strong>{activeOperator.NoPersonal}</strong>
              </div>
            </div>
          </div>

          {/* Active Operator Status Tag */}
          <div className="operator-active-indicator flex items-center justify-between p-2 rounded bg-cyan/10 border border-cyan/30">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-cyan" />
              <span className="text-xs font-semibold text-cyan">Operator Aktif</span>
            </div>
            <span className="text-xs text-muted font-mono">Langkah 1 Barcode</span>
          </div>
        </div>
      ) : (
        <div className="operator-select-prompt">
          <UserCheck size={32} className="text-cyan mb-2" />
          <div className="prompt-title">Select Operator from Dropdown Above</div>
          <div className="prompt-subtitle">
            Select an operator name from the filter dropdown above to activate barcode scanning in SAP.
          </div>
        </div>
      )}
    </div>
  );
}
