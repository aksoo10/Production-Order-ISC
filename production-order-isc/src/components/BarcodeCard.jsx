import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Maximize2, Copy, Check, Scan, Plus, Minus } from 'lucide-react';

export default function BarcodeCard({
  value,
  label = "BARCODE",
  subtitle = "",
  format = "CODE128",
  height = 68,
  width = 2.2,
  fontSize = 17,
  showBadge = true,
  badgeText = "Scan ke SAP",
  highlightColor = "#00A3E0",
  compact = false
}) {
  const svgRef = useRef(null);
  const modalSvgRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalScale, setModalScale] = useState(1);

  // Render main barcode
  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, String(value), {
          format,
          width: compact ? 1.8 : width,
          height: compact ? 48 : height,
          displayValue: true,
          font: 'JetBrains Mono, monospace',
          fontSize: compact ? 14 : fontSize,
          textMargin: 6,
          background: '#FFFFFF',
          lineColor: '#000000',
          margin: 10
        });
      } catch (err) {
        console.error("Barcode render error:", err);
      }
    }
  }, [value, format, height, width, fontSize, compact]);

  // Render modal barcode when enlarged
  useEffect(() => {
    if (isModalOpen && modalSvgRef.current && value) {
      try {
        JsBarcode(modalSvgRef.current, String(value), {
          format,
          width: 3.2 * modalScale,
          height: 120 * modalScale,
          displayValue: true,
          font: 'JetBrains Mono, monospace',
          fontSize: 24 * modalScale,
          textMargin: 10,
          background: '#FFFFFF',
          lineColor: '#000000',
          margin: 18
        });
      } catch (err) {
        console.error("Modal barcode render error:", err);
      }
    }
  }, [isModalOpen, value, format, modalScale]);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (value) {
      navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!value) {
    return (
      <div className="barcode-empty-box">
        <Scan size={24} className="text-muted" />
        <span>Pilih item untuk menampilkan barcode</span>
      </div>
    );
  }

  return (
    <>
      <div className="barcode-card-container">
        {/* Card Header */}
        <div className="barcode-card-header">
          <div className="barcode-label-group">
            <span className="barcode-title">{label}</span>
            {subtitle && <span className="barcode-subtitle">{subtitle}</span>}
          </div>

          <div className="barcode-actions-group">
            {showBadge && (
              <span className="barcode-scan-badge" style={{ borderColor: highlightColor, color: highlightColor }}>
                <Scan size={13} className="pulse-icon" />
                {badgeText}
              </span>
            )}

            <button
              type="button"
              className="barcode-btn-icon"
              title="Salin nomor"
              onClick={handleCopy}
            >
              {copied ? <Check size={15} color="#10B981" /> : <Copy size={15} />}
            </button>

            <button
              type="button"
              className="barcode-btn-icon"
              title="Perbesar barcode ke layar penuh"
              onClick={() => setIsModalOpen(true)}
            >
              <Maximize2 size={15} />
            </button>
          </div>
        </div>

        {/* Barcode SVG Container (Pure White for flawless scanner recognition) */}
        <div
          className="barcode-svg-wrapper"
          onClick={() => setIsModalOpen(true)}
          title="Klik untuk memperbesar tampilan barcode"
        >
          <svg ref={svgRef} className="barcode-svg"></svg>
        </div>

        {/* Footer / Helper Text */}
        <div className="barcode-card-footer">
          <span className="barcode-hint-text">
            Arahkan scanner ke barcode di atas (Format: Code 128)
          </span>
          <span className="barcode-val-badge font-mono">{value}</span>
        </div>
      </div>

      {/* Fullscreen Enlarged Barcode Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content barcode-modal-zoom" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title font-heading">{label} — Mode Scan Penuh</h3>
                <p className="modal-desc">{subtitle || 'Barcode resolusi tinggi untuk pembacaan scanner jarak jauh'}</p>
              </div>
              <div className="modal-actions-right">
                <div className="zoom-btn-group">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setModalScale(prev => Math.max(0.8, prev - 0.2))}
                    title="Perkecil (-)"
                  >
                    <Minus size={16} strokeWidth={2.2} />
                  </button>
                  <span className="zoom-indicator font-mono">{Math.round(modalScale * 100)}%</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setModalScale(prev => Math.min(1.8, prev + 0.2))}
                    title="Perbesar (+)"
                  >
                    <Plus size={16} strokeWidth={2.2} />
                  </button>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="barcode-enlarged-stage">
              <div className="barcode-enlarged-card">
                <svg ref={modalSvgRef} className="barcode-svg-enlarged"></svg>
              </div>
              <div className="enlarged-instructions">
                <Scan size={22} color="#00A3E0" className="pulse-icon" />
                <span>Langsung arahkan laser scanner ke monitor ini. Data akan otomatis masuk ke SAP.</span>
              </div>
            </div>

            <div className="modal-footer justify-between">
              <div className="font-mono text-sm text-muted">
                Nilai Barcode: <strong className="text-white">{value}</strong>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleCopy}
                >
                  {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
                  {copied ? "Tersalin!" : "Salin Teks"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Tutup Tampilan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
