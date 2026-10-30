# Panduan Integrasi Embed SharePoint & Microsoft 365
### ANDRITZ ISC — Production Order & SAP Confirmation Barcode System

Dokumentasi ini menjelaskan konfigurasi teknis dan panduan langkah demi langkah untuk menyematkan (embed) aplikasi **Production Order ISC** ke dalam **Microsoft SharePoint Modern Pages** atau **Microsoft Teams**.

---

## 1. Fitur Dukungan SharePoint yang Telah Diterapkan

Aplikasi ini telah dikonfigurasi secara lengkap untuk berjalan mulus di dalam iframe SharePoint:

1. **Header Keamanan CSP `frame-ancestors`**:
   - Menggantikan batasan `X-Frame-Options: SAMEORIGIN` / `DENY` dengan `Content-Security-Policy: frame-ancestors` yang mengizinkan domain Microsoft SharePoint, Office 365, dan Microsoft Teams:
     `frame-ancestors 'self' https://*.sharepoint.com https://*.office.com https://*.office365.com https://*.microsoft.com https://teams.microsoft.com;`
   - Dikonfigurasi di:
     - Apache / Laragon (`.htaccess`)
     - Vercel Deployment (`vercel.json`)
     - PHP API Gateway (`api/orders.php`)
     - Vercel Serverless / Node Gateway (`api/orders.js`)
     - Vite Local Dev Server (`vite.config.js`)

2. **Deteksi Otomatis Lingkungan Iframe**:
   - Mendeteksi apakah aplikasi dibuka di dalam iframe SharePoint (`window.self !== window.top` atau parameter `?embed=true`).
   - Menerapkan class CSS `.is-embedded` dan `.embedded-mode` secara otomatis.

3. **Tombol "Layar Penuh" / Pop-out Tab**:
   - Tersedia tombol cepat **Layar Penuh** di Navbar dan di layar login saat dalam mode iframe.
   - Memungkinkan operator atau manajer membuka aplikasi di tab browser mandiri tanpa keluar dari sesi kerja.

4. **Komunikasi `postMessage` Auto-Resize**:
   - Mengirim event pesan tinggi konten (`set-iframe-height`) ke jendela induk SharePoint saat tampilan atau data berubah, meminimalkan kemungkinan terpotong vertikal.

5. **Dukungan Parameter URL (Deep Linking SharePoint)**:
   - Halaman SharePoint dapat mengarahkan tampilan awal secara spesifik dengan query parameter:
     - `?embed=true` : Memaksa mode embed aktif.
     - `?tab=scanner` : Membuka tab SAP Scanner Terminal.
     - `?tab=orders` : Membuka daftar Production Order List.
     - `?tab=tracker` : Membuka Progress Tracker.
     - `?tab=dashboard` : Membuka Analisis Grafik Dashboard (khusus Admin).
     - `?group=PKW` / `?group=PU` : Memfilter otomatis Product Group tertentu.
     - `?sidebar=collapsed` : Memulai aplikasi dengan sidebar terlipat (sangat cocok untuk kolom SharePoint sempit).
     - `?compact=true` : Meminimalkan padding header untuk menghemat ruang vertikal.

---

## 2. Langkah Demi Langkah Pemasangan di SharePoint

### Langkah A: Whitelist Domain di SharePoint (HTML Field Security)
> **PENTING**: Jika domain aplikasi Anda belum didaftarkan di SharePoint Site Collection, SharePoint akan menampilkan pesan peringatan: *"Embedding content from this website isn't allowed, but your admin can change this."*

