import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Download,
  Info,
  Loader2
} from 'lucide-react';
import { parseExcelFile, downloadTemplateExcel } from '../utils/excelHelper';

export default function ExcelImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  currentPersonnel = []
}) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      processFile(dropped);
    }
  };

  const processFile = (fileObj) => {
    setFile(fileObj);
    setErrorMsg('');
    setPreviewData(null);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const result = parseExcelFile(buffer, currentPersonnel);
        if (result.success) {
          const uniqueOrders = new Set(result.orders.map(o => o.NoProduksi)).size;
          setPreviewData({
            orders: result.orders,
            personnel: result.personnel || currentPersonnel,
            totalSteps: result.orders.length,
            uniqueOrders,
            totalPersonnel: (result.personnel || currentPersonnel).length,
            sourceSheet: result.sourceSheet,
            personnelSheetFound: result.personnelSheetFound
          });
        } else {
          setErrorMsg(result.error);
        }
      } catch (err) {
        setErrorMsg(`Gagal memproses file: ${err.message}`);
      } finally {
        setParsing(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Gagal membaca file dari penyimpanan lokal.');
      setParsing(false);
    };

    reader.readAsArrayBuffer(fileObj);
  };

  const handleConfirmImport = async () => {
    if (!previewData || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onImportSuccess(previewData.orders, previewData.personnel);
      onClose();
    } catch (err) {
      setErrorMsg(`Gagal menyimpan ke database cloud: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={isSubmitting ? undefined : onClose}>
      <div className="modal-content import-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="auth-icon-badge">
              <Upload size={20} color="#00A3E0" />
            </div>
            <div>
              <h3 className="modal-title font-heading">Impor Data Excel SAP</h3>
              <p className="modal-desc">Pilih file Excel ekspor SAP untuk memperbarui data order bengkel & cloud</p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            disabled={isSubmitting}
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body flex flex-col gap-4">
          {/* Format Specification Guide */}
          <div className="import-format-guide">
            <div className="guide-header-title">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-cyan flex-shrink-0" />
                <span>Format Langkah & Nomor Konfirmasi:</span>
              </div>
              <span className="guide-rule-badge">Wajib 1 Baris per Langkah</span>
            </div>

            <div className="guide-rules-grid">
              <div className="guide-rule-card">
                <strong>
                  <span className="text-cyan">①</span> 1 Baris per Langkah (Step)
                </strong>
                <p>
                  Bukan total langkah dalam 1 baris. Setiap langkah pengerjaan ditulis pada baris tersendiri: <code>Step 1</code>, <code>Step 2</code>, <code>Step 3</code>, dst. (atau angka <code>1</code>, <code>2</code>, <code>3</code>).
                </p>
              </div>

              <div className="guide-rule-card">
                <strong>
                  <span className="text-emerald-500">②</span> Nomor Konfirmasi Tetap Sama
                </strong>
                <p>
                  Seluruh langkah pada No. Produksi yang sama memiliki <strong>No. Konfirmasi yang identik</strong> untuk verifikasi barcode tiket pengerjaan.
                </p>
              </div>
            </div>

            {/* Quick Table Example */}
            <div className="guide-table-wrap">
              <table className="guide-sample-table">
                <thead>
                  <tr>
                    <th>NoProduksi</th>
                    <th>ProductGroup</th>
                    <th>Langkah</th>
                    <th>NamaLangkah</th>
                    <th>NoKonfirmasi</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-mono font-bold">4800115516</td>
                    <td>PKW</td>
                    <td><span className="guide-step-tag">Step 1</span></td>
                    <td>Persiapan Material & Disassembly</td>
                    <td><span className="guide-conf-tag">100014</span></td>
                    <td><span className="status-badge status-selesai text-xs">Selesai</span></td>
                  </tr>
                  <tr>
                    <td className="font-mono font-bold">4800115516</td>
                    <td>PKW</td>
                    <td><span className="guide-step-tag">Step 2</span></td>
                    <td>Machining & Dynamic Balancing</td>
                    <td><span className="guide-conf-tag">100014</span></td>
                    <td><span className="status-badge status-berjalan text-xs">Berjalan</span></td>
                  </tr>
                  <tr>
                    <td className="font-mono font-bold">4800115516</td>
                    <td>PKW</td>
                    <td><span className="guide-step-tag">Step 3</span></td>
                    <td>Final QC & Packaging</td>
                    <td><span className="guide-conf-tag">100014</span></td>
                    <td><span className="status-badge status-berjalan text-xs">Berjalan</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            className={`import-dropzone ${isDragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
            />

            <FileSpreadsheet size={40} className="dropzone-icon" />
            <div className="dropzone-text">
              {file ? (
                <>
                  <div className="file-name-highlight font-mono">{file.name}</div>
                  <div className="file-size-text text-muted">
                    {(file.size / 1024).toFixed(1)} KB — Klik untuk memilih file lain
                  </div>
                </>
              ) : (
                <>
                  <div className="dropzone-title">Klik atau Seret File Excel (.xlsx) ke Sini</div>
                  <div className="dropzone-sub">Mendukung file ekspor SAP dan template ISC</div>
                </>
              )}
            </div>
          </div>

          {/* Error Message if parsing genuinely failed */}
          {errorMsg && (
            <div className="alert-box alert-danger">
              <AlertCircle size={18} className="flex-shrink-0" />
              <div className="alert-content">
                <strong>Perhatian:</strong> {errorMsg}
              </div>
            </div>
          )}

          {/* Preview Stats once detected */}
          {previewData && (
            <div className="import-preview-box">
              <div className="preview-header">
                <CheckCircle2 size={18} color="#059669" />
                <span className="font-bold text-main">
                  File Siap Diimpor (Dibaca dari sheet: "{previewData.sourceSheet}")
                </span>
              </div>
              <div className="preview-metrics-grid">
                <div className="preview-metric-card">
                  <div className="metric-val text-cyan font-mono">{previewData.uniqueOrders}</div>
                  <div className="metric-lbl">Total Order Produksi</div>
                </div>
                <div className="preview-metric-card">
                  <div className="metric-val text-cyan font-mono">{previewData.totalSteps}</div>
                  <div className="metric-lbl">Total Baris Langkah</div>
                </div>
                <div className="preview-metric-card">
                  <div className="metric-val font-mono" style={{ color: '#059669' }}>
                    {previewData.totalPersonnel}
                  </div>
                  <div className="metric-lbl">Personel Operator</div>
                </div>
              </div>

              <div className="text-xs text-muted flex items-center justify-between px-1">
                <span>✓ Format terverifikasi: 1 baris per langkah (No. Konfirmasi seragam)</span>
                <span className="font-mono text-cyan">
                  {(previewData.totalSteps / (previewData.uniqueOrders || 1)).toFixed(1)} langkah/order
                </span>
              </div>

              {/* Sample preview table of first 4 parsed rows */}
              {previewData.orders && previewData.orders.length > 0 && (
                <div className="preview-sample-table-wrap">
                  <table className="guide-sample-table">
                    <thead>
                      <tr>
                        <th>NoProduksi</th>
                        <th>Langkah</th>
                        <th>NamaLangkah</th>
                        <th>NoKonfirmasi</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.orders.slice(0, 4).map((o, idx) => (
                        <tr key={idx}>
                          <td className="font-mono font-bold">{o.NoProduksi}</td>
                          <td><span className="guide-step-tag">Step {o.Langkah}</span></td>
                          <td className="truncate" style={{ maxWidth: 160 }}>{o.NamaLangkah}</td>
                          <td><span className="guide-conf-tag">{o.NoKonfirmasi}</span></td>
                          <td>
                            <span className={`status-badge text-xs ${o.Status === 'Selesai' ? 'status-selesai' : 'status-berjalan'}`}>
                              {o.Status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Submitting Progress Banner */}
          {isSubmitting && (
            <div className="alert-box alert-info flex items-center gap-3 mt-3">
              <Loader2 size={20} className="animate-spin text-cyan flex-shrink-0" />
              <div className="alert-content">
                <strong>Menyimpan ke Database Cloud...</strong>
                <div className="text-xs">
                  Sedang mengirim dan menyinkronkan data order ke SharePoint via Power Automate. Mohon jangan menutup halaman.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer justify-between">
          <button
            type="button"
            className="btn btn-sm btn-outline"
            disabled={isSubmitting}
            onClick={downloadTemplateExcel}
            title="Unduh contoh template format Excel"
          >
            <Download size={14} />
            <span>Unduh Contoh Format</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-outline"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary-gradient"
              disabled={!previewData || parsing || isSubmitting}
              onClick={handleConfirmImport}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyimpan ke Cloud...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Terapkan & Simpan ke Cloud</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
