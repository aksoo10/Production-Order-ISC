import React, { useState } from 'react';
import { X, Plus, AlertCircle, Loader2, CloudUpload } from 'lucide-react';

export default function CreateOrderModal({ isOpen, onClose, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    orderNo: '',
    title: '',
    customers: 'PT ANDRITZ Hydro & Separation',
    soDocument: '',
    wbsProdNo: '',
    orderDivision: 'PKW',
    materialNo: '',
    materialDescription: '',
    qtyOrder: 1,
    planStart: new Date().toISOString().split('T')[0],
    planFinish: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    status: 0
  });

  const [error, setError] = useState('');

  if (!isOpen) return null;

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

    if (!formData.title.trim()) {
      setError('Judul Pekerjaan / Order wajib diisi.');
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
            <CloudUpload className="text-cyan" size={20} />
            <h3 className="modal-title">Tambah Order Produksi ke Cloud (SharePoint)</h3>
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
                  Nomor Order Produksi (Wajib) *
                </label>
                <input
                  type="text"
                  name="orderNo"
                  className="modal-input font-mono"
                  placeholder="Contoh: 10045690"
                  value={formData.orderNo}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="input-label font-bold text-xs text-muted mb-1 block">
                  Divisi / Product Group *
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
                placeholder="Contoh: Impeller D450 Machining & Dynamic Balancing"
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
                  placeholder="Contoh: PT Semen Padang"
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
                  placeholder="Contoh: SO-2026-88022"
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
                  placeholder="Contoh: WBS-ISC-PKW-050"
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
                  Kode Material SAP
                </label>
                <input
                  type="text"
                  name="materialNo"
                  className="modal-input font-mono"
                  placeholder="Contoh: MAT-SS316-012"
                  value={formData.materialNo}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="input-label font-bold text-xs text-muted mb-1 block">
                  Deskripsi Material
                </label>
                <input
                  type="text"
                  name="materialDescription"
                  className="modal-input"
                  placeholder="Contoh: SS 316 L Casting"
                  value={formData.materialDescription}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="input-label font-bold text-xs text-muted mb-1 block">
                  Rencana Mulai (Plan Start)
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
                  Target Selesai (Plan Finish)
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
                Status Awal
              </label>
              <select
                name="status"
                className="modal-input"
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
                  <span>Mengirim ke Cloud...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Simpan ke SharePoint</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
