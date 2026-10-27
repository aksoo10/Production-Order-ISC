import React, { useState } from 'react';
import {
  HelpCircle,
  FileSpreadsheet,
  Monitor,
  ShieldCheck,
  CheckCircle2,
  Scan,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function HelpModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('A');

  if (!isOpen) return null;

  const tabs = [
    { id: 'A', title: 'A. Persiapan Data Excel', icon: FileSpreadsheet },
    { id: 'B', title: 'B. Siapkan Halaman / Server', icon: Monitor },
    { id: 'C', title: 'C. Setup Admin Awal', icon: ShieldCheck },
    { id: 'D', title: 'D. Tes Sebelum Dipakai', icon: CheckCircle2 },
    { id: 'E', title: 'E. Pasang di Bengkel', icon: Monitor },
    { id: 'F', title: 'F. Pemakaian Operator', icon: Scan },
    { id: 'G', title: 'G. Pembaruan Rutin Admin', icon: RefreshCw },
    { id: 'H', title: 'H. Solusi Masalah Umum', icon: AlertTriangle }
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content help-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="auth-icon-badge">
              <HelpCircle size={20} color="#00A3E0" />
            </div>
            <div>
              <h3 className="modal-title font-heading">Panduan Resmi Operasional ISC</h3>
              <p className="modal-desc">Petunjuk persiapan SAP, pemakaian scanner, dan administrasi order</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Modal Layout: Tabs Left, Content Right */}
        <div className="help-modal-body">
          <div className="help-tabs-sidebar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`help-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={16} />
                  <span>{tab.title}</span>
                  <ChevronRight size={14} className="ml-auto opacity-40" />
                </button>
              );
            })}
          </div>

          <div className="help-content-area">
            {activeTab === 'A' && (
              <div className="help-section-card">
                <h4 className="help-section-title">A. Persiapan Data (Ekspor SAP ke Excel)</h4>
                <ul className="help-bullet-list">
                  <li><strong>Ekspor dari SAP ke Excel:</strong> Ambil nomor produksi, langkah, nomor konfirmasi, dan status.</li>
                  <li><strong>Pembersihan baris:</strong> Satu baris = satu langkah dari satu order. Buang langkah yang tidak dipakai (contoh saat rapat: dari 26 langkah disederhanakan jadi 5 langkah utama).</li>
                  <li><strong>Sheet Order:</strong> Buat sheet bernama persis <code className="font-mono">Order</code> dengan kolom:
                    <div className="code-snippet font-mono">NoProduksi, ProductGroup, Langkah, NamaLangkah, NoKonfirmasi, Status</div>
                  </li>
                  <li><strong>Langkah:</strong> Diisi angka urut berurutan (1, 2, 3, dan seterusnya).</li>
                  <li><strong>Status:</strong> Diisi <code className="font-mono text-emerald-400">Selesai</code> atau <code className="font-mono text-cyan-400">Berjalan</code>. Isi apa pun selain "Selesai" dianggap belum selesai.</li>
                  <li><strong>Format kolom nomor:</strong> Wajib diformat sebagai <strong className="text-white">Text</strong> di Excel supaya angka nol di depan (seperti 00123) tidak hilang.</li>
                  <li><strong>Sheet Personel:</strong> Buat sheet bernama persis <code className="font-mono">Personel</code> dengan kolom:
                    <div className="code-snippet font-mono">NoPersonal, Nama, ProductGroup</div>
                    <em>Contoh: NoPersonal (1001, PKW), NoPersonal (1002, PULP).</em>
                  </li>
                  <li><strong>Perhatian:</strong> Huruf besar-kecil dan ejaan nama sheet dan kolom harus sama persis, jika tidak impor akan otomatis ditolak sistem.</li>
                </ul>
              </div>
            )}

            {activeTab === 'B' && (
              <div className="help-section-card">
                <h4 className="help-section-title">B. Penyiapan Halaman & Mode Offline</h4>
                <ul className="help-bullet-list">
                  <li>Aplikasi ini dirancang untuk dapat diakses oleh PC bengkel melalui jaringan lokal (LAN) server ISC atau langsung dibuka di browser lokal.</li>
                  <li><strong>Mode Offline Penuh:</strong> Pustaka pembaca Excel (SheetJS) dan pembuat barcode (JsBarcode) telah dibundel secara mandiri di dalam sistem. Aplikasi dapat berjalan 100% offline tanpa koneksi internet luar.</li>
                  <li>Dapat ditempatkan di server lokal ISC bengkel atau di-deploy langsung pada Laragon lokal.</li>
                </ul>
              </div>
            )}

            {activeTab === 'C' && (
              <div className="help-section-card">
                <h4 className="help-section-title">C. Setup Admin (Sekali di Awal)</h4>
                <ol className="help-step-list">
                  <li>Buka halaman aplikasi di browser.</li>
                  <li>Klik tombol <strong className="text-cyan">Masuk admin</strong> di pojok kanan atas.</li>
                  <li>Ketik kata sandi awal: <code className="font-mono font-bold text-white">isc-admin</code>, lalu klik <strong className="text-cyan">Masuk</strong>.</li>
                  <li>Ganti sandi: Klik tombol <strong className="text-white">Ganti Sandi</strong>, masukkan sandi baru (minimal 6 karakter), lalu klik Ganti sandi.</li>
                  <li>Klik <strong className="text-white">Impor Excel</strong>, pilih file Excel yang telah disiapkan di tahap A.</li>
                  <li>Pastikan daftar order dan operator langsung muncul dengan benar di Kolom 1 dan Kolom 2.</li>
                </ol>
              </div>
            )}

            {activeTab === 'D' && (
              <div className="help-section-card">
                <h4 className="help-section-title">D. Prosedur Tes Sebelum Dipakai</h4>
                <ul className="help-bullet-list">
                  <li>Pilih satu operator di Kolom 1, pilih satu order di Kolom 2.</li>
                  <li>Pastikan hanya <strong>satu langkah</strong> yang berstatus <em>“Langkah aktif”</em>.</li>
                  <li><strong>Scan dengan alat scanner bengkel ke kolom SAP:</strong>
                    <ol className="sub-step-list mt-1">
                      <li>Scan barcode No. Personal operator ke SAP.</li>
                      <li>Scan barcode No. Konfirmasi langkah aktif ke SAP.</li>
                    </ol>
                  </li>
                  <li>Pastikan data terbaca dengan baik di monitor bengkel bawah. Jika sulit terbaca karena jarak scanner, gunakan tombol <strong>Perbesar Layar (+)</strong> atau tekan <code>Ctrl +</code> pada keyboard browser.</li>
                  <li>Klik <strong className="text-emerald-400">Tandai Selesai</strong> pada langkah aktif dan pastikan langkah berikutnya otomatis berubah menjadi langkah aktif.</li>
                  <li>Klik <strong className="text-cyan">Unduh Order (Excel)</strong> untuk memastikan file hasil status terbaru berhasil diekspor.</li>
                </ul>
              </div>
            )}

            {activeTab === 'E' && (
              <div className="help-section-card">
                <h4 className="help-section-title">E. Pemasangan di Monitor Bengkel</h4>
                <ul className="help-bullet-list">
                  <li>Admin klik tombol <strong className="text-danger">Keluar</strong> supaya halaman kembali ke mode pengguna (tombol impor dan tombol Tandai Selesai akan tersembunyi dari operator biasa).</li>
                  <li>Simpan halaman aplikasi sebagai <strong>Bookmark</strong> atau <strong>Desktop Shortcut</strong> di PC bengkel.</li>
                  <li><strong>Atur Layar (Dual-Monitor):</strong> Satu monitor untuk membuka SAP, dan satu monitor untuk membuka aplikasi Barcode ISC ini.</li>
                </ul>
              </div>
            )}

            {activeTab === 'F' && (
              <div className="help-section-card">
                <h4 className="help-section-title">F. Pemakaian Rutin oleh Operator (Mode Pengguna)</h4>
                <ul className="help-bullet-list">
                  <li>Ketik nama atau nomor personal Anda di kotak pencarian Kolom 1, lalu klik nama.</li>
                  <li>Pilih nomor order produksi yang sedang dikerjakan di Kolom 2 (gunakan filter grup di atas jika perlu).</li>
                  <li>Arahkan scanner ke layar:
                    <ul className="mt-1">
                      <li>Scan barcode <strong>No. Personal</strong> ke SAP.</li>
                      <li>Scan barcode <strong>No. Konfirmasi</strong> langkah aktif ke SAP.</li>
                    </ul>
                  </li>
                  <li>Operator hanya melihat dan scan. Status langkah akan diperbarui saat supervisor/admin menandainya selesai atau mengimpor update SAP.</li>
                </ul>
              </div>
            )}

            {activeTab === 'G' && (
              <div className="help-section-card">
                <h4 className="help-section-title">G. Pembaruan Rutin oleh Admin</h4>
                <ul className="help-bullet-list">
                  <li>Masuk sebagai admin menggunakan sandi Anda.</li>
                  <li>Impor file ekspor SAP terbaru secara berkala supaya status ikut diperbarui secara massal.</li>
                  <li>Klik <strong className="text-cyan">Unduh Order</strong> untuk cadangan (backup), kemudian klik <strong className="text-danger">Keluar</strong>.</li>
                  <li>Untuk penambahan operator baru, cukup tambahkan barisnya di sheet <code>Personel</code> pada file Excel, lalu impor ulang.</li>
                </ul>
              </div>
            )}

            {activeTab === 'H' && (
              <div className="help-section-card">
                <h4 className="help-section-title">H. Solusi Masalah Umum</h4>
                <div className="faq-item">
                  <div className="faq-q">Pesan: "File harus punya sheet Personel dan Order..."</div>
                  <div className="faq-a">Nama sheet di Excel salah. Pastikan ejaan dan huruf kapital sama persis: <code>Personel</code> dan <code>Order</code>.</div>
                </div>
                <div className="faq-item">
                  <div className="faq-q">Nama atau order tidak muncul di daftar</div>
                  <div className="faq-a">Filter grup di bagian atas header sedang membatasi tampilan. Ubah pilihan dropdown ke <strong>"Semua grup"</strong>.</div>
                </div>
                <div className="faq-item">
                  <div className="faq-q">Data hilang atau tidak sama di PC bengkel lain</div>
                  <div className="faq-a">Data tersimpan di penyimpanan browser lokal (localStorage). Lakukan impor Excel di browser PC bengkel yang digunakan oleh operator.</div>
                </div>
                <div className="faq-item">
                  <div className="faq-q">Lupa kata sandi admin</div>
                  <div className="faq-a">Buka modal Masuk Admin, klik <em>"Lupa sandi?"</em> dan pilih tombol <strong>"Reset Sandi ke isc-admin"</strong> untuk mengembalikannya ke sandi awal bawaan.</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
}
