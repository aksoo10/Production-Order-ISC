import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Loader2, Edit3 } from 'lucide-react';

export default function EditOrderModal({ isOpen, onClose, onSubmit, order, isLoading }) {
  const [formData, setFormData] = useState({
    id: 0,
    orderNo: '',
    title: '',
    customers: '',
    soDocument: '',
    wbsProdNo: '',
    orderDivision: 'PKW',
    materialNo: '',
    materialDescription: '',
    qtyOrder: 1,
    planStart: '',
    planFinish: '',
    status: 0
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (order) {
      setFormData({
        id: order.id || order.ID || 0,
        orderNo: order.NoProduksi || order.orderNo || '',
        title: order.title || order.NamaLangkah || '',
        customers: order.customers || '',
        soDocument: order.soDocument || '',
        wbsProdNo: order.wbsProdNo || '',
        orderDivision: order.ProductGroup || order.orderDivision || 'PKW',
        materialNo: order.materialNo || '',
        materialDescription: order.materialDescription || '',
        qtyOrder: order.qtyOrder || 1,
        planStart: order.planStart ? order.planStart.split('T')[0] : '',
        planFinish: order.planFinish ? order.planFinish.split('T')[0] : '',
        status: (order.status !== undefined) ? Number(order.status) : (String(order.Status).toLowerCase() === 'selesai' ? 1 : 0)
      });
      setError('');
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (parseFloat(value) || 0) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.orderNo.trim()) {
      setError('Nomor Order Produksi (orderNo) wajib diisi.');
      return;
    }

    if (!formData.id || formData.id <= 0) {
      setError('Item ini tidak memiliki ID SharePoint valid untuk proses update.');
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '640px', width: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Edit3 className="text-cyan" size={20} />
            <h3 className="modal-title">Edit Order #{formData.orderNo} (SharePoint ID: {formData.id})</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} disabled={isLoading}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {error && (
              <div className="alert-box alert-error mb-4">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="input-label font-bold text-xs text-muted mb-1 block">
                  Nomor Order Produksi *
                </label>
                <input
                  type="text"
                  name="orderNo"
                  className="modal-input font-mono"
                  value={formData.orderNo}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="input-label font-bold text-xs text-muted mb-1 block">
                  Divisi / Product Group
                </label>
                <select
                  name="orderDivision"
                  className="modal-input"
                  value={formData.orderDivision}
                  onChange={handleChange}
                >
                  <option value="PKW">PKW (Workshop Bengkel)</option>
                  <option value="MCH">MCH (Machining)</option>
                  <option value="WLD">WLD (Welding)</option>
                  <option value="ASY">ASY (Assembly)</option>
                  <option value="FND">FND (Foundry)</option>
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label className="input-label font-bold text-xs text-muted mb-1 block">
                Judul Pekerjaan / Nama Komponen *
              </label>
              <input
                type="text"
                name="title"
                className="modal-input"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="input-label font-bold text-xs text-muted mb-1 block">
                  Nama Customer
                </label>
                <input
                  type="text"
                  name="customers"
                  className="modal-input"
                  value={formData.customers}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="input-label font-bold text-xs text-muted mb-1 block">
                  Nomor Dokumen SO
                </label>
                <input
                  type="text"
                  name="soDocument"
                  className="modal-input font-mono"
                  value={formData.soDocument}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="input-label font-bold text-xs text-muted mb-1 block">
                  Nomor WBS Produksi
                </label>
                <input
                  type="text"
                  name="wbsProdNo"
                  className="modal-input font-mono"
                  value={formData.wbsProdNo}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="input-label font-bold text-xs text-muted mb-1 block">
                  Jumlah Order (Qty)
                </label>
                <input
                  type="number"
                  name="qtyOrder"
                  min="1"
                  step="1"
                  className="modal-input font-mono"
                  value={formData.qtyOrder}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="input-label font-bold text-xs text-muted mb-1 block">
                  Rencana Mulai
                </label>
                <input
                  type="date"
                  name="planStart"
                  className="modal-input"
                  value={formData.planStart}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="input-label font-bold text-xs text-muted mb-1 block">
                  Target Selesai
                </label>
                <input
                  type="date"
                  name="planFinish"
                  className="modal-input"
                  value={formData.planFinish}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="input-label font-bold text-xs text-muted mb-1 block">
                Status Pekerjaan
              </label>
              <select
                name="status"
                className="modal-input font-bold"
                value={formData.status}
                onChange={handleChange}
              >
                <option value={0}>Sedang Berjalan (0 - In Progress)</option>
                <option value={1}>Sudah Selesai (1 - Finished)</option>
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Memperbarui Cloud...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
