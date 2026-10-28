import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Download,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { parseExcelFile, downloadTemplateExcel } from '../utils/excelHelper';

export default function ExcelImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  currentPersonnel = [],
  existingOrders = [],
  isAdmin = false
}) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [duplicateMode, setDuplicateMode] = useState('update'); // 'update' | 'skip'
  const fileInputRef = useRef(null);

  // Security Gate: strictly forbid non-admin access
  if (!isOpen || !isAdmin) return null;

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
    // 1. Validate File Format & Extension
    const fileName = fileObj.name || '';
    const ext = fileName.split('.').pop()?.toLowerCase();

    if (!ext || !['xlsx', 'xls'].includes(ext)) {
      setErrorMsg('Format file tidak didukung. Harap pilih atau unggah file dokumen Excel berekstensi .xlsx atau .xls.');
      setFile(null);
      setPreviewData(null);
      return;
    }

    if (fileObj.size === 0) {
      setErrorMsg('File Excel yang dipilih kosong (0 bytes). Harap pilih file yang berisi data order.');
      setFile(null);
      setPreviewData(null);
      return;
    }

    if (fileObj.size > 25 * 1024 * 1024) {
      setErrorMsg('Ukuran file terlalu besar (maksimal 25 MB). Harap pilih file dengan ukuran lebih kecil.');
      setFile(null);
      setPreviewData(null);
      return;
    }

    setFile(fileObj);
    setErrorMsg('');
    setPreviewData(null);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const result = parseExcelFile(buffer, currentPersonnel);

        if (!result.success) {
          setErrorMsg(result.error || 'Gagal memproses susunan kolom file Excel.');
          return;
        }

        if (!result.orders || result.orders.length === 0) {
          setErrorMsg('Tidak ditemukan baris data order yang valid di dalam file Excel ini.');
          return;
        }

        // 2. Duplicate Detection against Existing Orders in System/Database
        const existingNoMap = new Map();
        existingOrders.forEach((o) => {
          const num = String(o.NoProduksi || o.orderNo || '').trim().toLowerCase();
          if (num) {
            existingNoMap.set(num, o);
          }
        });

        // Set of order numbers in the imported file
        const fileOrderNos = new Set();
        result.orders.forEach((o) => {
          const num = String(o.NoProduksi || '').trim();
          if (num) fileOrderNos.add(num);
        });

        let duplicateOrderCount = 0;
        let newOrderCount = 0;
        fileOrderNos.forEach((no) => {
          if (existingNoMap.has(no.toLowerCase())) {
            duplicateOrderCount++;
          } else {
            newOrderCount++;
          }
        });

        // Tag each order step with duplicate flag
        const taggedOrders = result.orders.map((o) => {
          const isDup = existingNoMap.has(String(o.NoProduksi || '').trim().toLowerCase());
          return {
            ...o,
            isDuplicate: isDup
          };
        });

        setPreviewData({
          orders: taggedOrders,
          personnel: result.personnel || currentPersonnel,
          totalSteps: taggedOrders.length,
          uniqueOrders: fileOrderNos.size,
          duplicateOrderCount,
          newOrderCount,
          totalPersonnel: (result.personnel || currentPersonnel).length,
          sourceSheet: result.sourceSheet,
          personnelSheetFound: result.personnelSheetFound
        });
      } catch (err) {
        setErrorMsg(`Gagal memproses file Excel: ${err.message || 'Terjadi kesalahan sistem saat membaca berkas'}`);
      } finally {
        setParsing(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Gagal membaca file dari penyimpanan komputer.');
      setParsing(false);
    };

    reader.readAsArrayBuffer(fileObj);
  };

  const handleConfirmImport = async () => {
    if (!previewData || isSubmitting) return;

    // Filter orders according to duplicateMode
    let ordersToProcess = previewData.orders;
    if (duplicateMode === 'skip') {
      ordersToProcess = previewData.orders.filter((o) => !o.isDuplicate);
      if (ordersToProcess.length === 0) {
        setErrorMsg('Tidak ada order baru untuk diimpor. Seluruh order dalam file sudah ada di database dan opsi "Lewati Duplikat" aktif.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await onImportSuccess(ordersToProcess, previewData.personnel, {
        duplicateMode,
        duplicateCount: previewData.duplicateOrderCount,
        newCount: previewData.newOrderCount
      });
      // Reset state and close modal
      setFile(null);
      setPreviewData(null);
      onClose();
    } catch (err) {
      setErrorMsg(`Gagal menyimpan ke database cloud: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    if (isSubmitting) return;
    setFile(null);
    setPreviewData(null);
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleModalClose}>
      <div className="modal-content import-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header with Admin Badge */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="auth-icon-badge">
              <Upload size={20} color="#00A3E0" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="modal-title font-heading">Impor Data Excel SAP</h3>
                <span className="badge badge-admin-role flex items-center gap-1 text-xs">
                  <ShieldCheck size={12} />
                  Khusus Admin
                </span>
              </div>
              <p className="modal-desc">
                Unggah file Excel (.xlsx / .xls) untuk mengimpor dan memperbarui data order bengkel ke database SharePoint
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            disabled={isSubmitting}
            onClick={handleModalClose}
            title="Tutup modal"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body flex flex-col gap-4">
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

            <FileSpreadsheet size={36} className="dropzone-icon" />
            <div className="dropzone-text">
              {file ? (
                <>
                  <div className="file-name-highlight font-mono">{file.name}</div>
                  <div className="file-size-text text-muted">
                    {(file.size / 1024).toFixed(1)} KB — Klik untuk mengganti file
                  </div>
                </>
              ) : (
                <>
                  <div className="dropzone-title">Klik atau Seret Berkas Excel (.xlsx / .xls) ke Sini</div>
                  <div className="dropzone-sub">Mendukung file ekspor SAP dan template standar ISC bengkel</div>
                </>
              )}
            </div>
          </div>

          {/* Parsing Spinner */}
          {parsing && (
            <div className="flex items-center justify-center gap-2 p-3 text-cyan">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-xs font-semibold">Sedang memeriksa dan memvalidasi struktur file Excel...</span>
            </div>
          )}

          {/* Error Message */}
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
                  File Siap Diimpor (Sheet: "{previewData.sourceSheet}")
                </span>
              </div>

              {/* 4 KPI Metrics Grid */}
              <div className="preview-metrics-grid preview-metrics-4">
                <div className="preview-metric-card">
                  <div className="metric-val text-cyan font-mono">{previewData.uniqueOrders}</div>
                  <div className="metric-lbl">Total Order File</div>
                </div>
                <div className="preview-metric-card">
                  <div className="metric-val font-mono" style={{ color: '#059669' }}>
                    {previewData.newOrderCount}
                  </div>
                  <div className="metric-lbl">Order Baru</div>
                </div>
                <div className="preview-metric-card">
                  <div className="metric-val font-mono" style={{ color: previewData.duplicateOrderCount > 0 ? '#D97706' : 'var(--text-muted)' }}>
                    {previewData.duplicateOrderCount}
                  </div>
                  <div className="metric-lbl">Order Duplikat / Ada</div>
                </div>
                <div className="preview-metric-card">
                  <div className="metric-val text-cyan font-mono">{previewData.totalSteps}</div>
                  <div className="metric-lbl">Total Langkah</div>
                </div>
              </div>

              {/* Duplicate Handling Strategy Selector */}
              {previewData.duplicateOrderCount > 0 && (
                <div className="duplicate-resolution-card">
                  <div className="duplicate-card-title flex items-center gap-1.5 text-xs font-bold">
                    <AlertTriangle size={15} color="#D97706" />
                    <span>Pengecekan Data: Ditemukan {previewData.duplicateOrderCount} order yang sudah ada di database</span>
                  </div>
                  <div className="duplicate-options-row">
                    <label className={`duplicate-radio-label ${duplicateMode === 'update' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="duplicateMode"
                        value="update"
                        checked={duplicateMode === 'update'}
                        onChange={() => setDuplicateMode('update')}
                      />
                      <div className="radio-text-box">
                        <span className="font-semibold text-xs">Perbarui data yang sudah ada (Update Existing)</span>
                        <span className="text-muted text-xs block">Data order di database akan disinkronkan & diperbarui dengan data baru dari file Excel</span>
                      </div>
                    </label>

                    <label className={`duplicate-radio-label ${duplicateMode === 'skip' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="duplicateMode"
                        value="skip"
                        checked={duplicateMode === 'skip'}
                        onChange={() => setDuplicateMode('skip')}
                      />
                      <div className="radio-text-box">
                        <span className="font-semibold text-xs">Lewati order duplikat (Skip Duplicates)</span>
                        <span className="text-muted text-xs block">Hanya {previewData.newOrderCount} order baru yang diimpor; data lama di database tetap dipertahankan</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Sample preview table of first 5 parsed rows with duplicate badges */}
              {previewData.orders && previewData.orders.length > 0 && (
                <div className="preview-sample-table-wrap">
                  <table className="guide-sample-table">
                    <thead>
                      <tr>
                        <th>NoProduksi</th>
                        <th>Status Data</th>
                        <th>Langkah</th>
                        <th>NamaLangkah</th>
                        <th>NoKonfirmasi</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.orders.slice(0, 5).map((o, idx) => (
                        <tr key={idx}>
                          <td className="font-mono font-bold">{o.NoProduksi}</td>
                          <td>
                            {o.isDuplicate ? (
                              <span className="badge badge-amber text-xs font-semibold">
                                Duplikat {duplicateMode === 'skip' ? '(Dilewati)' : '(Diperbarui)'}
                              </span>
                            ) : (
                              <span className="badge badge-emerald text-xs font-semibold">
                                Baru
                              </span>
                            )}
                          </td>
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
            <div className="alert-box alert-info flex items-center gap-3 mt-2">
              <Loader2 size={20} className="animate-spin text-cyan flex-shrink-0" />
              <div className="alert-content">
                <strong>Menyimpan dan Mengimpor ke Database Cloud...</strong>
                <div className="text-xs">
                  Sedang mengirim data order ke SharePoint via Power Automate dan memperbarui tabel secara otomatis. Mohon jangan menutup halaman.
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
              onClick={handleModalClose}
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
                  <span>Mengimpor ke Cloud...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>
                    {duplicateMode === 'skip' && previewData?.duplicateOrderCount > 0
                      ? `Impor ${previewData.newOrderCount} Order Baru`
                      : 'Terapkan & Simpan ke Cloud'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
