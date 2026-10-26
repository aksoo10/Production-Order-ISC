import * as XLSX from 'xlsx';

export const ORDER_COLUMNS = [
  'NoProduksi',
  'ProductGroup',
  'Langkah',
  'NamaLangkah',
  'NoKonfirmasi',
  'Status'
];

export const PERSONNEL_COLUMNS = [
  'NoPersonal',
  'Nama',
  'ProductGroup'
];

/**
 * Normalizes a header string for fuzzy matching
 */
function cleanKey(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Finds a matching value in an object using an array of possible key patterns
 */
function findValue(row, patterns, fallback = '') {
  const rowKeys = Object.keys(row);
  for (const pattern of patterns) {
    const cleanPattern = cleanKey(pattern);
    const foundKey = rowKeys.find(k => cleanKey(k) === cleanPattern || cleanKey(k).includes(cleanPattern));
    if (foundKey && row[foundKey] !== undefined && String(row[foundKey]).trim() !== '') {
      return String(row[foundKey]).trim();
    }
  }
  return fallback;
}

/**
 * Parses an uploaded Excel file arrayBuffer with smart fuzzy mapping and graceful fallbacks.
 * Accepts any sheet configuration and column naming from SAP or manual Excel.
 */
export function parseExcelFile(arrayBuffer, currentPersonnel = []) {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array', raw: false, cellText: true });
    const sheetNames = workbook.SheetNames;

    if (!sheetNames || sheetNames.length === 0) {
      return {
        success: false,
        error: 'File Excel tidak memiliki sheet yang dapat dibaca.'
      };
    }

    // 1. Find Order Sheet (Fuzzy Match or First Sheet)
    let orderSheetName = sheetNames.find(s => {
      const clean = cleanKey(s);
      return clean.includes('order') || clean.includes('produksi') || clean.includes('production') || clean.includes('sap');
    });

    // If no order sheet by name, check which sheet has order-like columns
    if (!orderSheetName) {
      for (const name of sheetNames) {
        const sheet = workbook.Sheets[name];
        const sampleRows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '' });
        if (sampleRows && sampleRows[0]) {
          const headerClean = sampleRows[0].map(cleanKey);
          if (headerClean.some(h => h.includes('order') || h.includes('prod') || h.includes('konf') || h.includes('aufnr'))) {
            orderSheetName = name;
            break;
          }
        }
      }
    }

    // Fallback: take the very first sheet
    if (!orderSheetName) {
      orderSheetName = sheetNames[0];
    }

    // 2. Find Personel Sheet (Fuzzy Match, optional)
    const personelSheetName = sheetNames.find(s => {
      const clean = cleanKey(s);
      return (clean.includes('person') || clean.includes('operat') || clean.includes('karyawan') || clean.includes('pegawai') || clean.includes('user')) && s !== orderSheetName;
    });

    // Parse Personel if sheet exists
    let personnel = [];
    if (personelSheetName && workbook.Sheets[personelSheetName]) {
      const rawPersonnel = XLSX.utils.sheet_to_json(workbook.Sheets[personelSheetName], { defval: '', raw: false });
      if (rawPersonnel && rawPersonnel.length > 0) {
        personnel = rawPersonnel.map((row, idx) => {
          const noPersonal = findValue(row, ['nopersonal', 'personal', 'id', 'nik', 'badge', 'pernr', 'nopegawai', 'no'], `OP-${idx + 1}`);
          const nama = findValue(row, ['nama', 'name', 'operator', 'fullname', 'karyawan', 'pegawai'], `Operator ${idx + 1}`);
          const group = findValue(row, ['productgroup', 'group', 'grup', 'departemen', 'dept'], 'PKW');
          return {
            NoPersonal: noPersonal,
            Nama: nama,
            ProductGroup: group
          };
        }).filter(p => p.NoPersonal && p.Nama);
      }
    }

    // If no personnel in file, retain existing personnel
    if (personnel.length === 0 && currentPersonnel && currentPersonnel.length > 0) {
      personnel = currentPersonnel;
    }

    // Parse Order Sheet
    const rawOrder = XLSX.utils.sheet_to_json(workbook.Sheets[orderSheetName], { defval: '', raw: false });

    if (!rawOrder || rawOrder.length === 0) {
      return {
        success: false,
        error: `Sheet "${orderSheetName}" kosong atau tidak memiliki baris data.`
      };
    }

    // Track sequential steps per order if langkah column missing
    const orderStepCounters = {};

    const orders = rawOrder.map((row, idx) => {
      // 1. Order Number
      const noProduksi = findValue(row, [
        'noproduksi', 'no.produksi', 'no produksi', 'order', 'orderno', 'nomororder',
        'productionorder', 'aufnr', 'productionorderno', 'nomorproduksi', 'id'
      ], `ORD-${Math.floor(idx / 5) + 1}`);

      // 2. Product Group
      const productGroup = findValue(row, [
        'productgroup', 'product group', 'group', 'grup', 'product', 'pg',
        'workcenter', 'arbpl', 'plant', 'werks', 'divisi', 'line'
      ], 'PKW');

      // 3. Step Number
      if (!orderStepCounters[noProduksi]) {
        orderStepCounters[noProduksi] = 1;
      }
      let stepVal = findValue(row, [
        'langkah', 'step', 'vornr', 'operasi', 'operation', 'activity', 'no', 'nomor', 'urutan'
      ], null);

      let stepNum = parseInt(stepVal, 10);
      if (isNaN(stepNum) || stepNum <= 0) {
        stepNum = orderStepCounters[noProduksi];
      }
      orderStepCounters[noProduksi] = stepNum + 1;

      // 4. Step Name / Description
      const namaLangkah = findValue(row, [
        'namalangkah', 'nama langkah', 'nama operasi', 'ltxa1', 'deskripsi',
        'description', 'kegiatan', 'pekerjaan', 'aktivitas', 'stepname', 'text'
      ], `Langkah Produksi ${stepNum}`);

      // 5. Confirmation Number (Crucial for Barcode)
      let noKonfirmasi = findValue(row, [
        'nokonfirmasi', 'no. konfirmasi', 'no konfirmasi', 'konfirmasi',
        'confirmation', 'confirmationno', 'rueck', 'confno', 'noconfirmation', 'barcode'
      ], '');

      if (!noKonfirmasi) {
        // Fallback: generate valid confirmation number from order & step
        noKonfirmasi = `90${String(noProduksi).replace(/\D/g, '').slice(-4)}${String(stepNum).padStart(2, '0')}`;
      }

      // 6. Status
      const statusRaw = findValue(row, [
        'status', 'stat', 'systemstatus', 'statuspengerjaan', 'state', 'kondisi'
      ], 'Berjalan').toLowerCase();

      const isCompleted = statusRaw.includes('selesai') || statusRaw.includes('cnf') || statusRaw.includes('done') || statusRaw.includes('comp');
      const normalizedStatus = isCompleted ? 'Selesai' : 'Berjalan';

      return {
        NoProduksi: String(noProduksi).trim(),
        ProductGroup: String(productGroup).trim().toUpperCase(),
        Langkah: stepNum,
        NamaLangkah: String(namaLangkah).trim(),
        NoKonfirmasi: String(noKonfirmasi).trim(),
        Status: normalizedStatus
      };
    }).filter(o => o.NoProduksi && o.NoKonfirmasi);

    if (orders.length === 0) {
      return {
        success: false,
        error: 'Tidak ditemukan data order yang valid di dalam file Excel ini.'
      };
    }

    return {
      success: true,
      orders,
      personnel: personnel.length > 0 ? personnel : currentPersonnel,
      sourceSheet: orderSheetName,
      personnelSheetFound: Boolean(personelSheetName)
    };
  } catch (err) {
    return {
      success: false,
      error: `Gagal membaca file Excel: ${err.message || 'Format tidak valid'}`
    };
  }
}

