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
        error: 'Excel file does not contain readable sheets.'
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
        error: `Sheet "${orderSheetName}" is empty or has no data rows.`
      };
    }

    // Track sequential steps and confirmation numbers per order
    const orderStepCounters = {};
    const orderConfirmationMap = {};

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

      // 3. Step Number (Supports 'Step 1', 'step 2', 'Langkah 3', or numeric 1, 2, 3)
      if (!orderStepCounters[noProduksi]) {
        orderStepCounters[noProduksi] = 1;
      }
      let stepVal = findValue(row, [
        'langkah', 'step', 'vornr', 'operasi', 'operation', 'activity', 'no', 'nomor', 'urutan'
      ], null);

      let stepNum = NaN;
      if (stepVal !== null && stepVal !== undefined && stepVal !== '') {
        const match = String(stepVal).match(/\d+/);
        if (match) {
          stepNum = parseInt(match[0], 10);
        }
      }
      if (isNaN(stepNum) || stepNum <= 0) {
        stepNum = orderStepCounters[noProduksi];
      }
      orderStepCounters[noProduksi] = stepNum + 1;

      // 4. Step Name / Description
      const namaLangkah = findValue(row, [
        'namalangkah', 'nama langkah', 'nama operasi', 'ltxa1', 'deskripsi',
        'description', 'kegiatan', 'pekerjaan', 'aktivitas', 'stepname', 'text'
      ], `Langkah Produksi ${stepNum}`);

      // 5. Confirmation Number (Remains identical for all steps in the same production order)
      let rawKonfirmasi = findValue(row, [
        'nokonfirmasi', 'no. konfirmasi', 'no konfirmasi', 'konfirmasi',
        'confirmation', 'confirmationno', 'rueck', 'confno', 'noconfirmation', 'barcode'
      ], '');

      let noKonfirmasi;
      if (rawKonfirmasi) {
        if (!orderConfirmationMap[noProduksi]) {
          orderConfirmationMap[noProduksi] = String(rawKonfirmasi).trim();
        }
        // Enforce the same confirmation number across all steps of this order
        noKonfirmasi = orderConfirmationMap[noProduksi];
      } else if (orderConfirmationMap[noProduksi]) {
        // Inherit identical confirmation number from previous steps of this order
        noKonfirmasi = orderConfirmationMap[noProduksi];
      } else {
        // Fallback: generate uniform confirmation number for this order (same for all steps)
        const cleanDigits = String(noProduksi).replace(/\D/g, '');
        const fallbackConf = `1000${cleanDigits.slice(-4).padStart(4, '0')}`;
        orderConfirmationMap[noProduksi] = fallbackConf;
        noKonfirmasi = fallbackConf;
      }

      // 6. Status
      const statusRaw = findValue(row, [
        'status', 'stat', 'systemstatus', 'statuspengerjaan', 'state', 'kondisi'
      ], 'Berjalan').toLowerCase();

      const isCompleted = statusRaw.includes('selesai') || statusRaw.includes('cnf') || statusRaw.includes('done') || statusRaw.includes('comp');
      const normalizedStatus = isCompleted ? 'Selesai' : 'Berjalan';

      // 7. Extended Fields from SAP/Excel if present
      const customers = findValue(row, [
        'customer', 'customers', 'kustomer', 'pelanggan', 'client', 'pemesan'
      ], 'ANDRITZ ISC Internal');

      const soDocument = findValue(row, [
        'sodocument', 'so', 'salesorder', 'dokumenso', 'sonumber', 'vbeln'
      ], '-');

      const wbsProdNo = findValue(row, [
        'wbsprodno', 'wbs', 'wbselement', 'nowbs', 'posid'
      ], '-');

      const materialNo = findValue(row, [
        'materialno', 'material', 'matnr', 'nomaterial', 'partno'
      ], '-');

      const materialDescription = findValue(row, [
        'materialdescription', 'materialdesc', 'matdesc', 'maktx', 'deskripsimaterial', 'namamaterial'
      ], namaLangkah);

      const shortDescSO = findValue(row, [
        'shortdescso', 'shortdesc', 'deskripsiso', 'soitemtext'
      ], namaLangkah);

      const qtyOrder = parseFloat(findValue(row, [
        'qtyorder', 'qty', 'quantity', 'jumlah', 'menge'
      ], 1)) || 1.0;

      const planStart = findValue(row, [
        'planstart', 'start', 'tanggalmulai', 'mulai', 'gstrp'
      ], new Date().toISOString().split('T')[0]);

      const planFinish = findValue(row, [
        'planfinish', 'finish', 'tanggalselesai', 'selesai', 'gltrp'
      ], new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);

      return {
        id: 0,
        ID: 0,
        orderNo: String(noProduksi).trim(),
        NoProduksi: String(noProduksi).trim(),
        prodOrderNo: String(noProduksi).trim(),
        ProductGroup: String(productGroup).trim().toUpperCase(),
        orderDivision: String(productGroup).trim().toUpperCase(),
        Langkah: stepNum,
        NamaLangkah: String(namaLangkah).trim(),
        title: String(namaLangkah).trim(),
        NoKonfirmasi: String(noKonfirmasi).trim(),
        Status: normalizedStatus,
        status: isCompleted ? 1 : 0,
        customers: String(customers).trim(),
        soDocument: String(soDocument).trim(),
        wbsProdNo: String(wbsProdNo).trim(),
        materialNo: String(materialNo).trim(),
        materialDescription: String(materialDescription).trim(),
        shortDescSO: String(shortDescSO).trim(),
        qtyOrder: qtyOrder,
        planStart: String(planStart).split('T')[0],
        planFinish: String(planFinish).split('T')[0]
      };
    }).filter(o => o.NoProduksi && o.NoKonfirmasi);

    if (orders.length === 0) {
      return {
        success: false,
        error: 'No valid order records found in this Excel file.'
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
      error: `Failed to parse Excel file: ${err.message || 'Invalid format'}`
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
    { NoPersonal: "1001", Nama: "Operator 1", ProductGroup: "PKW" },
    { NoPersonal: "1002", Nama: "Operator 2", ProductGroup: "PKW" },
    { NoPersonal: "1003", Nama: "Operator 3", ProductGroup: "PULP" }
  ];

  // Format langkah: 1 baris per langkah (Step 1, Step 2, dst.), NoKonfirmasi tetap sama per NoProduksi
  const sampleOrders = [
    {
      NoProduksi: "4800115516",
      ProductGroup: "PKW",
      Langkah: "Step 1",
      NamaLangkah: "Persiapan Material & Disassembly",
      NoKonfirmasi: "100014",
      Status: "Selesai"
    },
    {
      NoProduksi: "4800115516",
      ProductGroup: "PKW",
      Langkah: "Step 2",
      NamaLangkah: "Machining & Dynamic Balancing",
      NoKonfirmasi: "100014",
      Status: "Berjalan"
    },
    {
      NoProduksi: "4800115516",
      ProductGroup: "PKW",
      Langkah: "Step 3",
      NamaLangkah: "Final QC & Packaging",
      NoKonfirmasi: "100014",
      Status: "Berjalan"
    },
    {
      NoProduksi: "53072677",
      ProductGroup: "PKW",
      Langkah: "Step 1",
      NamaLangkah: "Rough Turning & Dimension Check",
      NoKonfirmasi: "100015",
      Status: "Berjalan"
    },
    {
      NoProduksi: "53072677",
      ProductGroup: "PKW",
      Langkah: "Step 2",
      NamaLangkah: "Precision Grinding & Polishing",
      NoKonfirmasi: "100015",
      Status: "Berjalan"
    }
  ];

  const wb = XLSX.utils.book_new();

  // 1. Sheet Order
  const orderWs = XLSX.utils.json_to_sheet(sampleOrders, { header: ORDER_COLUMNS });
  orderWs['!cols'] = [
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 38 },
    { wch: 18 },
    { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, orderWs, 'Order');

  // 2. Sheet Personel
  const personnelWs = XLSX.utils.json_to_sheet(samplePersonnel, { header: PERSONNEL_COLUMNS });
  personnelWs['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, personnelWs, 'Personel');

  // 3. Sheet Format Guide
  const guideData = [
    {
      "Format Requirement": "1. Step Format",
      "Mandatory Rule": "Must be 1 row per step (NOT total steps collapsed into one row). Written as 'Step 1', 'Step 2', etc., or numbers 1, 2, 3.",
      "Example": "An order with 3 steps must be entered across 3 distinct rows sharing the same NoProduksi."
    },
    {
      "Format Requirement": "2. Confirmation Number",
      "Mandatory Rule": "Confirmation Number (NoKonfirmasi) REMAINS IDENTICAL for all steps within the same Production Order No.",
      "Example": "Order 4800115516: Step 1 = 100014, Step 2 = 100014, Step 3 = 100014 (uniform confirmation barcode)."
    },
    {
      "Format Requirement": "3. Sheet Names",
      "Mandatory Rule": "The order data sheet must be named 'Order' and the personnel sheet must be named 'Personel'.",
      "Example": "Sheet 1: Order, Sheet 2: Personel"
    },
    {
      "Format Requirement": "4. Work Status",
      "Mandatory Rule": "Enter 'Completed' (or 'Selesai') for finished steps, or 'In Progress' (or 'Berjalan') for pending/active steps.",
      "Example": "Completed / In Progress"
    }
  ];
  const guideWs = XLSX.utils.json_to_sheet(guideData);
  guideWs['!cols'] = [{ wch: 26 }, { wch: 65 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, guideWs, 'Format_Guide');

  XLSX.writeFile(wb, 'Format_Template_Order_Personel_ISC.xlsx');
}
