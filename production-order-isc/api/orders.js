/**
 * ANDRITZ ISC - Vercel Serverless API Proxy for Microsoft Power Automate & SharePoint
 */

const GET_URL = process.env.POWER_AUTOMATE_GET_URL || "https://default6785298fe857464b9b4b8071784026.32.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/06/workflows/b0cd9570876643a9b967d46bf7297075/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=YjHs1tbm3O9PO4sgbIpIAfAp0LnHf9KEkiESU27-sDo";
const CREATE_URL = process.env.POWER_AUTOMATE_CREATE_URL || "https://default6785298fe857464b9b4b8071784026.32.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/09/workflows/8d45cf3a765a4fe39fc05c2d633d5507/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=sH--Uzr5lvYjYZE74Ck5vljzy0yypR231hme0yJ7wUc";
const UPDATE_URL = process.env.POWER_AUTOMATE_UPDATE_URL || "https://default6785298fe857464b9b4b8071784026.32.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/00/workflows/bd33de7f9329466f9075d42fc87460a6/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=SJkeb4v_ojyVJRn2sutlDQI7vctYnqzWq5KEUok8WpM";
const DELETE_URL = process.env.POWER_AUTOMATE_DELETE_URL || "https://default6785298fe857464b9b4b8071784026.32.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/30/workflows/3fce31d1bdcb48208e1616dc1240e098/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=5sghT0I9x9tHtJR-IS73iyv3yc_B4dXFXfh_KvB2eXc";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = (req.query.action || (req.method === 'GET' ? 'get' : req.method === 'DELETE' ? 'delete' : req.method === 'PUT' ? 'update' : 'create')).toLowerCase();
  const body = req.body || {};

  try {
    switch (action) {
      case 'get':
      case 'list': {
        const response = await fetch(GET_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        });

        if (!response.ok) {
          const text = await response.text();
          return res.status(response.status).send(text);
        }

        const data = await response.json();
        const rawItems = data.data || [];
        const mappedOrders = [];

        for (const sp of rawItems) {
          const rawProdOrder = String(sp.field_4 || '').trim();
          const rawTitle = String(sp.Title || '').trim();
          const rawCustomer = String(sp.field_1 || '').trim();
          const rawSO = String(sp.field_2 || '').trim();
          const rawWBS = String(sp.field_3 || '').trim();
          const rawDiv = String(sp.field_5 || '').trim();
          const rawShortDesc = String(sp.field_6 || '').trim();
          const rawMatNo = String(sp.field_7 || '').trim();
          const rawMatDesc = String(sp.field_8 || '').trim();

          if (!rawProdOrder && !rawTitle && !rawCustomer && !rawMatDesc && !rawShortDesc && !rawWBS) {
            continue;
          }

          let orderNo = '';
          if (rawProdOrder && rawProdOrder !== '-' && rawProdOrder !== '0') {
            orderNo = rawProdOrder;
          } else if (rawTitle && rawTitle !== '-' && rawTitle !== '0') {
            orderNo = rawTitle;
          } else if (rawWBS && rawWBS !== '-' && rawWBS !== '0') {
            orderNo = rawWBS;
          } else if (rawSO && rawSO !== '-' && rawSO.toLowerCase() !== 'new order' && rawSO !== '0') {
            orderNo = `${rawSO}-${sp.ID || '0'}`;
          } else {
            orderNo = `ORD-${sp.ID || '0'}`;
          }

          let processName = rawShortDesc || rawMatDesc;
          if (!processName || processName === '0') {
            processName = (rawTitle && isNaN(Number(rawTitle))) ? rawTitle : 'Proses Produksi ISC';
          }

          let group = 'PKW';
          if (rawDiv && rawDiv !== '0' && rawDiv !== '-') {
            const first = rawDiv.split(/[\s&/]+/)[0].toUpperCase();
            group = first || 'PKW';
          }

          let conf = '1000' + String(sp.ID || 1);
          const digits = (rawProdOrder && rawProdOrder !== '-' && rawProdOrder !== '0' ? rawProdOrder : orderNo).replace(/\D/g, '');
          if (digits.length >= 4) {
            conf = '1000' + digits.slice(-4);
          } else {
            conf = '9000' + String(sp.ID || 1).padStart(4, '0');
          }

          const statusNum = sp.field_12 === 1 ? 1 : 0;
          const statusText = statusNum === 1 ? 'Selesai' : 'Berjalan';

          mappedOrders.push({
            id: parseInt(sp.ID, 10) || 0,
            ID: parseInt(sp.ID, 10) || 0,
            orderNo: orderNo,
            NoProduksi: orderNo,
            title: processName,
            NamaLangkah: processName,
            customers: rawCustomer || 'ANDRITZ ISC Internal',
            soDocument: rawSO && rawSO !== '0' ? rawSO : '-',
            wbsProdNo: rawWBS && rawWBS !== '0' ? rawWBS : '-',
            prodOrderNo: rawProdOrder && rawProdOrder !== '-' && rawProdOrder !== '0' ? rawProdOrder : '-',
            orderDivision: rawDiv && rawDiv !== '0' && rawDiv !== '-' ? rawDiv : 'PKW Wood Process.Ser',
            ProductGroup: group,
            shortDescSO: rawShortDesc && rawShortDesc !== '0' ? rawShortDesc : '-',
            materialNo: rawMatNo && rawMatNo !== '0' ? rawMatNo : '-',
            materialDescription: rawMatDesc && rawMatDesc !== '0' ? rawMatDesc : processName,
            qtyOrder: parseFloat(sp.field_9) || 1.0,
            planStart: sp.field_10 ? String(sp.field_10).split('T')[0] : '2026-10-26',
            planFinish: sp.field_11 ? String(sp.field_11).split('T')[0] : '2026-11-15',
            status: statusNum,
            Status: statusText,
            Langkah: 1,
            NoKonfirmasi: conf,
            Created: String(sp.Created || ''),
            Modified: String(sp.Modified || ''),
            Author: sp.Author ? sp.Author.DisplayName || '' : ''
          });
        }

        return res.status(200).json({
          success: true,
          total: mappedOrders.length,
          data: mappedOrders
        });
      }

      case 'create': {
        const rawItems = Array.isArray(body.items) ? body.items : (Array.isArray(body) ? body : [body]);
        const formattedItems = [];

        for (const it of rawItems) {
          const orderNum = String(it.orderNo || it.NoProduksi || it.prodOrderNo || '').trim();
          if (!orderNum) continue;

          formattedItems.push({
            orderNo: orderNum,
            title: String(it.title || it.NamaLangkah || `Order ${orderNum}`),
            customers: String(it.customers || it.Customer || 'ANDRITZ ISC Internal'),
            soDocument: String(it.soDocument || ''),
            wbsProdNo: String(it.wbsProdNo || ''),
            prodOrderNo: orderNum,
            orderDivision: String(it.orderDivision || it.ProductGroup || 'PKW'),
            shortDescSO: String(it.shortDescSO || ''),
            materialNo: String(it.materialNo || ''),
            materialDescription: String(it.materialDescription || ''),
            qtyOrder: parseFloat(it.qtyOrder) || 1.0,
            planStart: String(it.planStart || new Date().toISOString().split('T')[0]),
            planFinish: String(it.planFinish || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]),
            status: parseInt(it.status, 10) || 0
          });
        }

        if (formattedItems.length === 0) {
          return res.status(400).json({ success: false, error: 'No valid items to create' });
        }

        const createRes = await fetch(CREATE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: formattedItems })
        });

        const text = await createRes.text();
        return res.status(createRes.status).send(text);
      }

      case 'update': {
        const rawItems = Array.isArray(body.items) ? body.items : (Array.isArray(body) ? body : [body]);
        const formattedItems = [];

        for (const it of rawItems) {
          const id = parseInt(it.id || it.ID, 10);
          const orderNum = String(it.orderNo || it.NoProduksi || it.prodOrderNo || '').trim();
          if (!id || id <= 0 || !orderNum) continue;

          formattedItems.push({
            id,
            orderNo: orderNum,
            title: String(it.title || it.NamaLangkah || `Order ${orderNum}`),
            customers: String(it.customers || it.Customer || ''),
            soDocument: String(it.soDocument || ''),
            wbsProdNo: String(it.wbsProdNo || ''),
            prodOrderNo: orderNum,
            orderDivision: String(it.orderDivision || it.ProductGroup || 'PKW'),
            shortDescSO: String(it.shortDescSO || ''),
            materialNo: String(it.materialNo || ''),
            materialDescription: String(it.materialDescription || ''),
            qtyOrder: parseFloat(it.qtyOrder) || 1.0,
            planStart: String(it.planStart || new Date().toISOString().split('T')[0]),
            planFinish: String(it.planFinish || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]),
            status: parseInt(it.status, 10) || 0
          });
        }

        if (formattedItems.length === 0) {
          return res.status(400).json({ success: false, error: 'No valid items to update (id and orderNo required)' });
        }

        const updateRes = await fetch(UPDATE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: formattedItems })
        });

        const text = await updateRes.text();
        return res.status(updateRes.status).send(text);
      }

      case 'delete': {
        const id = parseInt(req.query.id || body.ID || body.id, 10);
        if (!id || id <= 0) {
          return res.status(400).json({ success: false, error: 'Valid integer ID required for deletion' });
        }

        const delRes = await fetch(DELETE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ID: id })
        });

        const text = await delRes.text();
        return res.status(delRes.status).send(text);
      }

      default:
        return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
