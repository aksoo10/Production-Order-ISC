import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  CheckCheck,
  RotateCcw,
  AlertCircle,
  FileText,
  Scan,
  X
} from 'lucide-react';
import BarcodeCard from './BarcodeCard';

export default function OrderPanel({
  orders,
  selectedOrderNo,
  onSelectOrderNo,
  onMarkStepFinished,
  onResetOrderSteps,
  isAdmin,
  selectedGroup
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Group all order steps by NoProduksi
  const ordersGrouped = useMemo(() => {
    const map = new Map();

    orders.forEach((step) => {
      const orderNo = String(step.NoProduksi).trim();
      if (!map.has(orderNo)) {
        map.set(orderNo, {
          NoProduksi: orderNo,
          ProductGroup: step.ProductGroup || '',
          steps: []
        });
      }
      map.get(orderNo).steps.push(step);
    });

    // Sort steps inside each order by Langkah (numeric)
    const result = Array.from(map.values()).map((order) => {
      const sortedSteps = [...order.steps].sort((a, b) => Number(a.Langkah) - Number(b.Langkah));
      
      // Calculate progress
      const totalSteps = sortedSteps.length;
      const completedSteps = sortedSteps.filter(
        (s) => String(s.Status).toLowerCase() === 'selesai'
      ).length;
      const isComplete = completedSteps === totalSteps && totalSteps > 0;

      // Find the ONE active step: the first step where Status !== 'Selesai'
      const activeStep = sortedSteps.find(
        (s) => String(s.Status).toLowerCase() !== 'selesai'
      ) || null;

      return {
        ...order,
        steps: sortedSteps,
        totalSteps,
        completedSteps,
        isComplete,
        activeStep
      };
    });

    return result;
  }, [orders]);

  // Filter orders by selectedGroup and searchTerm
  const filteredOrders = useMemo(() => {
    return ordersGrouped.filter((order) => {
      // Group filter check
      const matchesGroup =
        selectedGroup === 'ALL' ||
        (order.ProductGroup && order.ProductGroup.toUpperCase() === selectedGroup.toUpperCase());

      if (!matchesGroup) return false;

      // Search term check
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchNo = String(order.NoProduksi || '').toLowerCase().includes(term);
      const matchStepDesc = order.steps.some((s) => String(s.NamaLangkah || '').toLowerCase().includes(term));
      const matchKonf = order.steps.some((s) => String(s.NoKonfirmasi || '').toLowerCase().includes(term));

      return matchNo || matchStepDesc || matchKonf;
    });
  }, [ordersGrouped, selectedGroup, searchTerm]);

  // Get current selected order object
  const currentOrder = useMemo(() => {
    if (!selectedOrderNo) return null;
    return ordersGrouped.find((o) => o.NoProduksi === selectedOrderNo) || null;
  }, [ordersGrouped, selectedOrderNo]);

  return (
    <div className="panel-container order-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-title-group">
          <div className="panel-step-badge">KOLOM 2</div>
          <h2 className="panel-title">Order Produksi (SAP Order & Langkah)</h2>
        </div>
        <span className="panel-count-badge">
          <FileText size={13} />
          {filteredOrders.length} Order
        </span>
      </div>

      {/* Order Search & Selector Bar */}
      <div className="order-selector-bar">
        <div className="panel-search-box flex-1">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Cari No. Produksi atau langkah kerja..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchTerm('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown Shortcut */}
        <select
          className="order-quick-dropdown"
          value={selectedOrderNo || ''}
          onChange={(e) => onSelectOrderNo(e.target.value)}
        >
          <option value="">-- Pilih No. Produksi --</option>
          {filteredOrders.map((ord) => (
            <option key={ord.NoProduksi} value={ord.NoProduksi}>
              Order {ord.NoProduksi} ({ord.completedSteps}/{ord.totalSteps} Selesai) - {ord.ProductGroup}
            </option>
          ))}
        </select>
      </div>

      {/* Main Order View Area */}
      {currentOrder ? (
        <div className="order-details-wrapper">
          {/* Order Summary Ribbon */}
          <div className="order-summary-ribbon">
            <div className="ribbon-left">
              <span className="order-label">NOMOR PRODUKSI:</span>
              <h3 className="order-number-title font-mono">{currentOrder.NoProduksi}</h3>
              <span className="group-tag">{currentOrder.ProductGroup || 'PKW'}</span>
            </div>

            <div className="ribbon-right">
              <div className="progress-stat-block">
                <span className="progress-text font-mono">
                  {currentOrder.completedSteps} dari {currentOrder.totalSteps} Langkah Selesai
                </span>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${(currentOrder.completedSteps / Math.max(1, currentOrder.totalSteps)) * 100}%`
                    }}
                  ></div>
                </div>
              </div>

              {currentOrder.isComplete && (
                <div className="completed-badge-pill">
                  <CheckCheck size={16} />
                  <span>Order Selesai</span>
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE STEP SPOTLIGHT (The Core Requirement for the Workshop Screen) */}
          {currentOrder.activeStep ? (
            <div className="active-step-spotlight-card">
              <div className="spotlight-top-badge">
                <div className="flex items-center gap-2">
                  <span className="active-pulse-dot"></span>
                  <span className="font-heading font-bold text-cyan tracking-wider">LANGKAH AKTIF SAAT INI</span>
                </div>
                <span className="step-seq-pill">
                  Langkah ke-{currentOrder.activeStep.Langkah} dari {currentOrder.totalSteps}
                </span>
              </div>

              <div className="spotlight-content-grid">
                {/* Left: Step Description & Admin Completion Button */}
                <div className="spotlight-info-col">
                  <div className="step-name-box">
                    <span className="text-muted text-xs tracking-wider uppercase font-semibold">Nama Langkah:</span>
                    <h4 className="active-step-title">{currentOrder.activeStep.NamaLangkah}</h4>
                  </div>

                  <div className="konfirmasi-meta-box">
                    <span className="text-muted text-xs tracking-wider uppercase font-semibold">No. Konfirmasi SAP:</span>
                    <div className="konfirmasi-display font-mono">
                      <span>{currentOrder.activeStep.NoKonfirmasi}</span>
                    </div>
                  </div>

                  {/* Admin-only "Tandai Selesai" button */}
                  {isAdmin ? (
                    <div className="admin-step-action-box">
                      <div className="admin-action-hint">
                        <Sparkles size={14} color="#F59E0B" />
                        <span>Aksi Admin: Klik tombol di bawah untuk menyelesaikan langkah ini dan mengaktifkan langkah berikutnya.</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-success-gradient w-full"
                        onClick={() => onMarkStepFinished(currentOrder.NoProduksi, currentOrder.activeStep.Langkah)}
                        title="Tandai langkah aktif ini selesai dan lanjutkan ke langkah berikutnya"
                      >
                        <CheckCircle2 size={18} />
                        <span>Tandai Selesai & Lanjut Langkah Berikutnya</span>
                      </button>
                    </div>
                  ) : (
                    <div className="user-scan-guide-box">
                      <Scan size={18} color="#00A3E0" className="pulse-icon" />
                      <span>
                        Operator bengkel: Scan barcode No. Konfirmasi di samping ke layar SAP monitor Anda.
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: Crisp Barcode of NoKonfirmasi for Scanner */}
                <div className="spotlight-barcode-col">
                  <BarcodeCard
                    value={currentOrder.activeStep.NoKonfirmasi}
                    label="BARCODE NO. KONFIRMASI"
                    subtitle={`Langkah ${currentOrder.activeStep.Langkah}: ${currentOrder.activeStep.NamaLangkah}`}
                    badgeText="2. Scan No. Konfirmasi ke SAP"
                    highlightColor="#00A3E0"
                    height={72}
                    width={2.4}
                    fontSize={17}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="order-all-completed-banner">
              <CheckCheck size={40} color="#10B981" />
              <div className="all-completed-title">Semua Langkah Order Ini Telah Selesai!</div>
              <div className="all-completed-subtitle">
                Seluruh {currentOrder.totalSteps} langkah telah selesai diproses di bengkel ISC.
              </div>
              {isAdmin && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline mt-3"
                  onClick={() => onResetOrderSteps(currentOrder.NoProduksi)}
                  title="Reset status semua langkah order ini kembali ke Berjalan (Hanya untuk keperluan testing)"
                >
                  <RotateCcw size={14} />
                  <span>Reset Langkah Order (Mode Tes)</span>
                </button>
              )}
            </div>
          )}

          {/* ALL STEPS SEQUENCE TABLE */}
          <div className="steps-sequence-section">
            <div className="steps-section-header">
              <h4 className="steps-section-title font-heading">
                Rangkaian Seluruh Langkah ({currentOrder.steps.length} Langkah):
              </h4>
              <span className="text-xs text-muted">
                {isAdmin ? 'Admin dapat menandai selesai tiap langkah' : 'Satu langkah aktif ditandai secara berurutan'}
              </span>
            </div>

            <div className="steps-table-container">
              <table className="steps-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Langkah</th>
                    <th>Nama Langkah</th>
                    <th style={{ width: '170px' }}>No. Konfirmasi</th>
                    <th style={{ width: '140px' }}>Status</th>
                    {isAdmin && <th style={{ width: '130px', textAlign: 'center' }}>Aksi Admin</th>}
                  </tr>
                </thead>
                <tbody>
                  {currentOrder.steps.map((st) => {
                    const isStepComplete = String(st.Status).toLowerCase() === 'selesai';
                    const isActive =
                      currentOrder.activeStep &&
                      Number(currentOrder.activeStep.Langkah) === Number(st.Langkah);

                    return (
                      <tr
                        key={st.Langkah}
                        className={`step-row ${isActive ? 'row-active' : ''} ${isStepComplete ? 'row-completed' : ''}`}
                      >
                        {/* Step Number */}
                        <td className="step-num-cell">
                          <span className={`step-badge-number ${isActive ? 'active' : ''} ${isStepComplete ? 'done' : ''}`}>
                            {isStepComplete ? <CheckCircle2 size={13} /> : st.Langkah}
                          </span>
                        </td>

                        {/* Step Name */}
                        <td className="step-name-cell">
                          <div className="step-name-text">{st.NamaLangkah}</div>
                          {isActive && (
                            <span className="active-tag-inline">
                              <span className="active-pulse-mini"></span> Langkah Aktif
                            </span>
                          )}
                        </td>

                        {/* No Konfirmasi */}
                        <td className="step-konf-cell font-mono">
                          <span className="konf-number">{st.NoKonfirmasi}</span>
                        </td>

                        {/* Status Badge */}
                        <td className="step-status-cell">
                          {isStepComplete ? (
                            <span className="status-badge status-selesai">
                              <CheckCircle2 size={12} />
                              Selesai
                            </span>
                          ) : isActive ? (
                            <span className="status-badge status-berjalan active">
                              <span className="pulse-dot-small"></span>
                              Langkah Aktif
                            </span>
                          ) : (
                            <span className="status-badge status-pending">
                              <Clock size={12} />
                              Menunggu
                            </span>
                          )}
                        </td>

                        {/* Admin Action */}
                        {isAdmin && (
                          <td className="step-action-cell" style={{ textAlign: 'center' }}>
                            {isActive ? (
                              <button
                                type="button"
                                className="btn btn-xs btn-success"
                                onClick={() => onMarkStepFinished(currentOrder.NoProduksi, st.Langkah)}
                                title="Tandai Selesai"
                              >
                                <CheckCircle2 size={12} />
                                <span>Selesai</span>
                              </button>
                            ) : isStepComplete ? (
                              <span className="text-xs text-muted font-mono">Terverifikasi</span>
                            ) : (
                              <span className="text-xs text-muted">-</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Empty / Select Prompt */
        <div className="order-empty-prompt">
          <div className="order-cards-quick-grid">
            {filteredOrders.slice(0, 6).map((ord) => (
              <div
                key={ord.NoProduksi}
                className="order-quick-card"
                onClick={() => onSelectOrderNo(ord.NoProduksi)}
              >
                <div className="quick-card-top">
                  <span className="quick-card-no font-mono">{ord.NoProduksi}</span>
                  <span className="group-tag">{ord.ProductGroup}</span>
                </div>
                <div className="quick-card-steps">
                  <span>{ord.completedSteps} / {ord.totalSteps} Selesai</span>
                  <div className="mini-progress-track">
                    <div
                      className="mini-progress-fill"
                      style={{ width: `${(ord.completedSteps / Math.max(1, ord.totalSteps)) * 100}%` }}
                    ></div>
                  </div>
                </div>
                {ord.activeStep && (
                  <div className="quick-card-active-step">
                    Aktif: Step {ord.activeStep.Langkah} - {ord.activeStep.NamaLangkah}
                  </div>
                )}
                <div className="quick-card-footer">
                  <span>Buka Order & Barcode</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>

          <div className="prompt-instruction-banner">
            <Layers size={22} className="text-cyan mb-1" />
            <div className="instruction-title">Pilih Nomor Order Produksi</div>
            <p className="instruction-text">
              Pilih salah satu order produksi di atas atau melalui kolom pencarian untuk menampilkan rangkaian langkah kerja dan barcode konfirmasi SAP.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