1. Buka situs SharePoint Anda (sebagai Site Owner / Administrator).
2. Klik ikon roda gigi **Settings** (Pengaturan) di kanan atas, pilih **Site information** -> **View all site settings** (atau buka URL: `https://[tenant].sharepoint.com/sites/[site]/_layouts/15/settings.aspx`).
3. Pada bagian **Site Collection Administration**, klik **HTML Field Security** (`/_layouts/15/HtmlFieldSecurity.aspx`).
4. Pilih opsi:
   - **Allow contributors to insert iframes from any domain** (jika diizinkan kebijakan IT Anda), ATAU
   - Masukkan domain aplikasi Anda ke daftar domain yang diizinkan (misal: `andritz-isc.vercel.app` atau nama domain hosting intranet Anda) lalu klik **Add**.
5. Klik **OK** untuk menyimpan perubahan.

---

### Langkah B: Menambahkan Embed Web Part di Halaman SharePoint

1. Buka halaman SharePoint tempat Anda ingin memasang sistem (misal: Halaman Workshop / Dashboard Produksi).
2. Klik tombol **Edit** di pojok kanan atas halaman SharePoint.
3. Arahkan kursor ke area kolom tempat Anda ingin meletakkan aplikasi, lalu klik ikon tambah **(+)** untuk menambahkan web part baru.
4. Ketik **Embed** (atau **Sematkan**) pada kolom pencarian web part, lalu pilih web part **Embed**.
5. Di panel pengaturan web part sebelah kanan (Website address or embed code), tempelkan kode iframe di bawah ini:

```html
<iframe 
  src="https://DOMAIN-ANDA-DISINI/?embed=true" 
  width="100%" 
  height="820px" 
  frameborder="0" 
  allowfullscreen="true" 
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals"
  title="ANDRITZ ISC Production Order Barcode Tracking System">
</iframe>
```

> **Ganti `https://DOMAIN-ANDA-DISINI/`** dengan URL tempat aplikasi Anda dihosting (misal: URL Vercel atau URL server internal ANDRITZ).

6. Atur ukuran tinggi iframe (misal: `820px` atau `900px`) sesuai kebutuhan layout halaman SharePoint.
7. Klik **Republish** (Terbitkan Ulang) di pojok kanan atas.

---

## 3. Contoh Variasi Kode Iframe Sesuai Kebutuhan Halaman

### 1. Kiosk Operator / Terminal Barcode Scanner
Cocok diletakkan di halaman portal workshop operator:
```html
<iframe 
  src="https://DOMAIN-ANDA-DISINI/?embed=true&tab=scanner&sidebar=collapsed" 
  width="100%" 
  height="780px" 
  frameborder="0" 
  allowfullscreen="true" 
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals">
</iframe>
```

### 2. Monitoring Khusus Divisi PKW (Wood Processing Services)
Menampilkan langsung tab Progress Tracker dengan filter grup PKW:
```html
<iframe 
  src="https://DOMAIN-ANDA-DISINI/?embed=true&tab=tracker&group=PKW" 
  width="100%" 
  height="820px" 
  frameborder="0" 
  allowfullscreen="true" 
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals">
</iframe>
```

### 3. Monitoring Khusus Divisi PU (Pulp & Paper Unit)
Menampilkan langsung daftar order dengan filter grup PU:
```html
<iframe 
  src="https://DOMAIN-ANDA-DISINI/?embed=true&tab=orders&group=PU" 
  width="100%" 
  height="820px" 
  frameborder="0" 
  allowfullscreen="true" 
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals">
</iframe>
```

### 4. Dashboard Analisis Grafik untuk Ruang Meeting / Manajemen
Hanya menampilkan grafik dan statistik performa produksi:
```html
<iframe 
  src="https://DOMAIN-ANDA-DISINI/?embed=true&tab=dashboard" 
  width="100%" 
  height="850px" 
  frameborder="0" 
  allowfullscreen="true" 
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals">
</iframe>
```

---

## 4. Panduan Atribut Sandbox Iframe

Pastikan atribut `sandbox` pada tag `<iframe>` selalu menyertakan izin berikut:

