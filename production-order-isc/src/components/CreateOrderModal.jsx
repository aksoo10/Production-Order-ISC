import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  AlertCircle,
  Loader2,
  CloudUpload,
  Minus,
  Trash2,
  Layers
} from 'lucide-react';

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

  const [steps, setSteps] = useState([
    {
      Langkah: 1,
      NamaLangkah: 'Persiapan & Pengerjaan Komponen',
      NoKonfirmasi: '',
      Status: 'Berjalan'
    }
  ]);

  const [error, setError] = useState('');

  if (!isOpen) return null;

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

    if (!formData.title.trim()) {
      setError('Judul Pekerjaan / Order wajib diisi.');
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
            <CloudUpload className="text-cyan" size={20} />
            <h3 className="modal-title">Tambah Order Produksi ke Cloud (SharePoint)</h3>
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
                  <span>Menyimpan ke Cloud...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Simpan Order Baru</span>
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
