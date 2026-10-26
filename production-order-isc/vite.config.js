import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function directPowerAutomatePlugin() {
  const GET_URL = process.env.POWER_AUTOMATE_GET_URL || "https://default6785298fe857464b9b4b8071784026.32.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/06/workflows/b0cd9570876643a9b967d46bf7297075/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=YjHs1tbm3O9PO4sgbIpIAfAp0LnHf9KEkiESU27-sDo";
  const CREATE_URL = process.env.POWER_AUTOMATE_CREATE_URL || "https://default6785298fe857464b9b4b8071784026.32.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/09/workflows/8d45cf3a765a4fe39fc05c2d633d5507/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=sH--Uzr5lvYjYZE74Ck5vljzy0yypR231hme0yJ7wUc";
  const UPDATE_URL = process.env.POWER_AUTOMATE_UPDATE_URL || "https://default6785298fe857464b9b4b8071784026.32.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/00/workflows/bd33de7f9329466f9075d42fc87460a6/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=SJkeb4v_ojyVJRn2sutlDQI7vctYnqzWq5KEUok8WpM";
  const DELETE_URL = process.env.POWER_AUTOMATE_DELETE_URL || "https://default6785298fe857464b9b4b8071784026.32.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/30/workflows/3fce31d1bdcb48208e1616dc1240e098/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=5sghT0I9x9tHtJR-IS73iyv3yc_B4dXFXfh_KvB2eXc";

  return {
    name: 'direct-powerautomate-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/') && !req.url.startsWith('/api?')) {
          return next();
        }

        const url = new URL(req.url, 'http://localhost');
        const action = (url.searchParams.get('action') || (req.method === 'GET' ? 'get' : 'create')).toLowerCase();

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        try {
          if (action === 'get' || action === 'list') {
            const resp = await fetch(GET_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: '{}'
            });
            const data = await resp.json();
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

            res.end(JSON.stringify({ success: true, total: mappedOrders.length, data: mappedOrders }));
            return;
          }

          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              let targetUrl = CREATE_URL;
              if (action === 'update') targetUrl = UPDATE_URL;
              else if (action === 'delete') targetUrl = DELETE_URL;

              const paRes = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body || '{}'
              });
              const text = await paRes.text();
              res.statusCode = paRes.status;
              res.end(text);
            } catch (postErr) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: postErr.message }));
            }
          });
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), directPowerAutomatePlugin()],
  base: './',
  server: {
    port: 5173,
    host: true
  }
})
