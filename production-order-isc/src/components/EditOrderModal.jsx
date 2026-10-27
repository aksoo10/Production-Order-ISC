import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Save,
  AlertCircle,
  Loader2,
  Edit3,
  Plus,
  Trash2,
  Minus,
  Layers
} from 'lucide-react';

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

  const [steps, setSteps] = useState([]);
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

      // Populate steps array flexibly
      const existingSteps = (order.steps && Array.isArray(order.steps) && order.steps.length > 0)
        ? order.steps.map((st, idx) => ({
            id: st.id || st.ID,
            Langkah: st.Langkah || idx + 1,
            NamaLangkah: st.NamaLangkah || order.title || `Langkah ${idx + 1}`,
            NoKonfirmasi: st.NoKonfirmasi || order.NoKonfirmasi || order.NoProduksi || '',
            Status: st.Status || 'Berjalan'
          }))
        : [{
            Langkah: 1,
            NamaLangkah: order.NamaLangkah || order.title || 'Langkah 1',
            NoKonfirmasi: order.NoKonfirmasi || order.NoProduksi || '',
            Status: order.Status || 'Berjalan'
          }];

      setSteps(existingSteps);
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

  const handleAddStep = () => {
    setSteps((prev) => {
      const nextNum = prev.length + 1;
      const baseKonf = prev[0]?.NoKonfirmasi || formData.orderNo || '1000000';
      return [
        ...prev,
        {
          Langkah: nextNum,
          NamaLangkah: `${formData.title || 'Pekerjaan'} - Langkah ${nextNum}`,
          NoKonfirmasi: baseKonf,
          Status: 'Berjalan'
        }
      ];
    });
  };

  const handleRemoveStep = (indexToRemove) => {
    if (steps.length <= 1) return;
    setSteps((prev) => {
      const filtered = prev.filter((_, idx) => idx !== indexToRemove);
      return filtered.map((st, idx) => ({
        ...st,
        Langkah: idx + 1
      }));
    });
  };

  const handleStepChange = (index, field, value) => {
    setSteps((prev) =>
      prev.map((st, idx) => {
        if (idx === index) {
          return { ...st, [field]: value };
        }
        return st;
      })
    );
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

    if (steps.length === 0) {
      setError('Minimal harus ada 1 langkah pengerjaan.');
      return;
    }

    onSubmit({
      ...formData,
      steps: steps
    });
  };

  const modalContent = (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '680px', width: '92%' }}
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
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
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
                  <option value="PKW">PKW (Wood Process.Ser)</option>
                  <option value="PULP">PULP (Pulp Process)</option>
                  <option value="SERVICE">SERVICE (Field Service)</option>
                  <option value="WORKSHOP">WORKSHOP (Machining & Fab)</option>
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

            {/* JUMLAH LANGKAH: FLEKSIBEL DENGAN TOMBOL '+' */}
            <div className="mb-3 p-3 bg-slate-900/60 rounded-md border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-cyan" />
                  <label className="input-label font-bold text-xs text-white uppercase tracking-wider mb-0">
                    Jumlah Langkah: <span className="text-cyan font-mono text-sm ml-1">{steps.length} Langkah</span>
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="btn btn-xs btn-outline flex items-center justify-center p-1 text-xs"
                    onClick={() => handleRemoveStep(steps.length - 1)}
                    disabled={steps.length <= 1}
                    title="Kurangi langkah terakhir (-)"
                  >
                    <Minus size={13} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-primary flex items-center gap-1 font-bold text-xs px-2.5 py-1"
                    onClick={handleAddStep}
                    title="Tambah satu langkah (+)"
                  >
                    <Plus size={14} />
                    <span>Tambah Langkah (+)</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted mb-2.5">
                Jumlah langkah fleksibel dapat ditambah satu per satu dengan tombol <strong>+</strong> sesuai alur pengerjaan bengkel.
              </p>

              <div className="space-y-2">
                {steps.map((st, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-slate-800/90 rounded border border-slate-700/80"
                  >
                    <span className="font-mono font-bold text-xs px-2 py-1 bg-cyan/20 text-cyan rounded border border-cyan/40 flex-shrink-0">
                      Step {idx + 1}
                    </span>

                    <input
                      type="text"
                      className="modal-input text-xs flex-1"
                      placeholder={`Nama Langkah ${idx + 1}`}
                      value={st.NamaLangkah}
                      onChange={(e) => handleStepChange(idx, 'NamaLangkah', e.target.value)}
                      required
                    />

                    <input
                      type="text"
                      className="modal-input text-xs font-mono w-32 flex-shrink-0"
                      placeholder="No. Konfirmasi"
                      value={st.NoKonfirmasi}
                      onChange={(e) => handleStepChange(idx, 'NoKonfirmasi', e.target.value)}
                      title="Nomor Konfirmasi SAP"
                    />

                    <select
                      className="modal-input text-xs w-32 font-semibold flex-shrink-0"
                      value={st.Status}
                      onChange={(e) => handleStepChange(idx, 'Status', e.target.value)}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="Berjalan">Berjalan</option>
                      <option value="Selesai">Selesai</option>
                    </select>

                    {steps.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-xs btn-danger p-1 flex-shrink-0"
                        onClick={() => handleRemoveStep(idx)}
                        title="Hapus langkah ini"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
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

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
