import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ListChecks,
  CheckCircle2,
  Clock,
  RotateCcw,
  Scan,
  Search,
  Filter,
  Layers,
  ArrowRight,
  X,
  Copy,
  Check,
  UserCheck
} from 'lucide-react';
import BarcodeCard from '../BarcodeCard';

export default function ProgressTrackerView({
  orders = [],
  selectedGroup = 'ALL',
  isAdmin = false,
  currentUser = null,
  onMarkStepFinished,
  onRevertStep,
  onUpdateStepStatus,
  onSelectOrderAndOpenScanner,
  onSyncCloud,
  isLoadingCloud = false
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState(selectedGroup || 'ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PROG' | 'FIN'
  const [selectedOrderFilter, setSelectedOrderFilter] = useState('ALL');
  const [operatorModalStep, setOperatorModalStep] = useState(null);
  const [copiedKonf, setCopiedKonf] = useState(false);

  // Keep groupFilter in sync if parent selectedGroup changes
  useEffect(() => {
    if (selectedGroup) {
      setGroupFilter(selectedGroup);
    }
  }, [selectedGroup]);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && operatorModalStep) {
        setOperatorModalStep(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [operatorModalStep]);

  // Group all steps by NoProduksi
  const ordersGrouped = useMemo(() => {
    const map = new Map();

    orders.forEach((step) => {
      const orderNo = String(step.NoProduksi || step.orderNo || '').trim();
      if (!orderNo) return;

      if (!map.has(orderNo)) {
        map.set(orderNo, {
          id: step.id || step.ID || 0,
          ID: step.id || step.ID || 0,
          NoProduksi: orderNo,
          orderNo: orderNo,
          title: step.title || step.NamaLangkah || '',
          customers: step.customers || '',
          soDocument: step.soDocument || '',
          wbsProdNo: step.wbsProdNo || '',
          ProductGroup: String(step.ProductGroup || step.orderDivision || 'PKW').trim().toUpperCase(),
          steps: []
        });
      }
      map.get(orderNo).steps.push(step);
    });

    return Array.from(map.values()).map((order) => {
      const sortedSteps = [...order.steps].sort((a, b) => Number(a.Langkah) - Number(b.Langkah));
      const totalSteps = sortedSteps.length;
      const completedSteps = sortedSteps.filter(
        (s) => String(s.Status || '').toLowerCase() === 'selesai' || s.status === 1
      ).length;
      const isComplete = totalSteps > 0 && completedSteps === totalSteps;
      const activeStep =
        sortedSteps.find(
          (s) => String(s.Status || '').toLowerCase() !== 'selesai' && s.status !== 1
        ) || null;

      // Determine order-level barcode status: FIN if all steps done, else PROG
      const orderBarcodeStatus = isComplete ? 'FIN' : 'PROG';

      return {
        ...order,
        steps: sortedSteps,
        totalSteps,
        completedSteps,
        isComplete,
        activeStep,
        orderBarcodeStatus
      };
    });
  }, [orders]);

  // Extract available unique groups
  const availableGroups = useMemo(() => {
    const set = new Set();
    ordersGrouped.forEach((o) => {
      if (o.ProductGroup) set.add(o.ProductGroup);
    });
    return Array.from(set).sort();
  }, [ordersGrouped]);

  // Filter orders based on search, group, status, and specific order selection
  const filteredOrders = useMemo(() => {
    return ordersGrouped.filter((ord) => {
      // 1. Group filter
      if (groupFilter !== 'ALL' && ord.ProductGroup !== groupFilter.toUpperCase()) {
        return false;
      }

      // 2. Specific Order filter
      if (selectedOrderFilter !== 'ALL' && ord.NoProduksi !== selectedOrderFilter) {
        return false;
      }

      // 3. Status Barcode filter (PROG vs FIN)
      if (statusFilter === 'FIN' && !ord.isComplete) {
        return false;
      }
      if (statusFilter === 'PROG' && ord.isComplete) {
        return false;
      }

      // 4. Search query matching
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchNo = ord.NoProduksi.toLowerCase().includes(term);
      const matchTitle = (ord.title || '').toLowerCase().includes(term);
      const matchCust = (ord.customers || '').toLowerCase().includes(term);
      const matchGroup = ord.ProductGroup.toLowerCase().includes(term);
      const matchStep = ord.steps.some(
        (s) =>
          String(s.NamaLangkah || '').toLowerCase().includes(term) ||
          String(s.NoKonfirmasi || '').toLowerCase().includes(term)
      );

      return matchNo || matchTitle || matchCust || matchGroup || matchStep;
    });
  }, [ordersGrouped, groupFilter, selectedOrderFilter, statusFilter, searchTerm]);

  // Summary KPI statistics
  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const completedOrders = filteredOrders.filter((o) => o.isComplete).length;
    const activeOrders = totalOrders - completedOrders;

    let totalSteps = 0;
    let completedSteps = 0;
    let finSteps = 0;
    let progSteps = 0;

    filteredOrders.forEach((o) => {
      totalSteps += o.totalSteps;
      completedSteps += o.completedSteps;
      o.steps.forEach((s) => {
        const isDone = String(s.Status || '').toLowerCase() === 'selesai' || s.status === 1;
        const bStatus = (s.barcodeStatus || s.statusBarcode || (isDone ? 'FIN' : 'PROG')).toUpperCase();
        if (bStatus === 'FIN') finSteps++;
        else progSteps++;
      });
    });

    const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return {
      totalOrders,
      completedOrders,
      activeOrders,
      totalSteps,
      completedSteps,
      finSteps,
      progSteps,
      percent
    };
  }, [filteredOrders]);

  const handleCopyConfirmation = (val) => {
    if (val && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(String(val));
      setCopiedKonf(true);
      setTimeout(() => setCopiedKonf(false), 2000);
    }
  };

  const handleFinishStepInModal = () => {
    if (!operatorModalStep) return;
    const { orderNo, stepNo, stepId } = operatorModalStep;
    if (onMarkStepFinished) {
      onMarkStepFinished(orderNo, stepNo);
    }
    if (onUpdateStepStatus) {
      onUpdateStepStatus(orderNo, stepNo, 'FIN', stepId);
    }
    setOperatorModalStep((prev) => ({
      ...prev,
      barcodeStatus: 'FIN',
      isComplete: true
    }));
  };

  const handleGoToNextStep = () => {
    if (!operatorModalStep || !operatorModalStep.nextStep) return;
    const targetOrder = ordersGrouped.find((o) => o.NoProduksi === operatorModalStep.orderNo);
    if (!targetOrder) return;
    const nextSt = targetOrder.steps.find((s) => Number(s.Langkah) === Number(operatorModalStep.nextStep.stepNo));
    if (!nextSt) return;
    const afterNext = targetOrder.steps.find((s) => Number(s.Langkah) === Number(nextSt.Langkah) + 1);
    const nextIsComplete = String(nextSt.Status || '').toLowerCase() === 'selesai' || nextSt.status === 1;
    const nextBarcodeStatus = (nextSt.barcodeStatus || nextSt.statusBarcode || (nextIsComplete ? 'FIN' : 'PROG')).toUpperCase();

    setOperatorModalStep({
      orderNo: targetOrder.NoProduksi,
      productGroup: targetOrder.ProductGroup || 'PKW',
      stepNo: nextSt.Langkah,
      totalSteps: targetOrder.totalSteps,
      stepName: nextSt.NamaLangkah,
      noKonfirmasi: nextSt.NoKonfirmasi || targetOrder.NoProduksi,
      barcodeStatus: nextBarcodeStatus,
      isComplete: nextIsComplete,
      stepId: nextSt.id || nextSt.ID,
      nextStep: afterNext ? {
        stepNo: afterNext.Langkah,
        stepName: afterNext.NamaLangkah,
        noKonfirmasi: afterNext.NoKonfirmasi || targetOrder.NoProduksi,
        stepId: afterNext.id || afterNext.ID,
        barcodeStatus: (afterNext.barcodeStatus || afterNext.statusBarcode || (String(afterNext.Status).toLowerCase() === 'selesai' ? 'FIN' : 'PROG')).toUpperCase()
      } : null
    });
  };

  const handleRevertInModal = () => {
    if (!isAdmin || !operatorModalStep) return;
    if (onRevertStep) {
      onRevertStep(operatorModalStep.orderNo, operatorModalStep.stepNo, operatorModalStep.stepId);
    }
    if (onUpdateStepStatus) {
      onUpdateStepStatus(operatorModalStep.orderNo, operatorModalStep.stepNo, 'PROG', operatorModalStep.stepId);
    }
    setOperatorModalStep((prev) => ({
      ...prev,
      barcodeStatus: 'PROG',
      isComplete: false
    }));
  };

  return (
    <div className="view-container tracker-view-container">
      {/* 1. Header Toolbar */}
      <div className="view-header-row tracker-header-row">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="view-title font-heading flex items-center gap-2">
              <ListChecks className="text-cyan" size={24} />
              <span>Operation Steps Progress Tracker</span>
            </h2>
          </div>
        </div>

        {/* Global Controls */}
        <div className="view-header-actions flex items-center gap-2 flex-wrap min-w-0">
          {/* Quick Search */}
          <div className="panel-search-box header-search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search order, step, confirmation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search progress tracker"
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

          {/* Group Filter */}
          <div className="filter-pill-group">
            <Layers size={14} className="filter-icon" />
            <span className="filter-label">Group:</span>
            <select
              className="filter-select font-mono"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              title="Filter by Product Group"
            >
              <option value="ALL">All Groups ({availableGroups.length})</option>
              {availableGroups.map((grp) => (
                <option key={grp} value={grp}>
                  Group {grp}
                </option>
              ))}
            </select>
          </div>

          {/* Status Barcode Filter (PROG vs FIN) */}
          <div className="filter-pill-group">
            <Filter size={14} className="filter-icon" />
            <span className="filter-label">Status:</span>
            <select
              className="filter-select font-mono"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              title="Filter by Barcode Status"
            >
              <option value="ALL">All Statuses</option>
              <option value="PROG">PROG — In Progress</option>
              <option value="FIN">FIN — Finished</option>
            </select>
          </div>

          {/* Order Selector */}
          <div className="filter-pill-group">
            <span className="filter-label">Select Order:</span>
            <select
              className="filter-select font-mono"
              value={selectedOrderFilter}
              onChange={(e) => setSelectedOrderFilter(e.target.value)}
              title="Select Specific Order"
              style={{ maxWidth: '160px' }}
            >
              <option value="ALL">Show All ({ordersGrouped.length})</option>
              {ordersGrouped.map((ord) => (
                <option key={ord.NoProduksi} value={ord.NoProduksi}>
                  #{ord.NoProduksi} ({ord.completedSteps}/{ord.totalSteps})
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          {onSyncCloud && (
            <button
              type="button"
              className="btn btn-sm btn-outline flex items-center gap-1.5"
              onClick={() => onSyncCloud(true)}
              disabled={isLoadingCloud}
              title="Refresh latest data from cloud database"
            >
              <RotateCcw size={14} className={isLoadingCloud ? 'animate-spin text-cyan' : ''} />
              <span>{isLoadingCloud ? 'Syncing...' : 'Refresh'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI Ribbon Statistics */}
      <div className="kpi-ribbon-grid tracker-kpi-ribbon">
        <div className="kpi-card">
          <div className="kpi-num text-cyan font-mono">{stats.totalOrders}</div>
          <div className="kpi-label">Total Production Orders</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-num text-emerald-500 font-mono">{stats.completedOrders}</div>
          <div className="kpi-label">Completed Orders (FIN)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-num text-amber-500 font-mono">{stats.activeOrders}</div>
          <div className="kpi-label">In Progress Orders (PROG)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-num font-mono" style={{ color: '#0284C7' }}>
            {stats.completedSteps} / {stats.totalSteps}
          </div>
          <div className="kpi-label">Total Steps Completed</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-num text-cyan font-mono">{stats.percent}%</div>
          <div className="kpi-label">Overall Progress</div>
        </div>
      </div>

      {/* 3. Orders Step Sequence Cards List */}
      <div className="tracker-orders-list flex flex-col gap-6">
        {filteredOrders.length === 0 ? (
          <div className="chart-card text-center py-10">
            <div className="text-muted font-heading text-sm mb-1">
              No orders match your filter or search criteria.
            </div>
            <div className="text-xs text-muted">
              Try resetting the group filter or changing search terms.
            </div>
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const percent = Math.round(
              (ord.completedSteps / Math.max(1, ord.totalSteps)) * 100
            );

            return (
              <div key={ord.NoProduksi} className="tracker-order-card">
                {/* Order Summary Header Bar */}
                <div className="tracker-order-header">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="tracker-order-no font-mono font-bold">
                      Order #{ord.NoProduksi}
                    </div>
                    <span className="group-tag">{ord.ProductGroup || 'PKW'}</span>
                    {ord.customers && (
                      <span className="text-xs text-muted font-semibold truncate" style={{ maxWidth: 240 }}>
                        Cust: {ord.customers}
                      </span>
                    )}
                    {ord.title && (
                      <span className="text-xs text-main truncate font-medium" style={{ maxWidth: 280 }}>
                        {ord.title}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Order Progress Indicator */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted font-semibold">
                        {ord.completedSteps}/{ord.totalSteps} Completed ({percent}%)
                      </span>
                      <div className="progress-bar-track" style={{ width: '100px' }}>
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: ord.isComplete ? '#10B981' : '#00A3E0'
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Order Barcode Status Pill */}
                    <span
                      className={`barcode-badge-pill font-mono text-xs ${
                        ord.orderBarcodeStatus === 'FIN' ? 'pill-fin' : 'pill-prog'
                      }`}
                    >
                      {ord.orderBarcodeStatus === 'FIN' ? (
                        <>
                          <CheckCircle2 size={12} />
                          <span>FIN</span>
                        </>
                      ) : (
                        <>
                          <Clock size={12} />
                          <span>PROG</span>
                        </>
                      )}
                    </span>

                    {/* Open in Terminal Scanner shortcut */}
                    {onSelectOrderAndOpenScanner && (
                      <button
                        type="button"
                        className="btn btn-xs btn-outline flex items-center gap-1 font-mono"
                        onClick={() => onSelectOrderAndOpenScanner(ord.NoProduksi)}
                        title="Open this order in SAP Scanner Terminal"
                      >
                        <Scan size={12} />
                        <span>Scan</span>
                        <ArrowRight size={10} />
                      </button>
                    )}
                  </div>
                </div>

                {/* THE EXACT STEPS TABLE MATCHING REFERENCE SCREENSHOT */}
                <div className="steps-sequence-section tracker-table-wrap">
                  <div className="steps-section-header">
                    <h4 className="steps-section-title font-heading">
                      All Operation Steps ({ord.steps.length} Steps):
                    </h4>
                    <span className="text-xs text-muted">
                      List of operation steps and SAP confirmation numbers
                    </span>
                  </div>

                  <div className="steps-table-container">
                    <table className="steps-table">
                      <thead>
                        <tr>
                          <th style={{ width: '80px' }}>Step</th>
                          <th>Step Name</th>
                          <th style={{ width: '180px' }}>Confirmation No.</th>
                          <th style={{ width: '210px' }}>Status</th>
                          <th style={{ minWidth: '170px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ord.steps.map((st) => {
                          const isStepComplete =
                            String(st.Status || '').toLowerCase() === 'selesai' ||
                            String(st.Status || '').toLowerCase() === 'completed' ||
                            st.status === 1;
                          const isActive =
                            ord.activeStep &&
                            Number(ord.activeStep.Langkah) === Number(st.Langkah);
                          const barcodeStatus = (
                            st.barcodeStatus ||
                            st.statusBarcode ||
                            (isStepComplete ? 'FIN' : 'PROG')
                          ).toUpperCase();
                          const nextSt = ord.steps.find((s) => Number(s.Langkah) === Number(st.Langkah) + 1);

                          const openModalForStep = () => {
                            setOperatorModalStep({
                              orderNo: ord.NoProduksi,
                              productGroup: ord.ProductGroup || 'PKW',
                              stepNo: st.Langkah,
                              totalSteps: ord.totalSteps,
                              stepName: st.NamaLangkah,
                              noKonfirmasi: st.NoKonfirmasi || ord.NoProduksi,
                              barcodeStatus,
                              isComplete: isStepComplete,
                              stepId: st.id || st.ID,
                              nextStep: nextSt ? {
                                stepNo: nextSt.Langkah,
                                stepName: nextSt.NamaLangkah,
                                noKonfirmasi: nextSt.NoKonfirmasi || ord.NoProduksi,
                                stepId: nextSt.id || nextSt.ID,
                                barcodeStatus: (nextSt.barcodeStatus || nextSt.statusBarcode || (String(nextSt.Status).toLowerCase() === 'selesai' ? 'FIN' : 'PROG')).toUpperCase()
                              } : null
                            });
                          };

                          const handleCompleteStep = () => {
                            if (onMarkStepFinished) {
                              onMarkStepFinished(ord.NoProduksi, st.Langkah);
                            }
                            if (onUpdateStepStatus) {
                              onUpdateStepStatus(ord.NoProduksi, st.Langkah, 'FIN', st.id || st.ID);
                            }
                            setOperatorModalStep({
                              orderNo: ord.NoProduksi,
                              productGroup: ord.ProductGroup || 'PKW',
                              stepNo: st.Langkah,
                              totalSteps: ord.totalSteps,
                              stepName: st.NamaLangkah,
                              noKonfirmasi: st.NoKonfirmasi || ord.NoProduksi,
                              barcodeStatus: 'FIN',
                              isComplete: true,
                              stepId: st.id || st.ID,
                              nextStep: nextSt ? {
                                stepNo: nextSt.Langkah,
                                stepName: nextSt.NamaLangkah,
                                noKonfirmasi: nextSt.NoKonfirmasi || ord.NoProduksi,
                                stepId: nextSt.id || nextSt.ID,
                                barcodeStatus: (nextSt.barcodeStatus || nextSt.statusBarcode || (String(nextSt.Status).toLowerCase() === 'selesai' ? 'FIN' : 'PROG')).toUpperCase()
                              } : null
                            });
                          };

                          return (
                            <tr
                              key={st.Langkah}
                              className={`step-row ${isActive ? 'row-active' : ''} ${
                                isStepComplete ? 'row-completed' : ''
                              }`}
                            >
                              {/* 1. LANGKAH Badge */}
                              <td className="step-num-cell">
                                <span
                                  className={`step-badge-number ${
                                    isActive ? 'active' : ''
                                  } ${isStepComplete ? 'done' : ''}`}
                                >
                                  {isStepComplete ? (
                                    <CheckCircle2 size={13} />
                                  ) : (
                                    st.Langkah
                                  )}
                                </span>
                              </td>

                              {/* 2. NAMA LANGKAH */}
                              <td className="step-name-cell">
                                <div className="step-name-text">
                                  {st.NamaLangkah || `Production Step ${st.Langkah}`}
                                </div>
                                {isActive && (
                                  <span className="active-tag-inline">
                                    <span className="active-pulse-mini"></span> Active Step
                                  </span>
                                )}
                              </td>

                              {/* 3. NO. KONFIRMASI */}
                              <td className="step-konf-cell font-mono">
                                <span
                                  className="konf-number"
                                  style={{ cursor: 'pointer' }}
                                  onClick={openModalForStep}
                                  title="Klik untuk melihat barcode konfirmasi SAP"
                                >
                                  {st.NoKonfirmasi}
                                </span>
                              </td>

                              {/* 4. STATUS + BARCODE PROG/FIN */}
                              <td className="step-status-cell">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Primary Step Status Pill */}
                                  {isStepComplete ? (
                                    <span className="status-badge status-selesai">
                                      <CheckCircle2 size={12} />
                                      Completed
                                    </span>
                                  ) : String(st.Status || '').toLowerCase() === 'not started' ? (
                                    <span className="status-badge status-pending">
                                      <Clock size={12} />
                                      Not Started
                                    </span>
                                  ) : isActive ? (
                                    <span className="status-badge status-berjalan active">
                                      <span className="pulse-dot-small"></span>
                                      Active Step
                                    </span>
                                  ) : (
                                    <span className="status-badge status-pending">
                                      <Clock size={12} />
                                      Pending
                                    </span>
                                  )}

                                  {/* Status Barcode (PROG vs FIN) Indicator */}
                                  {isAdmin && onUpdateStepStatus ? (
                                    <div className="status-barcode-select-wrapper mini-select">
                                      <select
                                        className={`status-barcode-select font-mono ${
                                          barcodeStatus === 'FIN' ? 'status-fin' : 'status-prog'
                                        }`}
                                        value={barcodeStatus}
                                        onChange={(e) => {
                                          const nextBStatus = e.target.value;
                                          onUpdateStepStatus(
                                            ord.NoProduksi,
                                            st.Langkah,
                                            nextBStatus,
                                            st.id || st.ID
                                          );
                                        }}
                                        title="Change Barcode Status for this Step (PROG vs FIN)"
                                      >
                                        <option value="PROG">PROG</option>
                                        <option value="FIN">FIN</option>
                                      </select>
                                    </div>
                                  ) : (
                                    <span
                                      className={`barcode-badge-pill font-mono text-xs ${
                                        barcodeStatus === 'FIN' ? 'pill-fin' : 'pill-prog'
                                      }`}
                                      title={`Status Barcode: ${barcodeStatus === 'FIN' ? 'Finished' : 'In Progress'}`}
                                    >
                                      {barcodeStatus === 'FIN' ? (
                                        <>
                                          <CheckCircle2 size={10} />
                                          <span>FIN</span>
                                        </>
                                      ) : (
                                        <>
                                          <Clock size={10} />
                                          <span>PROG</span>
                                        </>
                                      )}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 5. AKSI */}
                              <td className="step-action-cell" style={{ textAlign: 'center' }}>
                                {!isStepComplete ? (
                                  <button
                                    type="button"
                                    className={`btn btn-xs ${
                                      isActive ? 'btn-success' : 'btn-outline-cyan'
                                    } flex items-center justify-center gap-1 mx-auto`}
                                    onClick={handleCompleteStep}
                                    title={`Selesaikan Step ${st.Langkah} & Buka Modal Barcode`}
                                  >
                                    <CheckCircle2 size={12} />
                                    <span>Menyelesaikan</span>
                                  </button>
                                ) : (
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-outline-cyan font-mono flex items-center gap-1"
                                      onClick={openModalForStep}
                                      title="Buka Modal Barcode Konfirmasi SAP"
                                    >
                                      <Scan size={11} />
                                      <span>Barcode</span>
                                    </button>

                                    {/* Revert button: strictly for Admin */}
                                    {isAdmin && onRevertStep && (
                                      <button
                                        type="button"
                                        className="btn btn-xs btn-outline-warning flex items-center gap-1"
                                        onClick={() => {
                                          onRevertStep(
                                            ord.NoProduksi,
                                            st.Langkah,
                                            st.id || st.ID
                                          );
                                          if (onUpdateStepStatus) {
                                            onUpdateStepStatus(
                                              ord.NoProduksi,
                                              st.Langkah,
                                              'PROG',
                                              st.id || st.ID
                                            );
                                          }
                                        }}
                                        title={`Admin: Revert Step ${st.Langkah} to Incomplete`}
                                      >
                                        <RotateCcw size={11} />
                                        <span>Revert</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. MODAL KHUSUS ROLE OPERATOR (PORTAL KE BODY — 100% CENTERED DI VIEWPORT) */}
      {operatorModalStep && typeof document !== 'undefined' && createPortal(
        <div
          className="modal-backdrop-portal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(2, 6, 23, 0.8)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 9999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box'
          }}
          onClick={() => setOperatorModalStep(null)}
        >
          <div
            className="operator-barcode-modal-card"
            style={{
              width: '100%',
              maxWidth: '540px',
              maxHeight: '90vh',
              backgroundColor: 'var(--bg-surface, #0E1726)',
              border: '1px solid var(--border-medium, #20334D)',
              borderRadius: '14px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'slideUp 0.18s ease-out',
              color: 'var(--text-main, #F1F5F9)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: 'var(--atz-header-bg, #041E42)',
                borderBottom: '2px solid var(--atz-cyan, #00A3E0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#FFFFFF'
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 163, 224, 0.18)',
                    border: '1px solid rgba(0, 163, 224, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Scan size={20} color="#00A3E0" />
                </div>
                <div>
                  <h3 className="modal-title font-heading text-white font-bold" style={{ fontSize: '1.05rem', margin: 0 }}>
                    SAP Confirmation Barcode
                  </h3>
                  <p className="modal-desc" style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.75)', margin: 0 }}>
                    Order #{operatorModalStep.orderNo} ({operatorModalStep.productGroup}) • Langkah {operatorModalStep.stepNo} dari {operatorModalStep.totalSteps}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '26px',
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: '0 4px'
                }}
                onClick={() => setOperatorModalStep(null)}
                title="Tutup Modal"
              >
                &times;
              </button>
            </div>

            {/* Body Modal (Scrollable jika layar kecil) */}
            <div
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-surface, #0E1726)'
              }}
            >
              {/* Step Title & Meta Badges */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                  <span className="text-xs text-muted uppercase font-semibold tracking-wider">
                    Nama Langkah Operasi:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`barcode-badge-pill font-mono text-xs ${
                        operatorModalStep.barcodeStatus === 'FIN' ? 'pill-fin' : 'pill-prog'
                      }`}
                      style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                    >
                      {operatorModalStep.barcodeStatus === 'FIN' ? (
                        <>
                          <CheckCircle2 size={11} />
                          <span>FIN — Selesai</span>
                        </>
                      ) : (
                        <>
                          <Clock size={11} />
                          <span>PROG — In Progress</span>
                        </>
                      )}
                    </span>

                    <span
                      className="badge-pill font-mono text-xs"
                      style={{
                        background: 'rgba(0, 163, 224, 0.12)',
                        border: '1px solid rgba(0, 163, 224, 0.35)',
                        color: '#38BDF8',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Hak Akses Pengguna Saat Ini"
                    >
                      <UserCheck size={11} />
                      <span>{isAdmin ? 'Akses: Admin' : 'Akses: Operator'}</span>
                    </span>
                  </div>
                </div>

                <h4
                  className="font-heading font-bold text-main"
                  style={{ fontSize: '1.2rem', lineHeight: 1.3, margin: 0 }}
                >
                  {operatorModalStep.stepName}
                </h4>
              </div>

              {/* Confirmation Number Box with Copy Action */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface-elevated, #162235)',
                  border: '1px solid var(--border-medium, #20334D)'
                }}
              >
                <div>
                  <span className="text-xs text-muted font-semibold uppercase tracking-wider block">
                    SAP Confirmation No.:
                  </span>
                  <div className="font-mono text-xl font-bold" style={{ color: '#00A3E0' }}>
                    {operatorModalStep.noKonfirmasi}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-xs btn-outline font-mono flex items-center gap-1.5"
                  onClick={() => handleCopyConfirmation(operatorModalStep.noKonfirmasi)}
                  title="Salin Nomor Konfirmasi"
                >
                  {copiedKonf ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                  <span>{copiedKonf ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>

              {/* Barcode Display (Code 128) */}
              <div className="spotlight-barcode-wrapper" style={{ width: '100%' }}>
                <BarcodeCard
                  value={operatorModalStep.noKonfirmasi}
                  label="CONFIRMATION NO. BARCODE"
                  subtitle={`Step ${operatorModalStep.stepNo}: ${operatorModalStep.stepName}`}
                  badgeText="Scan to SAP"
                  highlightColor={operatorModalStep.barcodeStatus === 'FIN' ? '#10B981' : '#00A3E0'}
                  format="CODE128"
                  height={85}
                  width={2.3}
                  fontSize={17}
                />
              </div>

              {/* Next Step Transition Banner for Operator */}
              {operatorModalStep.barcodeStatus === 'FIN' && operatorModalStep.nextStep && (
                <div className="next-step-prompt-banner" style={{ marginTop: '0' }}>
                  <div className="next-step-prompt-text">
                    <span className="step-done-check">
                      <CheckCircle2 size={15} />
                      Step {operatorModalStep.stepNo} Selesai
                    </span>
                    <span className="next-step-info">
                      Langkah berikutnya: <strong>Step {operatorModalStep.nextStep.stepNo} — {operatorModalStep.nextStep.stepName}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with Operator-Appropriate Actions */}
            <div
              style={{
                padding: '12px 20px',
                backgroundColor: 'var(--bg-surface-elevated, #162235)',
                borderTop: '1px solid var(--border-medium, #20334D)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
                flexWrap: 'wrap'
              }}
            >
              {operatorModalStep.barcodeStatus !== 'FIN' ? (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline font-mono"
                    onClick={() => setOperatorModalStep(null)}
                  >
                    Tutup
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-success font-mono flex items-center gap-1.5"
                    onClick={handleFinishStepInModal}
                    title="Selesaikan langkah ini dan perbarui status ke FIN"
                  >
                    <CheckCircle2 size={15} />
                    <span>Selesaikan Langkah (FIN)</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Revert: Strictly for Admin, completely hidden for Operator */}
                  {isAdmin && onRevertStep && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-warning font-mono flex items-center gap-1 mr-auto"
                      onClick={handleRevertInModal}
                      title="Kembalikan status langkah ke In Progress"
                    >
                      <RotateCcw size={13} />
                      <span>Revert (Admin)</span>
                    </button>
                  )}

                  {operatorModalStep.nextStep && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary font-mono flex items-center gap-1.5"
                      onClick={handleGoToNextStep}
                      title={`Buka barcode untuk Step ${operatorModalStep.nextStep.stepNo}`}
                    >
                      <span>Lanjut ke Step ${operatorModalStep.nextStep.stepNo}</span>
                      <ArrowRight size={14} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-sm btn-outline font-mono"
                    onClick={() => setOperatorModalStep(null)}
                  >
                    Selesai Pindai & Tutup
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