| Atribut Sandbox | Fungsi & Alasan Diperlukan |
| :--- | :--- |
| `allow-scripts` | Wajib untuk menjalankan JavaScript & framework React. |
| `allow-same-origin` | Wajib agar sessionStorage/localStorage dan fetch API berjalan normal. |
| `allow-forms` | Wajib untuk pengisian form login, input order, dan formulir langkah. |
| `allow-popups` | Mengizinkan fitur pembukaan tab baru saat operator klik tombol "Layar Penuh". |
| `allow-downloads` | Wajib agar fitur **Unduh Order (.xlsx)** dan **Unduh Template** Excel dapat tersimpan ke komputer. |
| `allow-modals` | Wajib untuk tampilan pop-up modal input order, ubah password, dan alert. |

---

## 5. Troubleshooting & FAQ

#### Q1: SharePoint menampilkan "Embedding content from this website isn't allowed"?
- **Penyebab**: Domain aplikasi belum didaftarkan di pengaturan keamanan SharePoint.
- **Solusi**: Ikuti **Langkah A** di atas (HTML Field Security) dan tambahkan domain hosting aplikasi Anda.

#### Q2: Muncul pesan "Refused to display ... in a frame because it set 'X-Frame-Options' to 'sameorigin'"?
- **Penyebab**: Web server hosting Anda masih mengirim header `X-Frame-Options: SAMEORIGIN`.
- **Solusi**: File `.htaccess` (Apache/Laragon) dan `vercel.json` (Vercel) pada proyek ini sudah secara otomatis menghapus header tersebut dan menerapkan CSP `frame-ancestors`. Pastikan file konfigurasi tersebut terunggah di hosting Anda.

#### Q3: Tombol "Unduh Order" (Export Excel) tidak mendownload file saat di dalam SharePoint?
- **Penyebab**: Iframe SharePoint tidak memiliki atribut `allow-downloads`.
- **Solusi**: Pastikan atribut `sandbox="... allow-downloads ..."` disertakan di tag `<iframe>`.

#### Q4: Apakah sesi login tersimpan saat halaman SharePoint di-refresh?
- **Penyebab**: Sesi login menggunakan `sessionStorage` per-tab. Selama tab browser SharePoint tidak ditutup, sesi akan tetap aktif saat berpindah navigasi di dalam aplikasi. Jika pengguna menutup tab atau mengklik "Logout", sesi akan berakhir secara aman.

## 6. Sumber Data Bersama dan Status Langkah

Data order dan setiap langkah harus menjadi baris SharePoint yang berbeda. Agar status hasil scan benar-benar sama di semua perangkat:

1. Tambahkan kolom SharePoint `StepNo` (Number) dan `StepName` (Single line of text) pada list order.
2. Perbarui schema trigger HTTP serta aksi **Create item** dan **Update item** pada flow Power Automate agar menerima dan menyimpan `stepNo`, `stepName`, dan `status`.
3. Perbarui flow GET agar mengembalikan tiap baris berikut `ID`, `StepNo`, `StepName`, dan `field_12` (status: `1` selesai, `0` berjalan). API juga membaca alias `stepNo`/`stepName`.
4. Migrasikan data lama: buat satu baris SharePoint untuk tiap langkah dengan StepNo, StepName, dan status yang benar. Langkah yang sebelumnya dibuat oleh konfigurasi lokal tidak otomatis ada di SharePoint.
5. Publikasikan flow sebelum deploy frontend. Create, edit, scan/status barcode, reset, delete, dan import sekarang menunggu respons server; jika Flow menolak/timeout, aplikasi menampilkan error dan tidak menganggap perubahan berhasil.

Aplikasi memuat data dari SharePoint saat dibuka, polling setiap 30 detik, dan menyediakan Refresh manual serta waktu sinkronisasi terakhir. LocalStorage hanya menyimpan snapshot server untuk fallback saat offline; snapshot versi lama dan registry status lokal dibuang. Vercel mengirim header no-store, dan aplikasi menghapus service worker/cache lama pada origin saat startup.
