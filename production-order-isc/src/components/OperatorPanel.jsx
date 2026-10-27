import React, { useMemo } from 'react';
import { UserCheck, Users, X } from 'lucide-react';
import { INITIAL_PERSONNEL } from '../utils/initialData';
import BarcodeCard from './BarcodeCard';
import SearchableOperatorSelect from './SearchableOperatorSelect';

export default function OperatorPanel({
  personnel = [],
  selectedOperator,
  onSelectOperator,
  selectedGroup
}) {
  // Ensure all personnel are available without exception
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

  const activeOperator = selectedOperator || null;

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
          {allPersonnel.length} Operator
        </span>
      </div>

      {/* Unified Searchable Dropdown Field (Dropdown & Search Combined in 1 Field) */}
      <div className="operator-select-field-section">
        <SearchableOperatorSelect
          personnel={allPersonnel}
          selectedOperator={activeOperator}
          onSelectOperator={onSelectOperator}
          variant="panel"
          selectedGroup={selectedGroup}
        />
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
              title="Ganti atau kosongkan operator"
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
          <div className="prompt-title">Pilih Operator di Dropdown Atas</div>
          <div className="prompt-subtitle">
            Ketik nama atau No. Personal pada kolom dropdown di atas untuk menampilkan Barcode yang akan di-scan ke SAP.
          </div>
        </div>
      )}
    </div>
  );
}
