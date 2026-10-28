import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  Scan,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  AlertTriangle,
  Cloud,
  RotateCcw,
  Upload
} from 'lucide-react';
import CreateOrderModal from '../CreateOrderModal';
import EditOrderModal from '../EditOrderModal';

export default function OrdersListView({
  orders,
  onSelectOrderAndOpenScanner,
  onMarkStepFinished,
  onRevertStep,
  isAdmin,
  selectedGroup,
  onCreateOrder,
  onUpdateOrder,
  onDeleteOrder,
  isLoadingCloud,
  onOpenImport
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);

  // Group steps by NoProduksi
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
          ProductGroup: step.ProductGroup || step.orderDivision || '',
          orderDivision: step.orderDivision || step.ProductGroup || 'PKW',
          qtyOrder: step.qtyOrder || 1,
          materialNo: step.materialNo || '',
          materialDescription: step.materialDescription || '',
          planStart: step.planStart || '',
          planFinish: step.planFinish || '',
          status: step.status !== undefined ? step.status : (String(step.Status).toLowerCase() === 'selesai' ? 1 : 0),
          steps: []
        });
      }
      map.get(orderNo).steps.push(step);
    });

    return Array.from(map.values()).map((order) => {
      const sortedSteps = [...order.steps].sort((a, b) => Number(a.Langkah) - Number(b.Langkah));
      const totalSteps = sortedSteps.length;
      const completedSteps = sortedSteps.filter(
        (s) => String(s.Status).toLowerCase() === 'selesai'
      ).length;
      const isComplete = completedSteps === totalSteps && totalSteps > 0;
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
  }, [orders]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return ordersGrouped.filter((order) => {
      const matchesGroup =
        selectedGroup === 'ALL' ||
        (order.ProductGroup && order.ProductGroup.toUpperCase() === selectedGroup.toUpperCase());

      if (!matchesGroup) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchNo = String(order.NoProduksi || '').toLowerCase().includes(term);
      const matchGroup = String(order.ProductGroup || '').toLowerCase().includes(term);
      const matchTitle = String(order.title || '').toLowerCase().includes(term);
      const matchCustomer = String(order.customers || '').toLowerCase().includes(term);
      const matchStep = order.steps.some((s) => String(s.NamaLangkah || '').toLowerCase().includes(term));

      return matchNo || matchGroup || matchTitle || matchCustomer || matchStep;
    });
  }, [ordersGrouped, selectedGroup, searchTerm]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalOrders = ordersGrouped.length;
    const completedOrders = ordersGrouped.filter((o) => o.isComplete).length;
    const activeOrders = totalOrders - completedOrders;
    const totalSteps = orders.length;
    const completedSteps = orders.filter((s) => String(s.Status).toLowerCase() === 'selesai').length;

    return { totalOrders, completedOrders, activeOrders, totalSteps, completedSteps };
  }, [ordersGrouped, orders]);

  // Handle Create Submit
  const handleCreateSubmit = async (formData) => {
    if (onCreateOrder) {
      await onCreateOrder(formData);
      setIsCreateModalOpen(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (formData) => {
    if (onUpdateOrder) {
      await onUpdateOrder(formData);
      setOrderToEdit(null);
    }
  };

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (orderToDelete && onDeleteOrder) {
      await onDeleteOrder(orderToDelete);
      setOrderToDelete(null);
    }
  };

  return (
    <div className="view-container">
      {/* View Header */}
      <div className="view-header-row">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="view-title">Daftar Seluruh Order Produksi (SAP & Cloud)</h2>
            <span className="badge badge-cyan flex items-center gap-1 font-mono text-xs">
              <Cloud size={12} />
              SharePoint Live
            </span>
          </div>
          <p className="view-subtitle">
            Katalog order kerja, pemantauan progres langkah, dan sinkronisasi cloud real-time
          </p>
        </div>

        {/* Action Controls & Search */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* Quick Search */}
          <div className="panel-search-box" style={{ minWidth: '180px', flex: '1 1 200px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Cari order, customer, langkah..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Import Excel Button (Only for Admin) */}
          {isAdmin && onOpenImport && (
            <button
              type="button"
              className="btn btn-outline flex items-center gap-1.5 text-xs font-semibold"
              onClick={onOpenImport}
              title="Import Data Order dari file Excel (.xlsx / .xls) ke Database"
            >
              <Upload size={14} className="text-cyan" />
              <span>Import Excel</span>
            </button>
          )}

          {/* Add Order Button (CREATE) */}
          {isAdmin && (
            <button
              type="button"
              className="btn btn-primary flex items-center gap-1 text-xs"
              onClick={() => setIsCreateModalOpen(true)}
              title="Buat order baru langsung ke SharePoint"
            >
              <Plus size={14} />
              <span>Tambah Order</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="kpi-ribbon-grid">
        <div className="kpi-card">
          <div className="kpi-num text-cyan font-mono">{stats.totalOrders}</div>
          <div className="kpi-label">Total Order Produksi</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-num text-emerald-500 font-mono">{stats.completedOrders}</div>
          <div className="kpi-label">Order Selesai Penuh</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-num text-amber-500 font-mono">{stats.activeOrders}</div>
          <div className="kpi-label">Order Sedang Berjalan</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-num font-mono">
            {stats.completedSteps} / {stats.totalSteps}
          </div>
          <div className="kpi-label">Total Langkah Selesai</div>
        </div>
      </div>

      {/* Orders Table Catalog */}
      <div className="orders-catalog-wrapper">
        <div className="orders-table-card">
          <table className="steps-table">
            <thead>
              <tr>
                <th style={{ width: '150px' }}>No. Produksi</th>
                <th style={{ width: '100px' }}>Group</th>
                <th>Pekerjaan & Customer</th>
                <th>Progres Pengerjaan</th>
                <th style={{ width: '130px' }}>Status Order</th>
                <th style={{ width: '220px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Tidak ada order yang sesuai dengan pencarian atau filter grup.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord, idx) => {
                  const percent = Math.round((ord.completedSteps / Math.max(1, ord.totalSteps)) * 100);
                  const isExpanded = expandedOrder === ord.NoProduksi;

                  return (
                    <React.Fragment key={ord.NoProduksi || ord.id || idx}>
                      <tr className="order-row-main">
                        <td className="font-mono font-bold text-main" style={{ fontSize: '0.92rem' }}>
                          <div className="flex flex-col">
                            <span>{ord.NoProduksi}</span>
                            {ord.id > 0 && (
                              <span className="text-xs font-mono text-muted" style={{ fontSize: '0.65rem' }}>
                                ID: #{ord.id}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="group-tag">{ord.ProductGroup || 'PKW'}</span>
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-semibold text-main text-xs" style={{ color: 'var(--text-main)' }}>
                              {ord.title || ord.activeStep?.NamaLangkah || 'Order Produksi ISC'}
                            </span>
                            {ord.customers && (
                              <span className="text-xs text-muted" style={{ fontSize: '0.72rem' }}>
                                Cust: {ord.customers}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col gap-1" style={{ width: '160px' }}>
                            <div className="flex justify-between text-xs font-mono text-muted">
                              <span>{ord.completedSteps}/{ord.totalSteps} Selesai</span>
                              <span>{percent}%</span>
                            </div>
                            <div className="progress-bar-track" style={{ width: '100%' }}>
                              <div className="progress-bar-fill" style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {ord.isComplete ? (
                            <span className="status-badge status-selesai">
                              <CheckCircle2 size={13} />
                              Selesai
                            </span>
                          ) : ord.steps.length > 0 && ord.steps.every((s) => String(s.Status).toLowerCase() === 'not started') ? (
                            <span className="status-badge status-pending">
                              <Clock size={13} />
                              Not Started
                            </span>
                          ) : (
                            <span className="status-badge status-berjalan active">
                              <Clock size={13} />
                              Berjalan
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              className="btn btn-xs btn-primary"
                              onClick={() => onSelectOrderAndOpenScanner(ord.NoProduksi)}
                              title="Buka di terminal scanner untuk pemindaian barcode"
                            >
                              <Scan size={12} />
                              <span>Scan</span>
                            </button>

                            <button
                              type="button"
                              className="btn btn-xs btn-outline"
                              onClick={() => setExpandedOrder(isExpanded ? null : ord.NoProduksi)}
                              title="Lihat detail langkah"
                            >
                              <span>{isExpanded ? 'Tutup' : 'Langkah'}</span>
                            </button>

                            {/* Edit Button (UPDATE) */}
                            {isAdmin && (
                              <button
                                type="button"
                                className="btn btn-xs btn-secondary"
                                onClick={() => setOrderToEdit(ord)}
                                title="Edit order di SharePoint"
                              >
                                <Edit3 size={12} />
                              </button>
                            )}

                            {/* Delete Button (DELETE) */}
                            {isAdmin && (
                              <button
                                type="button"
                                className="btn btn-xs btn-danger"
                                onClick={() => setOrderToDelete(ord)}
                                title="Hapus order dari SharePoint"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Steps Details */}
                      {isExpanded && (
                        <tr className="expanded-row-details">
                          <td colSpan={6} style={{ padding: '16px 24px', backgroundColor: 'var(--bg-surface-elevated)' }}>
                            <div className="font-bold text-xs uppercase text-muted mb-2 tracking-wider">
                              Rangkaian Langkah Order {ord.NoProduksi}:
                            </div>
                            <div className="steps-table-container">
                              <table className="steps-table">
                                <thead>
                                  <tr>
                                    <th style={{ width: '70px' }}>Step</th>
                                    <th>Nama Langkah</th>
                                    <th style={{ width: '160px' }}>No. Konfirmasi</th>
                                    <th style={{ width: '140px' }}>Status</th>
                                    {isAdmin && <th style={{ minWidth: '150px', textAlign: 'center' }}>Aksi</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {ord.steps.map((st) => {
                                    const isDone = String(st.Status).toLowerCase() === 'selesai';
                                    const isNotStarted = String(st.Status).toLowerCase() === 'not started';
                                    const isActive =
                                      ord.activeStep && Number(ord.activeStep.Langkah) === Number(st.Langkah);

                                    return (
                                      <tr key={st.Langkah} className={isActive ? 'row-active' : ''}>
                                        <td className="font-mono font-bold">{st.Langkah}</td>
                                        <td>{st.NamaLangkah}</td>
                                        <td className="font-mono text-cyan font-bold">{st.NoKonfirmasi}</td>
                                        <td>
                                          {isDone ? (
                                            <span className="status-badge status-selesai">Selesai</span>
                                          ) : isNotStarted ? (
                                            <span className="status-badge status-pending">Not Started</span>
                                          ) : isActive ? (
                                            <span className="status-badge status-berjalan active">Langkah Aktif</span>
                                          ) : (
                                            <span className="status-badge status-pending">Menunggu</span>
                                          )}
                                        </td>
                                        {isAdmin && (
                                          <td style={{ textAlign: 'center' }}>
                                            {!isDone ? (
                                              <button
                                                type="button"
                                                className={`btn btn-xs ${isActive ? 'btn-success' : 'btn-outline-cyan'}`}
                                                onClick={() => onMarkStepFinished(ord.NoProduksi, st.Langkah)}
                                                title={`Tandai Langkah ${st.Langkah} Selesai`}
                                              >
                                                Selesai
                                              </button>
                                            ) : (
                                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                <span className="text-xs text-muted font-mono">Terverifikasi</span>
                                                <button
                                                  type="button"
                                                  className="btn btn-xs btn-outline-warning flex items-center gap-1"
                                                  onClick={() => onRevertStep && onRevertStep(ord.NoProduksi, st.Langkah, st.id || st.ID)}
                                                  title={`Admin: Kembalikan Langkah ${st.Langkah} ke Belum Selesai`}
                                                >
                                                  <RotateCcw size={11} />
                                                  <span>Belum Selesai</span>
                                                </button>
                                              </div>
                                            )}
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE ORDER MODAL */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        isLoading={isLoadingCloud}
      />

      {/* EDIT ORDER MODAL */}
      <EditOrderModal
        isOpen={Boolean(orderToEdit)}
        order={orderToEdit}
        onClose={() => setOrderToEdit(null)}
        onSubmit={handleEditSubmit}
        isLoading={isLoadingCloud}
      />

      {/* DELETE CONFIRMATION MODAL */}
      {orderToDelete && typeof document !== 'undefined' && createPortal(
        <div className="modal-backdrop" onClick={() => setOrderToDelete(null)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2 text-rose-500">
                <AlertTriangle size={20} />
                <h3 className="modal-title" style={{ color: '#EF4444' }}>Konfirmasi Hapus Order</h3>
              </div>
            </div>
            <div className="modal-body">
              <p className="text-sm mb-2">
                Apakah Anda yakin ingin menghapus Order <strong>#{orderToDelete.NoProduksi}</strong>
                {orderToDelete.id > 0 && ` (SharePoint ID: ${orderToDelete.id})`} dari sistem dan cloud?
              </p>
              <p className="text-xs text-muted">
                Tindakan ini akan menghapus data permanen dari SharePoint List dan tabel lokal.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setOrderToDelete(null)}
                disabled={isLoadingCloud}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger flex items-center gap-1"
                onClick={handleConfirmDelete}
                disabled={isLoadingCloud}
              >
                {isLoadingCloud ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Hapus Permanen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
