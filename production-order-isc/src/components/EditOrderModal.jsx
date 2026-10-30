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
    const parsedVal = type === 'number' ? (parseFloat(value) || 0) : value;
    setFormData((prev) => ({
      ...prev,
      [name]: parsedVal
    }));

    if (name === 'status') {
      const isCompleted = Number(parsedVal) === 1;
      if (isCompleted) {
        setSteps((prevSteps) =>
          prevSteps.map((st) => ({
            ...st,
            Status: 'Selesai'
          }))
        );
      }
    }
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
    setSteps((prev) => {
      const nextSteps = prev.map((st, idx) => {
        if (idx === index) {
          return { ...st, [field]: value };
        }
        return st;
      });

      if (field === 'Status') {
        const allCompleted = nextSteps.every(
          (s) => String(s.Status).toLowerCase() === 'selesai' || String(s.Status).toLowerCase() === 'completed'
        );
        setFormData((prevForm) => ({
          ...prevForm,
          status: allCompleted ? 1 : 0
        }));
      }

      return nextSteps;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.orderNo.trim()) {
      setError('Production Order Number (orderNo) is required.');
      return;
    }

    if (!formData.id || formData.id <= 0) {
      setError('This item does not have a valid SharePoint ID for updating.');
      return;
    }

    if (steps.length === 0) {
      setError('At least 1 process step is required.');
      return;
    }

    const isOrderCompleted = Number(formData.status) === 1 || steps.every(
      (s) => String(s.Status).toLowerCase() === 'selesai' || String(s.Status).toLowerCase() === 'completed'
    );

    const finalSteps = isOrderCompleted
      ? steps.map((s) => ({ ...s, Status: 'Selesai' }))
      : steps;

    onSubmit({
      ...formData,
      status: isOrderCompleted ? 1 : 0,
      steps: finalSteps
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
                  Production Order Number *
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
                  Division / Product Group
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
                Job Title / Component Name *
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
                  Customer Name
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
                  SO Document Number
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
                  Production WBS Number
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
                  Order Quantity (Qty)
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

            {/* FLEXIBLE NUMBER OF STEPS */}
            <div className="mb-3 p-3 bg-slate-900/60 rounded-md border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-cyan" />
                  <label className="input-label font-bold text-xs text-white uppercase tracking-wider mb-0">
                    Total Steps: <span className="text-cyan font-mono text-sm ml-1">{steps.length} Steps</span>
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="btn btn-xs btn-outline flex items-center justify-center p-1 text-xs"
                    onClick={() => handleRemoveStep(steps.length - 1)}
                    disabled={steps.length <= 1}
                    title="Remove last step (-)"
                  >
                    <Minus size={13} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-primary flex items-center gap-1 font-bold text-xs px-2.5 py-1"
                    onClick={handleAddStep}
                    title="Add one step (+)"
                  >
                    <Plus size={14} />
                    <span>Add Step (+)</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted mb-2.5">
                Flexible steps can be added individually with the <strong>+</strong> button according to workshop workflow.
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
                      placeholder={`Step Name ${idx + 1}`}
                      value={st.NamaLangkah}
                      onChange={(e) => handleStepChange(idx, 'NamaLangkah', e.target.value)}
                      required
                    />

                    <input
                      type="text"
                      className="modal-input text-xs font-mono w-32 flex-shrink-0"
                      placeholder="Confirmation No."
                      value={st.NoKonfirmasi}
                      onChange={(e) => handleStepChange(idx, 'NoKonfirmasi', e.target.value)}
                      title="SAP Confirmation Number"
                    />

                    <select
                      className="modal-input text-xs w-32 font-semibold flex-shrink-0"
                      value={st.Status}
                      onChange={(e) => handleStepChange(idx, 'Status', e.target.value)}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="Berjalan">In Progress</option>
                      <option value="Selesai">Completed</option>
                    </select>

                    {steps.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-xs btn-danger p-1 flex-shrink-0"
                        onClick={() => handleRemoveStep(idx)}
                        title="Delete this step"
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
                  Planned Start Date
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
                  Planned Finish Date
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
                Work Status
              </label>
              <select
                name="status"
                className="modal-input font-bold"
                value={formData.status}
                onChange={handleChange}
              >
                <option value={0}>In Progress (0)</option>
                <option value={1}>Completed (1)</option>
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
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Updating Cloud...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
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