/**
 * Export current orders and personnel to an Excel file (.xlsx)
 */
export function exportToExcel(orders, personnel) {
  const wb = XLSX.utils.book_new();

  const sortedOrders = [...orders].sort((a, b) => {
    if (a.NoProduksi !== b.NoProduksi) {
      return a.NoProduksi.localeCompare(b.NoProduksi);
    }
    return Number(a.Langkah) - Number(b.Langkah);
  });

  const orderData = sortedOrders.map(o => ({
    NoProduksi: String(o.NoProduksi),
    ProductGroup: String(o.ProductGroup || 'PKW'),
    Langkah: Number(o.Langkah),
    NamaLangkah: String(o.NamaLangkah || ''),
    NoKonfirmasi: String(o.NoKonfirmasi),
    Status: String(o.Status || 'Berjalan')
  }));

  const orderWs = XLSX.utils.json_to_sheet(orderData, { header: ORDER_COLUMNS });
  orderWs['!cols'] = [
    { wch: 16 },
    { wch: 16 },
    { wch: 10 },
    { wch: 38 },
    { wch: 18 },
    { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, orderWs, 'Order');

  const sortedPersonnel = [...(personnel || [])].sort((a, b) => (a.Nama || '').localeCompare(b.Nama || ''));
  const personnelData = sortedPersonnel.map(p => ({
    NoPersonal: String(p.NoPersonal || ''),
    Nama: String(p.Nama || ''),
    ProductGroup: String(p.ProductGroup || 'PKW')
  }));

  const personnelWs = XLSX.utils.json_to_sheet(personnelData, { header: PERSONNEL_COLUMNS });
  personnelWs['!cols'] = [
    { wch: 16 },
    { wch: 28 },
    { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, personnelWs, 'Personel');

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const filename = `ISC_Production_Order_Updated_${timestamp}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Downloads a starter template with sample Order & Personel sheets
 */
export function downloadTemplateExcel() {
  const samplePersonnel = [
    { NoPersonal: "2324", Nama: "Dudi", ProductGroup: "PKW" },
    { NoPersonal: "530617", Nama: "Renan Aldi", ProductGroup: "PKW" },
    { NoPersonal: "109842", Nama: "Agus Pratama", ProductGroup: "PULP" }
  ];

  const sampleOrders = [
    { NoProduksi: "10048291", ProductGroup: "PKW", Langkah: 1, NamaLangkah: "Persiapan Material & Disassembly", NoKonfirmasi: "90124401", Status: "Selesai" },
    { NoProduksi: "10048291", ProductGroup: "PKW", Langkah: 2, NamaLangkah: "Inspeksi Dimensi & NDT", NoKonfirmasi: "90124402", Status: "Selesai" },
    { NoProduksi: "10048291", ProductGroup: "PKW", Langkah: 3, NamaLangkah: "Machining & Dynamic Balancing", NoKonfirmasi: "90124403", Status: "Berjalan" },
    { NoProduksi: "10048291", ProductGroup: "PKW", Langkah: 4, NamaLangkah: "Assembly & Alignment", NoKonfirmasi: "90124404", Status: "Berjalan" },
    { NoProduksi: "10048291", ProductGroup: "PKW", Langkah: 5, NamaLangkah: "Final Testing & Packing", NoKonfirmasi: "90124405", Status: "Berjalan" }
  ];

  const wb = XLSX.utils.book_new();
  const orderWs = XLSX.utils.json_to_sheet(sampleOrders, { header: ORDER_COLUMNS });
  orderWs['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 38 }, { wch: 18 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, orderWs, 'Order');

  const personnelWs = XLSX.utils.json_to_sheet(samplePersonnel, { header: PERSONNEL_COLUMNS });
  personnelWs['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, personnelWs, 'Personel');

  XLSX.writeFile(wb, 'Format_Template_Order_Personel_ISC.xlsx');
}
