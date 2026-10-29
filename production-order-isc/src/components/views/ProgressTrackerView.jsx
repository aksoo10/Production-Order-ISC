import React, { useState, useMemo } from 'react';
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
  X
} from 'lucide-react';
import BarcodeCard from '../BarcodeCard';

export default function ProgressTrackerView({
  orders = [],
  selectedGroup = 'ALL',
  isAdmin = false,
  _currentUser = null,
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
  const [expandedBarcodeStepKey, setExpandedBarcodeStepKey] = useState(null);

  // Keep groupFilter in sync if parent selectedGroup changes
  React.useEffect(() => {
    if (selectedGroup) {
      setGroupFilter(selectedGroup);
    }
  }, [selectedGroup]);

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
                          const stepKey = `${ord.NoProduksi}_${st.Langkah}`;
                          const isExpanded = expandedBarcodeStepKey === stepKey;
                          const toggleBarcode = (e) => {
                            if (e) e.stopPropagation();
                            setExpandedBarcodeStepKey((prev) => (prev === stepKey ? null : stepKey));
                          };

                          return (
                            <React.Fragment key={st.Langkah}>
                              <tr
                                className={`step-row ${isActive ? 'row-active' : ''} ${
                                  isStepComplete ? 'row-completed' : ''
                                } ${isExpanded ? 'row-expanded' : ''}`}
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
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className="konf-number"
                                      style={{ cursor: 'pointer' }}
                                      onClick={toggleBarcode}
                                      title="Klik untuk buka/tutup barcode konfirmasi SAP"
                                    >
                                      {st.NoKonfirmasi}
                                    </span>
                                    <button
                                      type="button"
                                      className={`btn btn-xs ${isExpanded ? 'btn-primary' : barcodeStatus === 'FIN' ? 'btn-outline-cyan' : 'btn-outline'} font-mono flex items-center gap-1`}
                                      onClick={toggleBarcode}
                                      title={isExpanded ? 'Tutup tampilan barcode' : 'Tampilkan barcode SAP (Code 128) tepat di bawah langkah ini'}
                                    >
                                      {isExpanded ? (
                                        <>
                                          <X size={11} />
                                          <span>Tutup</span>
                                        </>
                                      ) : (
                                        <>
                                          <Scan size={11} />
                                          <span>Barcode</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
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
                                            if (nextBStatus === 'FIN') {
                                              setExpandedBarcodeStepKey(`${ord.NoProduksi}_${st.Langkah}`);
                                            }
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
                                      onClick={() => {
                                        if (onMarkStepFinished) {
                                          onMarkStepFinished(ord.NoProduksi, st.Langkah);
                                        }
                                        if (onUpdateStepStatus) {
                                          onUpdateStepStatus(
                                            ord.NoProduksi,
                                            st.Langkah,
                                            'FIN',
                                            st.id || st.ID
                                          );
                                        }
                                        setExpandedBarcodeStepKey(`${ord.NoProduksi}_${st.Langkah}`);
                                      }}
                                      title={`Mark Step ${st.Langkah} Completed & Show Barcode`}
                                    >
                                      <CheckCircle2 size={12} />
                                      <span>Complete</span>
                                    </button>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                      <button
                                        type="button"
                                        className={`btn btn-xs ${isExpanded ? 'btn-primary' : 'btn-outline-cyan'} font-mono flex items-center gap-1`}
                                        onClick={toggleBarcode}
                                        title="Scan Confirmation Barcode (Code 128)"
                                      >
                                        {isExpanded ? (
                                          <>
                                            <X size={11} />
                                            <span>Tutup</span>
                                          </>
                                        ) : (
                                          <>
                                            <Scan size={11} />
                                            <span>Barcode</span>
                                          </>
                                        )}
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

                              {/* INLINE BARCODE DISPLAY RIGHT AT THE STEP ROW (No far scrolling, fits right in place) */}
                              {isExpanded && (
                                <tr className="barcode-inline-row">
                                  <td colSpan={5} className="barcode-inline-cell">
                                    <div className="barcode-inline-box">
                                      <div className="barcode-inline-header">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span
                                            className={`barcode-badge-pill font-mono text-xs ${
                                              barcodeStatus === 'FIN' ? 'pill-fin' : 'pill-prog'
                                            }`}
                                          >
                                            {barcodeStatus === 'FIN' ? (
                                              <>
                                                <CheckCircle2 size={11} />
                                                <span>FIN — Finished</span>
                                              </>
                                            ) : (
                                              <>
                                                <Clock size={11} />
                                                <span>PROG — In Progress</span>
                                              </>
                                            )}
                                          </span>
                                          <span className="font-heading font-bold text-sm text-main">
                                            SAP Confirmation Barcode (Code 128)
                                          </span>
                                          <span className="text-xs text-muted font-mono">
                                            • Step {st.Langkah}: {st.NamaLangkah}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          className="btn btn-xs btn-outline font-mono flex items-center gap-1"
                                          onClick={() => setExpandedBarcodeStepKey(null)}
                                          title="Tutup Barcode"
                                        >
                                          <X size={12} />
                                          <span>Tutup Barcode</span>
                                        </button>
                                      </div>

                                      <div className="spotlight-barcode-wrapper" style={{ padding: '6px 0', maxWidth: '540px', margin: '0 auto' }}>
                                        <BarcodeCard
                                          value={st.NoKonfirmasi || ord.NoProduksi}
                                          label="CONFIRMATION NO. BARCODE"
                                          subtitle={`Step ${st.Langkah}: ${st.NamaLangkah}`}
                                          badgeText="Scan to SAP"
                                          highlightColor={barcodeStatus === 'FIN' ? '#10B981' : '#00A3E0'}
                                          format="CODE128"
                                          height={78}
                                          width={2.2}
                                          fontSize={17}
                                        />
                                      </div>

                                      {/* Next step prompt if finished */}
                                      {barcodeStatus === 'FIN' && (() => {
                                        const nextSt = ord.steps.find((s) => Number(s.Langkah) === Number(st.Langkah) + 1);
                                        if (!nextSt) return null;
                                        return (
                                          <div className="next-step-prompt-banner" style={{ marginTop: '10px' }}>
                                            <div className="next-step-prompt-text">
                                              <span className="step-done-check">
                                                <CheckCircle2 size={15} />
                                                Step {st.Langkah} Selesai
                                              </span>
                                              <span className="next-step-info">
                                                Langkah berikutnya: <strong>Step {nextSt.Langkah} — {nextSt.NamaLangkah}</strong>
                                              </span>
                                            </div>
                                            <button
                                              type="button"
                                              className="btn btn-xs btn-primary flex items-center gap-1.5 font-mono"
                                              onClick={() => setExpandedBarcodeStepKey(`${ord.NoProduksi}_${nextSt.Langkah}`)}
                                              title={`Buka Barcode Step ${nextSt.Langkah}`}
                                            >
                                              <span>Buka Barcode Step {nextSt.Langkah}</span>
                                              <ArrowRight size={12} />
                                            </button>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
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
    </div>
  );
}
  );
}
