import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Layers,
  ChevronRight,
  CheckCheck,
  FileText,
  X,
  Clock,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import BarcodeCard from './BarcodeCard';

export default function OrderPanel({
  orders,
  selectedOrderNo,
  onSelectOrderNo,
  onMarkStepFinished,
  onRevertStep,
  onUpdateStepStatus,
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

  // Operator-selected step state (defaults to null to auto-follow activeStep)
  const [selectedStepNum, setSelectedStepNum] = useState(null);

  // Reset selected step when selectedOrderNo changes
  useEffect(() => {
    setSelectedStepNum(null);
  }, [selectedOrderNo]);

  // Determine step to display in Spotlight card and dropdown
  const displayStep = useMemo(() => {
    if (!currentOrder || !currentOrder.steps || currentOrder.steps.length === 0) return null;
    if (selectedStepNum !== null) {
      const found = currentOrder.steps.find((s) => Number(s.Langkah) === Number(selectedStepNum));
      if (found) return found;
    }
    // If there is an active (incomplete) step, show it
    if (currentOrder.activeStep) {
      return currentOrder.activeStep;
    }
    // If all steps completed, show the last step so its barcode can still be scanned!
    return currentOrder.steps[currentOrder.steps.length - 1] || currentOrder.steps[0] || null;
  }, [currentOrder, selectedStepNum]);

  // Determine next step in sequence relative to current displayStep
  const nextStep = useMemo(() => {
    if (!currentOrder || !displayStep) return null;
    return currentOrder.steps.find((s) => Number(s.Langkah) === Number(displayStep.Langkah) + 1) || null;
  }, [currentOrder, displayStep]);

  // Handle status change from Status Barcode dropdown (PROG vs FIN)
  const handleBarcodeStatusChange = (newStatus, customStep) => {
    if (!currentOrder) return;
    const targetStep = customStep || displayStep || currentOrder.steps[0];
    if (!targetStep) return;

    // Pin display to this step so its barcode appears immediately and stays visible for scanning
    setSelectedStepNum(Number(targetStep.Langkah));

    if (onUpdateStepStatus) {
      onUpdateStepStatus(currentOrder.NoProduksi, targetStep.Langkah, newStatus, targetStep.id || targetStep.ID);
    } else if (newStatus === 'FIN') {
      onMarkStepFinished(currentOrder.NoProduksi, targetStep.Langkah);
    } else if (newStatus === 'PROG' && onRevertStep) {
      onRevertStep(currentOrder.NoProduksi, targetStep.Langkah, targetStep.id || targetStep.ID);
    }
  };

  const isDisplayStepFinished = Boolean(
    displayStep && (
      displayStep.barcodeStatus === 'FIN' ||
      String(displayStep.Status).toLowerCase() === 'selesai' ||
      displayStep.status === 1
    )
  );
  const currentBarcodeStatus = isDisplayStepFinished ? 'FIN' : 'PROG';

  return (
    <div className="panel-container order-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-title-group">
          <div className="panel-step-badge">COLUMN 2</div>
          <h2 className="panel-title">Production Orders (SAP Order & Steps)</h2>
        </div>
        <span className="panel-count-badge">
          <FileText size={13} />
          {filteredOrders.length} Orders
        </span>
      </div>

      {/* Order Search & Selector Bar */}
      <div className="order-selector-bar">
        <div className="panel-search-box flex-1">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search Production No. or step..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search Production No. or step"
          />
          {searchTerm && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchTerm('')}
              title="Clear search"
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
          <option value="">-- Select Production No. --</option>
          {filteredOrders.map((ord) => (
            <option key={ord.NoProduksi} value={ord.NoProduksi}>
              Order {ord.NoProduksi} ({ord.completedSteps}/{ord.totalSteps} Completed) - {ord.ProductGroup}
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
              <span className="order-label">PRODUCTION ORDER NO.:</span>
              <h3 className="order-number-title font-mono">{currentOrder.NoProduksi}</h3>
              <span className="group-tag">{currentOrder.ProductGroup || 'PKW'}</span>
            </div>

            <div className="ribbon-right flex items-center gap-3 flex-wrap">
              <div className="operator-step-select-wrapper flex items-center gap-2">
                <span className="text-xs font-mono text-muted font-semibold whitespace-nowrap">
                  Step:
                </span>
                <select
                  className="order-quick-dropdown font-mono"
                  value={displayStep?.Langkah || ''}
                  onChange={(e) => setSelectedStepNum(Number(e.target.value))}
                  title="Select Operation Step"
                  style={{ minWidth: '220px', height: '36px', fontSize: '0.8rem', padding: '0 8px' }}
                >
                  {currentOrder.steps.map((st) => {
                    const isFin =
                      st.barcodeStatus === 'FIN' ||
                      String(st.Status).toLowerCase() === 'selesai' ||
                      String(st.Status).toLowerCase() === 'completed' ||
                      st.status === 1;
                    const isActive =
                      currentOrder.activeStep &&
                      Number(currentOrder.activeStep.Langkah) === Number(st.Langkah);
                    const statusTag = isFin
                      ? 'FIN — Barcode Ready'
                      : isActive
                      ? 'PROG — Active'
                      : 'PROG — Pending';

                    return (
                      <option key={st.Langkah} value={st.Langkah}>
                        Step {st.Langkah}: {st.NamaLangkah} ({statusTag})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="progress-stat-block">
                <span className="progress-text font-mono">
                  {currentOrder.completedSteps} of {currentOrder.totalSteps} Completed
                </span>
                <div className="progress-bar-track" style={{ minWidth: '80px' }}>
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
                  <span>Order Completed</span>
                </div>
              )}
            </div>
          </div>

          {/* Banner notification if all steps in order are completed */}
          {currentOrder.isComplete && (
            <div className="order-all-completed-banner mb-4">
              <div className="flex items-center gap-3">
                <CheckCheck size={32} color="#10B981" />
                <div>
                  <div className="all-completed-title text-base">Semua Step Pada Order Ini Telah Selesai!</div>
                  <div className="all-completed-subtitle text-xs">
                    Semua {currentOrder.totalSteps} langkah telah selesai dikonfirmasi di workshop ISC. Anda dapat memilih langkah di atas untuk memindai ulang barcode konfirmasi.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE / SELECTED STEP SPOTLIGHT (The Core Requirement for the Workshop Screen) */}
          {displayStep && (
            <div className="active-step-spotlight-card">
              <div className="spotlight-top-badge">
                <div className="flex items-center gap-2">
                  <span className="active-pulse-dot"></span>
                  <span className="font-heading font-bold text-cyan tracking-wider">
                    {currentOrder.activeStep && Number(currentOrder.activeStep.Langkah) === Number(displayStep.Langkah)
                      ? 'CURRENT ACTIVE STEP'
                      : (String(displayStep.Status).toLowerCase() === 'selesai' || String(displayStep.Status).toLowerCase() === 'completed')
                      ? 'STEP COMPLETED'
                      : `STEP ${displayStep.Langkah}`}
                  </span>
                </div>
                <span className="step-seq-pill">
                  Step {displayStep.Langkah} of {currentOrder.totalSteps}
                </span>
              </div>

              <div className="spotlight-content-grid">
                {/* Step Description & Confirmation Number Header */}
                <div className="spotlight-header-meta">
                  <div className="step-name-box">
                    <span className="text-muted text-xs tracking-wider uppercase font-semibold">Step Name:</span>
                    <h4 className="active-step-title">{displayStep.NamaLangkah}</h4>
                  </div>

                  <div className="meta-right-controls">
                    <div className="konfirmasi-meta-box">
                      <span className="text-muted text-xs tracking-wider uppercase font-semibold">SAP Confirmation No.:</span>
                      <div className="konfirmasi-display font-mono">
                        <span>{displayStep.NoKonfirmasi || currentOrder.NoProduksi}</span>
                      </div>
                    </div>

                    <div className="status-barcode-meta-box">
                      <span className="text-muted text-xs tracking-wider uppercase font-semibold">
                        Barcode Status:
                      </span>
                      <div className="status-barcode-select-wrapper">
                        <select
                          className={`status-barcode-select font-mono ${isDisplayStepFinished ? 'status-fin' : 'status-prog'}`}
                          value={currentBarcodeStatus}
                          onChange={(e) => handleBarcodeStatusChange(e.target.value)}
                          title="Change Operation Step Barcode Status"
                        >
                          <option value="PROG">PROG — In Progress</option>
                          <option value="FIN">FIN — Finished</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barcode section: ONLY displayed when status is Finish (FIN) */}
                <div className="spotlight-barcode-wrapper">
                  {isDisplayStepFinished ? (
                    <div className="w-full flex flex-col items-center">
                      <BarcodeCard
                        value={displayStep.NoKonfirmasi || currentOrder.NoProduksi}
                        label="CONFIRMATION NO. BARCODE"
                        subtitle={`Step ${displayStep.Langkah}: ${displayStep.NamaLangkah}`}
                        badgeText="2. Scan Confirmation No. to SAP"
                        highlightColor="#10B981"
                        format="CODE128"
                        height={80}
                        width={2.2}
                        fontSize={17}
                      />

                      {/* Flow to Next Step without disruption */}
                      {nextStep && (
                        <div className="next-step-prompt-banner">
                          <div className="next-step-prompt-text">
                            <span className="step-done-check">
                              <CheckCircle2 size={15} />
                              Step {displayStep.Langkah} Finish
                            </span>
                            <span className="next-step-info">
                              Langkah berikutnya: <strong>Step {nextStep.Langkah} — {nextStep.NamaLangkah}</strong>
                            </span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-xs btn-primary flex items-center gap-1.5 font-mono"
                            onClick={() => setSelectedStepNum(Number(nextStep.Langkah))}
                            title={`Lanjut ke Step ${nextStep.Langkah}`}
                          >
                            <span>Lanjut ke Step {nextStep.Langkah}</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="barcode-pending-placeholder">
                      <div className="barcode-pending-icon-wrap">
                        <Clock size={28} className="text-cyan animate-pulse" />
                      </div>
                      <div className="barcode-pending-body">
                        <h5 className="barcode-pending-title">Barcode Disembunyikan (Step Sedang Berjalan)</h5>
                        <p className="barcode-pending-desc">
                          Barcode SAP Confirmation No. <strong>{displayStep.NoKonfirmasi || currentOrder.NoProduksi}</strong> (Format: Code 128) akan otomatis muncul setelah status step diubah menjadi <strong>FIN (Finished)</strong>.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-success flex items-center gap-2 font-mono"
                        onClick={() => handleBarcodeStatusChange('FIN')}
                        title="Ubah status step ini ke FIN dan tampilkan barcode"
                      >
                        <CheckCircle2 size={15} />
                        <span>Selesaikan Step & Tampilkan Barcode</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
                  <span>{ord.completedSteps} / {ord.totalSteps} Completed</span>
                  <div className="mini-progress-track">
                    <div
                      className="mini-progress-fill"
                      style={{ width: `${(ord.completedSteps / Math.max(1, ord.totalSteps)) * 100}%` }}
                    ></div>
                  </div>
                </div>
                {ord.activeStep && (
                  <div className="quick-card-active-step">
                    Active: Step {ord.activeStep.Langkah} - {ord.activeStep.NamaLangkah}
                  </div>
                )}
                <div className="quick-card-footer">
                  <span>Open Order & Barcodes</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>

          <div className="prompt-instruction-banner">
            <Layers size={22} className="text-cyan mb-1" />
            <div className="instruction-title">Select Production Order Number</div>
            <p className="instruction-text">
              Select a production order above or use the search bar to display the operation steps and SAP confirmation barcodes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
