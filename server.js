require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { google } = require('googleapis');

const app = express();

// HTTP Basic Auth — protects the entire app (UI + API).
// Set BASIC_AUTH_USER and BASIC_AUTH_PASS in your environment (Render dashboard).
// If either var is absent the middleware is skipped (safe for local dev).
app.use((req, res, next) => {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;
  if (!user || !pass) return next();

  const header = req.headers['authorization'] || '';
  if (header.startsWith('Basic ')) {
    const decoded = Buffer.from(header.slice(6), 'base64').toString();
    const colonAt = decoded.indexOf(':');
    if (colonAt !== -1 && decoded.slice(0, colonAt) === user && decoded.slice(colonAt + 1) === pass) {
      return next();
    }
  }
  res.set('WWW-Authenticate', 'Basic realm="CarePana"');
  res.status(401).send('Authentication required');
});

app.use(cors());
app.use(express.json());

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

// Service_Records columns A–N (14 cols):
// RecordID | CaregiverID | CaregiverName | CustomerID | CustomerName | serviceDate |
// NumServices | FromTime | ToTime | Status | Type | Parent_Plan_ID | CreatedAt | UpdatedAt

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function rowsToObjects(rows) {
  if (!rows || rows.length < 1) return [];
  const headers = rows[0];
  return rows.slice(1).map(row =>
    headers.reduce((obj, h, i) => { obj[h] = row[i] ?? ''; return obj; }, {})
  );
}

function nextId(rows, prefix, padLen) {
  const re = new RegExp(`^${prefix}(\\d+)$`);
  const max = (rows || []).slice(1).reduce((m, r) => {
    const match = (r[0] || '').match(re);
    return match ? Math.max(m, parseInt(match[1])) : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(padLen, '0')}`;
}

// ── Caregivers ───────────────────────────────────────────────────────────────
app.get('/api/caregivers', async (req, res) => {
  try {
    const r = await getSheets().spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID, range: 'Caregivers!A:E',
    });
    res.json(rowsToObjects(r.data.values));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Customers ────────────────────────────────────────────────────────────────
app.get('/api/customers', async (req, res) => {
  try {
    const r = await getSheets().spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID, range: 'Customers!A:E',
    });
    res.json(rowsToObjects(r.data.values));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/customers', async (req, res) => {
  try {
    const sheets = getSheets();
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID, range: 'Customers!A:A',
    });
    const customerId = nextId(existing.data.values, 'CUST', 2);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Customers!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[customerId, name, '', '', 'Active']] },
    });
    res.json({ success: true, customerId, name });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Service Records ──────────────────────────────────────────────────────────
// GET  ?date=YYYY-MM-DD  &type=Plan|Actual  &status=Planned|Executed
app.get('/api/service-records', async (req, res) => {
  try {
    const r = await getSheets().spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID, range: 'Service_Records!A:N',
    });
    let data = rowsToObjects(r.data.values);
    if (req.query.date)   data = data.filter(row => row.serviceDate === req.query.date);
    if (req.query.type)   data = data.filter(row => row.Type === req.query.type);
    if (req.query.status) data = data.filter(row => row.Status === req.query.status);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST — create Plan or Actual row
app.post('/api/service-records', async (req, res) => {
  try {
    const sheets = getSheets();
    const {
      CaregiverID, CaregiverName,
      CustomerID, CustomerName,
      serviceDate,
      NumServices, FromTime, ToTime,
      type,         // 'Plan' | 'Actual'
      parentPlanId, // Actual linked to a Plan (optional)
    } = req.body;

    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID, range: 'Service_Records!A:A',
    });
    const RecordID = nextId(existing.data.values, 'REC', 3);
    const now = new Date().toISOString();
    const status = 'Active';

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Service_Records!A:N',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          RecordID, CaregiverID, CaregiverName,
          CustomerID, CustomerName, serviceDate,
          NumServices, FromTime, ToTime,
          status, type, parentPlanId || '',
          now, '',
        ]],
      },
    });
    res.json({ success: true, RecordID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT — update any row (used for editing actuals)
app.put('/api/service-records/:recordId', async (req, res) => {
  try {
    const sheets = getSheets();
    const { recordId } = req.params;

    const colA = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID, range: 'Service_Records!A:A',
    });
    const rows = colA.data.values || [];
    const idx = rows.findIndex(r => r[0] === recordId);
    if (idx === -1) return res.status(404).json({ error: 'Record not found' });

    const sheetRow = idx + 1;
    const {
      CaregiverID, CaregiverName,
      CustomerID, CustomerName,
      serviceDate,
      NumServices, FromTime, ToTime,
      Status, Type, Parent_Plan_ID, CreatedAt,
    } = req.body;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Service_Records!A${sheetRow}:N${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          recordId, CaregiverID, CaregiverName,
          CustomerID, CustomerName, serviceDate,
          NumServices, FromTime, ToTime,
          Status, Type, Parent_Plan_ID || '',
          CreatedAt || '', new Date().toISOString(),
        ]],
      },
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE — hard-delete a row from the sheet (Actual records only; Plan records are immutable)
app.delete('/api/service-records/:recordId', async (req, res) => {
  try {
    const sheets = getSheets();
    const { recordId } = req.params;

    // Fetch full rows so we can check the Type column before deleting
    const colA = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID, range: 'Service_Records!A:N',
    });
    const rows = colA.data.values || [];
    const idx = rows.findIndex(r => r[0] === recordId);
    if (idx === -1) return res.status(404).json({ error: 'Record not found' });

    // Column K (index 10) = Type — Plan rows must never be deleted
    const rowType = (rows[idx] || [])[10] || '';
    if (rowType === 'Plan') {
      return res.status(403).json({ error: 'Plan records cannot be deleted — they are permanent historical records' });
    }

    // Resolve the numeric sheetId for Service_Records tab
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID, fields: 'sheets.properties',
    });
    const sheet = meta.data.sheets.find(s => s.properties.title === 'Service_Records');
    if (!sheet) return res.status(404).json({ error: 'Service_Records tab not found' });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: idx,       // 0-indexed; idx=0 is header row
              endIndex: idx + 1,
            },
          },
        }],
      },
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Serve the Vite production build (ignored in dev — dist/ won't exist)
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`CarePana API  →  http://localhost:${PORT}`);
  console.log(`Spreadsheet   →  ${SPREADSHEET_ID}`);
});
