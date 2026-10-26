import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Monitor,
  ShieldCheck,
  CheckCircle2,
  Scan,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  BookOpen
} from 'lucide-react';

export default function GuideView() {
  const [activeSection, setActiveSection] = useState('A');

  const sections = [
    { id: 'A', title: 'A. Persiapan Data Excel', icon: FileSpreadsheet },
    { id: 'B', title: 'B. Penyiapan Halaman & Mode Offline', icon: Monitor },
    { id: 'C', title: 'C. Setup Admin Awal', icon: ShieldCheck },
    { id: 'D', title: 'D. Tes Sebelum Dipakai', icon: CheckCircle2 },
    { id: 'E', title: 'E. Pemasangan di Monitor Bengkel', icon: Monitor },
    { id: 'F', title: 'F. Pemakaian Rutin Operator', icon: Scan },
    { id: 'G', title: 'G. Pembaruan Rutin Admin', icon: RefreshCw },
    { id: 'H', title: 'H. Solusi Masalah Umum', icon: AlertTriangle }
  ];

  return (
    <div className="view-container">
      {/* View Header */}
      <div className="view-header-row">
        <div>
          <h2 className="view-title">Panduan Resmi Operasional & SOP Bengkel ISC</h2>
          <p className="view-subtitle">
            Standar operasional prosedur persiapan data SAP, scanner monitor, dan administrasi order
          </p>
        </div>
      </div>

      <div className="guide-view-layout">
        {/* Section List Left */}
        <div className="guide-nav-column">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                className={`guide-nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveSection(sec.id)}
              >
                <Icon size={16} />
                <span className="flex-1 text-left">{sec.title}</span>
                <ChevronRight size={14} className="opacity-40" />
              </button>
            );
          })}
        </div>

        {/* Section Detail Right */}
        <div className="guide-content-column">
          {activeSection === 'A' && (
            <div className="guide-card">
              <h3 className="guide-card-title">A. Persiapan Data (Ekspor SAP ke Excel)</h3>
              <ul className="help-bullet-list">
                <li><strong>Ekspor dari SAP ke Excel:</strong> Ambil nomor produksi, langkah, nomor konfirmasi, dan status.</li>
                <li><strong>Pembersihan baris:</strong> Satu baris = satu langkah dari satu order. Buang langkah yang tidak dipakai (contoh saat rapat: dari 26 langkah disederhanakan jadi 5 langkah utama).</li>
                <li><strong>Sheet Order:</strong> Buat sheet bernama persis <code className="font-mono">Order</code> dengan kolom:
                  <div className="code-snippet font-mono">NoProduksi, ProductGroup, Langkah, NamaLangkah, NoKonfirmasi, Status</div>
                </li>
                <li><strong>Langkah:</strong> Diisi angka urut berurutan (1, 2, 3, dan seterusnya).</li>
                <li><strong>Status:</strong> Diisi <code className="font-mono text-emerald-600 font-bold">Selesai</code> atau <code className="font-mono text-cyan-600 font-bold">Berjalan</code>. Isi apa pun selain "Selesai" dianggap belum selesai.</li>
                <li><strong>Format kolom nomor:</strong> Wajib diformat sebagai <strong className="text-main">Text</strong> di Excel supaya angka nol di depan (seperti 00123) tidak hilang.</li>
                <li><strong>Sheet Personel:</strong> Buat sheet bernama persis <code className="font-mono">Personel</code> dengan kolom:
                  <div className="code-snippet font-mono">NoPersonal, Nama, ProductGroup</div>
                  <em>Contoh: Dudi (2324, PKW), Renan Aldi (530617, PKW).</em>
                </li>
                <li><strong>Peringatan Ejaan:</strong> Huruf besar-kecil dan ejaan nama sheet dan kolom harus sama persis, jika tidak impor akan otomatis ditolak sistem.</li>
              </ul>
            </div>
          )}

          {activeSection === 'B' && (
            <div className="guide-card">
              <h3 className="guide-card-title">B. Penyiapan Halaman & Mode Offline</h3>
              <ul className="help-bullet-list">
                <li>Aplikasi ini dirancang untuk dapat diakses oleh PC bengkel melalui jaringan lokal (LAN) server ISC atau langsung dibuka di browser lokal.</li>
                <li><strong>Mode Offline Penuh:</strong> Pustaka pembaca Excel (SheetJS) dan pembuat barcode (JsBarcode) telah dibundel secara mandiri di dalam sistem. Aplikasi dapat berjalan 100% offline tanpa koneksi internet luar.</li>
                <li>Dapat ditempatkan di server lokal ISC bengkel atau di-deploy langsung pada Laragon lokal (<code>c:\laragon\www\Production-Order-ISC\</code>).</li>
              </ul>
            </div>
          )}

          {activeSection === 'C' && (
            <div className="guide-card">
              <h3 className="guide-card-title">C. Setup Admin (Sekali di Awal)</h3>
              <ol className="help-step-list">
                <li>Buka halaman aplikasi di browser.</li>
                <li>Klik tombol <strong className="text-cyan">Masuk Admin</strong> di sidebar bawah.</li>
                <li>Ketik kata sandi awal: <code className="font-mono font-bold text-main">isc-admin</code>, lalu klik <strong>Masuk</strong>.</li>
                <li>Ganti sandi: Klik menu <strong className="text-main">Ganti Sandi</strong> di sidebar, masukkan sandi baru (minimal 6 karakter), lalu simpan.</li>
                <li>Klik <strong className="text-main">Impor Excel SAP</strong>, pilih file Excel yang telah disiapkan di tahap A.</li>
                <li>Pastikan daftar order dan operator langsung muncul dengan benar di Terminal Scanner.</li>
              </ol>
            </div>
          )}

          {activeSection === 'D' && (
            <div className="guide-card">
              <h3 className="guide-card-title">D. Prosedur Tes Sebelum Dipakai</h3>
              <ul className="help-bullet-list">
                <li>Buka menu <strong>Terminal Scanner SAP</strong>.</li>
                <li>Pilih satu operator di Kolom 1, dan pilih satu order di Kolom 2.</li>
                <li>Pastikan hanya <strong>satu langkah</strong> yang berstatus <em>“Langkah aktif”</em>.</li>
                <li><strong>Scan dengan alat scanner bengkel ke kolom SAP:</strong>
                  <ol className="sub-step-list mt-1">
                    <li>Scan barcode No. Personal operator ke layar SAP.</li>
                    <li>Scan barcode No. Konfirmasi langkah aktif ke layar SAP.</li>
                  </ol>
                </li>
                <li>Pastikan data terbaca dengan baik di monitor bengkel bawah. Jika sulit terbaca karena jarak scanner, gunakan tombol <strong>Perbesar Layar (+)</strong> atau tombol perbesar barcode ke layar penuh.</li>
                <li>Klik <strong className="text-emerald-600 font-bold">Tandai Selesai</strong> pada langkah aktif dan pastikan langkah berikutnya otomatis berubah menjadi langkah aktif.</li>
                <li>Klik <strong className="text-cyan font-bold">Unduh Order (Excel)</strong> untuk memastikan file hasil status terbaru berhasil diekspor.</li>
              </ul>
            </div>
          )}

          {activeSection === 'E' && (
            <div className="guide-card">
              <h3 className="guide-card-title">E. Pemasangan di Monitor Bengkel</h3>
              <ul className="help-bullet-list">
                <li>Admin klik tombol <strong className="text-red-500 font-bold">Keluar Admin</strong> supaya halaman kembali ke mode pengguna (tombol impor dan tombol Tandai Selesai akan tersembunyi dari operator biasa).</li>
                <li>Simpan halaman aplikasi sebagai <strong>Bookmark</strong> atau <strong>Desktop Shortcut</strong> di PC bengkel.</li>
                <li><strong>Atur Layar (Dual-Monitor):</strong> Satu monitor untuk membuka SAP, dan satu monitor untuk membuka aplikasi Barcode ISC ini berdampingan.</li>
              </ul>
            </div>
          )}

          {activeSection === 'F' && (
            <div className="guide-card">
              <h3 className="guide-card-title">F. Pemakaian Rutin oleh Operator (Mode Pengguna)</h3>
              <ul className="help-bullet-list">
                <li>Ketik nama atau nomor personal Anda di kotak pencarian Kolom 1, lalu klik nama.</li>
                <li>Pilih nomor order produksi yang sedang dikerjakan di Kolom 2 (gunakan filter grup di header jika perlu).</li>
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

          {activeSection === 'G' && (
            <div className="guide-card">
              <h3 className="guide-card-title">G. Pembaruan Rutin oleh Admin</h3>
              <ul className="help-bullet-list">
                <li>Masuk sebagai admin menggunakan sandi Anda.</li>
                <li>Impor file ekspor SAP terbaru secara berkala supaya status ikut diperbarui secara massal.</li>
                <li>Klik <strong className="text-cyan font-bold">Unduh Order</strong> untuk cadangan (backup), kemudian klik <strong>Keluar</strong>.</li>
                <li>Untuk penambahan operator baru, cukup tambahkan barisnya di sheet <code>Personel</code> pada file Excel, lalu impor ulang.</li>
              </ul>
            </div>
          )}

          {activeSection === 'H' && (
            <div className="guide-card">
              <h3 className="guide-card-title">H. Solusi Masalah Umum</h3>
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
                <div className="faq-a">Buka form Masuk Admin, klik <em>"Lupa sandi?"</em> dan pilih tombol <strong>"Reset Sandi ke isc-admin"</strong> untuk mengembalikannya ke sandi awal bawaan.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
