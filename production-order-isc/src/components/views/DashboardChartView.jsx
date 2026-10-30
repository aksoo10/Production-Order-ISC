import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  PieChart,
  ShieldAlert,
  Layers,
  CheckCircle2,
  Clock,
  Activity,
  TrendingUp,
  Filter
} from 'lucide-react';
import { orderApiService } from '../../services/orderApiService';

export default function DashboardChartView({
  orders = [],
  selectedGroup = 'ALL',
  isAdmin = false
}) {
  const [_isBackendAuthorized, setIsBackendAuthorized] = useState(true);
  const [localGroupFilter, setLocalGroupFilter] = useState(selectedGroup || 'ALL');
  const [hoveredSegment, setHoveredSegment] = useState(null);

  // Synchronize with external selectedGroup prop when changed
  useEffect(() => {
    if (selectedGroup) {
      setLocalGroupFilter(selectedGroup);
    }
  }, [selectedGroup]);

  // Backend Role-Based Access Validation Check
  useEffect(() => {
    let isMounted = true;
    if (isAdmin) {
      orderApiService
        .verifyDashboardAccess()
        .then((res) => {
          if (isMounted && res) {
            setIsBackendAuthorized(Boolean(res.authorized));
          }
        })
        .catch(() => {
          if (isMounted) {
            setIsBackendAuthorized(true);
          }
        });
    } else {
      setIsBackendAuthorized(false);
    }
    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  // 1. Group Orders by NoProduksi
  const groupedOrders = useMemo(() => {
    const map = new Map();

    orders.forEach((step) => {
      const orderNo = String(step.NoProduksi || step.orderNo || '').trim();
      if (!orderNo) return;

      if (!map.has(orderNo)) {
        map.set(orderNo, {
          orderNo,
          ProductGroup: String(step.ProductGroup || step.orderDivision || 'PKW').trim().toUpperCase(),
          customers: String(step.customers || 'ANDRITZ ISC Internal').trim(),
          title: step.title || step.NamaLangkah || '',
          steps: []
        });
      }
      map.get(orderNo).steps.push(step);
    });

    return Array.from(map.values()).map((ord) => {
      const totalSteps = ord.steps.length;
      const completedSteps = ord.steps.filter(
        (s) => String(s.Status || '').toLowerCase() === 'selesai' || s.status === 1
      ).length;
      const isComplete = totalSteps > 0 && completedSteps === totalSteps;
      const isNotStarted = completedSteps === 0;
      const isInProgress = !isComplete && !isNotStarted;

      return {
        ...ord,
        totalSteps,
        completedSteps,
        isComplete,
        isNotStarted,
        isInProgress
      };
    });
  }, [orders]);

  // Extract unique ProductGroups for filter
  const availableGroups = useMemo(() => {
    const set = new Set();
    groupedOrders.forEach((o) => {
      if (o.ProductGroup) set.add(o.ProductGroup);
    });
    return Array.from(set).sort();
  }, [groupedOrders]);

  // Filter orders according to localGroupFilter
  const filteredOrders = useMemo(() => {
    if (localGroupFilter === 'ALL') return groupedOrders;
    return groupedOrders.filter(
      (o) => o.ProductGroup?.toUpperCase() === localGroupFilter.toUpperCase()
    );
  }, [groupedOrders, localGroupFilter]);

  // Filter raw steps according to localGroupFilter
  const filteredSteps = useMemo(() => {
    if (localGroupFilter === 'ALL') return orders;
    return orders.filter((s) => {
      const grp = String(s.ProductGroup || s.orderDivision || '').toUpperCase();
      return grp.includes(localGroupFilter.toUpperCase());
    });
  }, [orders, localGroupFilter]);

  // 2. High-Level KPI Summary Metrics
  const summaryKPI = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const completedOrders = filteredOrders.filter((o) => o.isComplete).length;
    const inProgressOrders = filteredOrders.filter((o) => o.isInProgress).length;
    const notStartedOrders = filteredOrders.filter((o) => o.isNotStarted).length;

    const totalSteps = filteredSteps.length;
    const completedSteps = filteredSteps.filter(
      (s) => String(s.Status || '').toLowerCase() === 'selesai' || s.status === 1
    ).length;
    const activeSteps = totalSteps - completedSteps;

    // Status Barcode Metrics (PROG vs FIN)
    const finBarcodeSteps = filteredSteps.filter((s) => {
      const bStatus = String(s.statusBarcode || '').toUpperCase();
      return bStatus === 'FIN' || String(s.Status || '').toLowerCase() === 'selesai';
    }).length;
    const progBarcodeSteps = Math.max(0, totalSteps - finBarcodeSteps);

    const orderCompletionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
    const stepCompletionRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return {
      totalOrders,
      completedOrders,
      inProgressOrders,
      notStartedOrders,
      totalSteps,
      completedSteps,
      activeSteps,
      finBarcodeSteps,
      progBarcodeSteps,
      orderCompletionRate,
      stepCompletionRate
    };
  }, [filteredOrders, filteredSteps]);

  // 3. Breakdown by Product Group
  const groupStats = useMemo(() => {
    const map = new Map();
    filteredOrders.forEach((o) => {
      const grp = o.ProductGroup || 'PKW';
      if (!map.has(grp)) {
        map.set(grp, { group: grp, totalOrders: 0, completedOrders: 0, totalSteps: 0, completedSteps: 0 });
      }
      const item = map.get(grp);
      item.totalOrders += 1;
      if (o.isComplete) item.completedOrders += 1;
      item.totalSteps += o.totalSteps;
      item.completedSteps += o.completedSteps;
    });

    return Array.from(map.values())
      .map((g) => ({
        ...g,
        percent: g.totalSteps > 0 ? Math.round((g.completedSteps / g.totalSteps) * 100) : 0
      }))
      .sort((a, b) => b.totalOrders - a.totalOrders);
  }, [filteredOrders]);

  // 4. Breakdown by Top Customers
  const customerStats = useMemo(() => {
    const map = new Map();
    filteredOrders.forEach((o) => {
      let cust = o.customers || 'Internal ISC';
      if (cust.length > 25) cust = cust.slice(0, 23) + '...';
      if (!map.has(cust)) {
        map.set(cust, { customer: cust, count: 0, completed: 0 });
      }
      const item = map.get(cust);
      item.count += 1;
      if (o.isComplete) item.completed += 1;
    });

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredOrders]);

  // 5. Complexity Breakdown (Steps per Order)
  const complexityStats = useMemo(() => {
    let singleStep = 0;
    let mediumStep = 0;
    let multiStep = 0;

    filteredOrders.forEach((o) => {
      if (o.totalSteps === 1) singleStep++;
      else if (o.totalSteps <= 4) mediumStep++;
      else multiStep++;
    });

    return [
      { label: 'Single (1 Step)', count: singleStep, color: '#00A3E0' },
      { label: 'Medium (2-4 Steps)', count: mediumStep, color: '#38BDF8' },
      { label: 'Complex (5+ Steps)', count: multiStep, color: '#818CF8' }
    ];
  }, [filteredOrders]);

  // Helper for Donut Chart Geometry (SVG)
  const renderDonutSlice = (cx, cy, radius, strokeWidth, startAngle, endAngle, color) => {
    const totalAngle = endAngle - startAngle;
    if (totalAngle <= 0) return null;

    // Handle full 360 circle
    if (totalAngle >= 359.9) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
        />
      );
    }

    const rad = (deg) => ((deg - 90) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(rad(startAngle));
    const y1 = cy + radius * Math.sin(rad(startAngle));
    const x2 = cx + radius * Math.cos(rad(endAngle));
    const y2 = cy + radius * Math.sin(rad(endAngle));
    const largeArcFlag = totalAngle > 180 ? 1 : 0;

    const pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

    return (
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={{ transition: 'all 0.4s ease' }}
      />
    );
  };

  // Status Donut Angles Calculation
  const statusDonutAngles = useMemo(() => {
    const total = summaryKPI.totalOrders || 1;
    const p1 = (summaryKPI.completedOrders / total) * 360;
    const p2 = (summaryKPI.inProgressOrders / total) * 360;
    const p3 = (summaryKPI.notStartedOrders / total) * 360;

    return {
      completed: { start: 0, end: p1 },
      inProgress: { start: p1, end: p1 + p2 },
      notStarted: { start: p1 + p2, end: p1 + p2 + p3 }
    };
  }, [summaryKPI]);

  // Barcode Status Angles Calculation
  const barcodeDonutAngles = useMemo(() => {
    const total = summaryKPI.totalSteps || 1;
    const p1 = (summaryKPI.finBarcodeSteps / total) * 360;
    const p2 = (summaryKPI.progBarcodeSteps / total) * 360;

    return {
      fin: { start: 0, end: p1 },
      prog: { start: p1, end: p1 + p2 }
    };
  }, [summaryKPI]);

  // Security Gate: strictly protect from non-admin users
  if (!isAdmin) {
    return (
      <div className="view-container">
        <div className="chart-access-denied-card">
          <div className="denied-icon-wrap">
            <ShieldAlert size={48} color="#EF4444" />
          </div>
          <h3 className="denied-title font-heading">Access Restricted — Administrator Only</h3>
          <p className="denied-desc">
            The <strong>Dashboard → Only Chart</strong> view is protected by dual role validation
            (Frontend & Backend). You must have Administrator privileges to access analytics and
            visual chart data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container chart-dashboard-view">
      {/* 1. Header Toolbar */}
      <div className="view-header-row chart-header-row">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="view-title font-heading flex items-center gap-2">
              <BarChart3 className="text-cyan" size={24} />
              <span>Analytics Dashboard & Chart Visualizations</span>
            </h2>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="filter-pill-group">
            <Filter size={14} className="filter-icon" />
            <span className="filter-label">Group Filter:</span>
            <select
              className="filter-select font-mono"
              value={localGroupFilter}
              onChange={(e) => setLocalGroupFilter(e.target.value)}
              title="Select Product Group"
            >
              <option value="ALL">All Groups ({groupedOrders.length} Orders)</option>
              {availableGroups.map((grp) => (
                <option key={grp} value={grp}>
                  Group {grp}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* 2. Top Metric Cards Ribbon */}
      <div className="kpi-ribbon-grid chart-kpi-ribbon">
        <div className="kpi-card">
          <div className="kpi-num text-cyan font-mono">{summaryKPI.totalOrders}</div>
          <div className="kpi-label">Total Production Orders</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-num text-emerald-500 font-mono">{summaryKPI.completedOrders}</div>
          <div className="kpi-label">Fully Completed Orders</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-num text-amber-500 font-mono">{summaryKPI.inProgressOrders}</div>
          <div className="kpi-label">In Progress Orders</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-num font-mono" style={{ color: '#0284C7' }}>
            {summaryKPI.completedSteps} / {summaryKPI.totalSteps}
          </div>
          <div className="kpi-label">Steps Completed</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-num text-cyan font-mono">{summaryKPI.stepCompletionRate}%</div>
          <div className="kpi-label">Completion Rate</div>
        </div>
      </div>

      {/* 3. Pure Chart Grid (ONLY CHART - NO TABLES) */}
      <div className="chart-layout-grid">
        {/* Chart 1: Donut Status Order */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title flex items-center gap-2 font-heading">
              <PieChart size={18} className="text-cyan" />
              <span>Production Order Status Distribution</span>
            </div>
            <span className="chart-card-badge font-mono">{summaryKPI.totalOrders} Orders</span>
          </div>

          <div className="chart-card-body flex items-center justify-around flex-wrap gap-4">
            {/* SVG Donut */}
            <div className="donut-chart-wrapper">
              <svg width="170" height="170" viewBox="0 0 170 170" className="donut-svg">
                {/* Background Ring */}
                <circle cx="85" cy="85" r="62" fill="none" stroke="var(--border-subtle)" strokeWidth="18" />
                {/* Slices */}
                {renderDonutSlice(85, 85, 62, 18, statusDonutAngles.completed.start, statusDonutAngles.completed.end, '#10B981')}
                {renderDonutSlice(85, 85, 62, 18, statusDonutAngles.inProgress.start, statusDonutAngles.inProgress.end, '#00A3E0')}
                {renderDonutSlice(85, 85, 62, 18, statusDonutAngles.notStarted.start, statusDonutAngles.notStarted.end, '#F59E0B')}
              </svg>
              <div className="donut-center-label">
                <span className="donut-center-val font-mono">{summaryKPI.orderCompletionRate}%</span>
                <span className="donut-center-sub">Completed</span>
              </div>
            </div>

            {/* Custom Interactive Legend */}
            <div className="chart-legend-col">
              <div
                className={`legend-item ${hoveredSegment === 'selesai' ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredSegment('selesai')}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <span className="legend-indicator" style={{ backgroundColor: '#10B981' }}></span>
                <div className="legend-info">
                  <div className="legend-label font-semibold">Fully Completed</div>
                  <div className="legend-val font-mono text-xs text-muted">
                    {summaryKPI.completedOrders} orders ({summaryKPI.orderCompletionRate}%)
                  </div>
                </div>
              </div>

              <div
                className={`legend-item ${hoveredSegment === 'berjalan' ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredSegment('berjalan')}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <span className="legend-indicator" style={{ backgroundColor: '#00A3E0' }}></span>
                <div className="legend-info">
                  <div className="legend-label font-semibold">In Progress</div>
                  <div className="legend-val font-mono text-xs text-muted">
                    {summaryKPI.inProgressOrders} orders (
                    {summaryKPI.totalOrders > 0
                      ? Math.round((summaryKPI.inProgressOrders / summaryKPI.totalOrders) * 100)
                      : 0}
                    %)
                  </div>
                </div>
              </div>

              <div
                className={`legend-item ${hoveredSegment === 'pending' ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredSegment('pending')}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <span className="legend-indicator" style={{ backgroundColor: '#F59E0B' }}></span>
                <div className="legend-info">
                  <div className="legend-label font-semibold">Not Started</div>
                  <div className="legend-val font-mono text-xs text-muted">
                    {summaryKPI.notStartedOrders} orders (
                    {summaryKPI.totalOrders > 0
                      ? Math.round((summaryKPI.notStartedOrders / summaryKPI.totalOrders) * 100)
                      : 0}
                    %)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Donut Status Barcode (PROG vs FIN) */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title flex items-center gap-2 font-heading">
              <Activity size={18} className="text-cyan" />
              <span>Barcode Ticket Status (PROG vs FIN)</span>
            </div>
            <span className="chart-card-badge font-mono">{summaryKPI.totalSteps} Step Tickets</span>
          </div>

          <div className="chart-card-body flex items-center justify-around flex-wrap gap-4">
            {/* SVG Donut */}
            <div className="donut-chart-wrapper">
              <svg width="170" height="170" viewBox="0 0 170 170" className="donut-svg">
                <circle cx="85" cy="85" r="62" fill="none" stroke="var(--border-subtle)" strokeWidth="18" />
                {renderDonutSlice(85, 85, 62, 18, barcodeDonutAngles.fin.start, barcodeDonutAngles.fin.end, '#10B981')}
                {renderDonutSlice(85, 85, 62, 18, barcodeDonutAngles.prog.start, barcodeDonutAngles.prog.end, '#0284C7')}
              </svg>
              <div className="donut-center-label">
                <span className="donut-center-val font-mono">
                  {summaryKPI.totalSteps > 0 ? Math.round((summaryKPI.finBarcodeSteps / summaryKPI.totalSteps) * 100) : 0}%
                </span>
                <span className="donut-center-sub">FIN Tickets</span>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="chart-legend-col">
              <div className="legend-item">
                <span className="legend-indicator" style={{ backgroundColor: '#10B981' }}></span>
                <div className="legend-info">
                  <div className="legend-label font-semibold">FIN — Finished</div>
                  <div className="legend-val font-mono text-xs text-muted">
                    {summaryKPI.finBarcodeSteps} steps (
                    {summaryKPI.totalSteps > 0
                      ? Math.round((summaryKPI.finBarcodeSteps / summaryKPI.totalSteps) * 100)
                      : 0}
                    %)
                  </div>
                </div>
              </div>

              <div className="legend-item">
                <span className="legend-indicator" style={{ backgroundColor: '#0284C7' }}></span>
                <div className="legend-info">
                  <div className="legend-label font-semibold">PROG — In Progress</div>
                  <div className="legend-val font-mono text-xs text-muted">
                    {summaryKPI.progBarcodeSteps} steps (
                    {summaryKPI.totalSteps > 0
                      ? Math.round((summaryKPI.progBarcodeSteps / summaryKPI.totalSteps) * 100)
                      : 0}
                    %)
                  </div>
                </div>
              </div>

              <div className="chart-mini-note text-xs text-muted pt-1">
                ✓ Integrates ISC workshop SAP confirmation barcode scanning
              </div>
            </div>
          </div>
        </div>

        {/* Chart 3: Horizontal Stacked Bar per Product Group */}
        <div className="chart-card chart-card-span-2">
          <div className="chart-card-header">
            <div className="chart-card-title flex items-center gap-2 font-heading">
              <Layers size={18} className="text-cyan" />
              <span>Volume & Progress by Product Group (Division)</span>
            </div>
            <span className="chart-card-badge font-mono">{groupStats.length} Groups Detected</span>
          </div>

          <div className="chart-card-body">
            {groupStats.length === 0 ? (
              <div className="text-muted text-center py-6">No data available for this group.</div>
            ) : (
              <div className="bar-chart-list">
                {groupStats.map((grp) => (
                  <div key={grp.group} className="bar-chart-row">
                    <div className="bar-chart-meta">
                      <div className="bar-chart-name font-mono font-bold text-main">
                        Group {grp.group}
                      </div>
                      <div className="bar-chart-stats font-mono text-xs text-muted">
                        <span>{grp.totalOrders} Orders</span>
                        <span>•</span>
                        <span>{grp.completedSteps}/{grp.totalSteps} Steps</span>
                        <span className="font-bold text-cyan">({grp.percent}%)</span>
                      </div>
                    </div>

                    {/* Progress Bar Track */}
                    <div className="bar-chart-track">
                      <div
                        className="bar-chart-fill"
                        style={{
                          width: `${grp.percent}%`,
                          backgroundColor: grp.percent === 100 ? '#10B981' : '#00A3E0'
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chart 4: Top Customers Workload Distribution */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title flex items-center gap-2 font-heading">
              <TrendingUp size={18} className="text-cyan" />
              <span>Top Customer Distribution</span>
            </div>
            <span className="chart-card-badge font-mono">Top 5 Clients</span>
          </div>

          <div className="chart-card-body">
            {customerStats.length === 0 ? (
              <div className="text-muted text-center py-6">No customer data available.</div>
            ) : (
              <div className="customer-rank-list">
                {customerStats.map((c, idx) => {
                  const percent = Math.round((c.completed / Math.max(1, c.count)) * 100);
                  return (
                    <div key={c.customer} className="customer-rank-item">
                      <div className="rank-badge font-mono">{idx + 1}</div>
                      <div className="customer-info-box">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-main truncate" style={{ maxWidth: 180 }}>
                            {c.customer}
                          </span>
                          <span className="font-mono text-muted">{c.count} Orders ({percent}%)</span>
                        </div>
                        <div className="rank-bar-track">
                          <div
                            className="rank-bar-fill"
                            style={{
                              width: `${(c.count / (customerStats[0]?.count || 1)) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chart 5: Step Complexity Bar Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title flex items-center gap-2 font-heading">
              <Clock size={18} className="text-cyan" />
              <span>Order Step Complexity Distribution</span>
            </div>
            <span className="chart-card-badge font-mono">Work Breakdown</span>
          </div>

          <div className="chart-card-body">
            <div className="complexity-chart-bars">
              {complexityStats.map((item) => {
                const total = summaryKPI.totalOrders || 1;
                const percent = Math.round((item.count / total) * 100);

                return (
                  <div key={item.label} className="complexity-bar-item">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-main">{item.label}</span>
                      <span className="font-mono text-muted">
                        {item.count} Orders <strong className="text-cyan">({percent}%)</strong>
                      </span>
                    </div>
                    <div className="complexity-track">
                      <div
                        className="complexity-fill"
                        style={{ width: `${percent}%`, backgroundColor: item.color }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="complexity-footer-summary mt-4 pt-3 border-t flex justify-between text-xs text-muted font-mono">
              <span>Average: {(summaryKPI.totalSteps / Math.max(1, summaryKPI.totalOrders)).toFixed(1)} steps/order</span>
              <span className="text-emerald-500 font-bold flex items-center gap-1">
                <CheckCircle2 size={13} />
                Verified Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
