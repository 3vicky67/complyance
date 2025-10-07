# React + Vite

ROI Calculator — Manual vs Automated Invoicing
================================================

Overview
- Goal: Lightweight ROI calculator to visualize cost savings, ROI, and payback when switching from manual to automated invoicing.
- Stack
  - Frontend: React (Vite), Tailwind CSS, Recharts
  - Backend: Node.js + Express
  - Database: SQLite (zero-config, file-based)

Key Features
- Input basic business metrics (volume, time, cost).
- Compute monthly savings, ROI, and payback period with simple formulas.
- Visualize cost comparison and cumulative payback via Recharts.
- Save and load scenarios in SQLite.

Formulas
- Manual monthly cost = invoices_per_month × manual_minutes_per_invoice/60 × hourly_rate
- Automated monthly cost = software_monthly_cost + invoices_per_month × automation_minutes_per_invoice/60 × hourly_rate
- Error cost (monthly) = invoices_per_month × error_rate × error_cost
  - Compute separately for manual and automated variants
- Total manual = manual_cost + manual_error_cost
- Total automated = automated_cost + automated_error_cost
- Savings (monthly) = total_manual − total_automated
- ROI (monthly) = savings / max(automated_cost, 1)
- Payback (months) = max(1, ceil(implementation_cost / max(savings, 1)))
Note: You may set implementation_cost = software_monthly_cost (or another constant) for a simple model, or expose it in the form.

Recommended Project Structure
- Frontend (Vite React app)
  - src/
    - components/
      - RoiForm.jsx
      - RoiCharts.jsx
    - App.jsx
    - index.css (Tailwind entry)
  - vite.config.js (dev server proxy: /api -> http://localhost:3001)
- Backend (Express)
  - server/
    - index.mjs (Express server + API routes)
    - db.js (SQLite access via better-sqlite3 or sqlite3)
    - schema.sql (DDL)
    - .env (PORT=3001, DATABASE_URL=./data/roi.db)
  - data/
    - roi.db (auto-created)

Frontend: Quick Start
1) Install
   - npm install
   - Install Tailwind (if not already):
     - npm install -D tailwindcss postcss autoprefixer
     - npx tailwindcss init -p
     - In tailwind.config.js set content to ["./index.html","./src/**/*.{js,jsx,ts,tsx}"]
     - In src/index.css add:
       @tailwind base;
       @tailwind components;
       @tailwind utilities;
2) Add Recharts
   - npm install recharts
3) Dev server
   - npm run dev
   - Runs at http://localhost:5173

Backend: Quick Start
1) Install
   - cd server
   - npm init -y
   - npm install express cors dotenv better-sqlite3 zod
2) Environment
   - Create server/.env
     PORT=3001
     DATABASE_URL=./data/roi.db
3) Database
   - Create server/schema.sql with the following:
     -- scenarios table
     CREATE TABLE IF NOT EXISTS scenarios (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       name TEXT,
       inputs_json TEXT NOT NULL,
       results_json TEXT NOT NULL
     );
   - Ensure server/data directory exists; the DB file will be created at first write.
4) Server (server/index.mjs) example:
   import 'dotenv/config'
   import express from 'express'
   import cors from 'cors'
   import Database from 'better-sqlite3'
   import { z } from 'zod'
   import fs from 'node:fs'
   import path from 'node:path'

   const app = express()
   app.use(cors())
   app.use(express.json())

   const dbPath = process.env.DATABASE_URL || './data/roi.db'
   fs.mkdirSync(path.dirname(dbPath), { recursive: true })
   const db = new Database(dbPath)
   const schema = fs.readFileSync(path.join(process.cwd(), 'server', 'schema.sql'), 'utf-8')
   db.exec(schema)

   const InputSchema = z.object({
     invoices_per_month: z.number().min(0),
     manual_minutes_per_invoice: z.number().min(0),
     hourly_rate: z.number().min(0),
     software_monthly_cost: z.number().min(0),
     automation_minutes_per_invoice: z.number().min(0),
     error_rate_manual: z.number().min(0).max(1),
     error_rate_auto: z.number().min(0).max(1),
     error_cost: z.number().min(0),
     implementation_cost: z.number().min(0).optional().default(0),
     name: z.string().optional()
   })

   function calculate(input) {
     const mVol = input.invoices_per_month
     const mMin = input.manual_minutes_per_invoice
     const rate = input.hourly_rate
     const sCost = input.software_monthly_cost
     const aMin = input.automation_minutes_per_invoice
     const errManual = input.error_rate_manual
     const errAuto = input.error_rate_auto
     const errCost = input.error_cost
     const impl = input.implementation_cost || sCost

     const manualCost = mVol * (mMin/60) * rate
     const autoCostVar = mVol * (aMin/60) * rate
     const automatedCost = sCost + autoCostVar

     const manualErrorCost = mVol * errManual * errCost
     const autoErrorCost = mVol * errAuto * errCost

     const totalManual = manualCost + manualErrorCost
     const totalAutomated = automatedCost + autoErrorCost

     const savings = totalManual - totalAutomated
     const roi = savings / Math.max(automatedCost, 1)
     const paybackMonths = Math.max(1, Math.ceil(impl / Math.max(savings, 1)))

     return {
       manualCost,
       automatedCost,
       manualErrorCost,
       autoErrorCost,
       totalManual,
       totalAutomated,
       savings,
       roi,
       paybackMonths
     }
   }

   app.post('/api/calc', (req, res) => {
     const parsed = InputSchema.safeParse(req.body)
     if (!parsed.success) {
       return res.status(400).json({ error: parsed.error.flatten() })
     }
     const results = calculate(parsed.data)
     return res.json(results)
   })

   app.get('/api/scenarios', (req, res) => {
     const rows = db.prepare('SELECT id, created_at, name FROM scenarios ORDER BY created_at DESC').all()
     res.json(rows)
   })

   app.get('/api/scenarios/:id', (req, res) => {
     const row = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(req.params.id)
     if (!row) return res.status(404).json({ error: 'Not found' })
     res.json({
       id: row.id,
       created_at: row.created_at,
       name: row.name,
       inputs: JSON.parse(row.inputs_json),
       results: JSON.parse(row.results_json),
     })
   })

   app.post('/api/scenarios', (req, res) => {
     const parsed = InputSchema.safeParse(req.body)
     if (!parsed.success) {
       return res.status(400).json({ error: parsed.error.flatten() })
     }
     const results = calculate(parsed.data)
     const info = db.prepare(
       'INSERT INTO scenarios (name, inputs_json, results_json) VALUES (?, ?, ?)'
     ).run(parsed.data.name || null, JSON.stringify(parsed.data), JSON.stringify(results))
     res.status(201).json({ id: info.lastInsertRowid, ...results })
   })

   const port = Number(process.env.PORT) || 3001
   app.listen(port, () => {
     console.log(`[server] listening on http://localhost:${port}`)
   })

5) Run backend
   - node server/index.mjs

Vite Dev Proxy (vite.config.js)
- Configure dev server to forward API calls to Express:
  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'

  export default defineConfig({
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:3001'
      }
    }
  })

API Reference
- POST /api/calc
  - Request JSON:
    {
      "invoices_per_month": 1000,
      "manual_minutes_per_invoice": 8,
      "hourly_rate": 30,
      "software_monthly_cost": 400,
      "automation_minutes_per_invoice": 1.5,
      "error_rate_manual": 0.05,
      "error_rate_auto": 0.01,
      "error_cost": 50,
      "implementation_cost": 400
    }
  - Response JSON:
    {
      "manualCost": number,
      "automatedCost": number,
      "manualErrorCost": number,
      "autoErrorCost": number,
      "totalManual": number,
      "totalAutomated": number,
      "savings": number,
      "roi": number,
      "paybackMonths": number
    }

- GET /api/scenarios
  - Returns list of saved scenarios (id, created_at, name)

- GET /api/scenarios/:id
  - Returns a single saved scenario (inputs + results)

- POST /api/scenarios
  - Same body as /api/calc with optional "name"
  - Saves to DB and returns new id and results

Frontend UI Notes
- RoiForm.jsx: Controlled inputs for the fields above; submit calls POST /api/calc; second action POST /api/scenarios to persist.
- RoiCharts.jsx: Use Recharts LineChart/BarChart.
  - Chart ideas:
    - Monthly Cost Comparison: Bar chart (Total Manual vs Total Automated)
    - Cumulative Payback: Line chart showing cumulative savings across N months until paybackMonths
- Keep validation light in the client; the server performs schema validation via Zod.

Styling
- Tailwind recommended classes:
  - Container: "max-w-5xl mx-auto p-6"
  - Layout: "grid grid-cols-1 md:grid-cols-2 gap-6"
  - Inputs: "field flex flex-col gap-1" or Tailwind UI classes
  - Buttons: "inline-flex items-center justify-center rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
- Color palette (simple, high-contrast):
  - Primary: blue-600
  - Neutrals: slate-900, slate-600, slate-200, white

Testing Checklist
- Try different invoice volumes and time assumptions; confirm savings increase as automation time decreases.
- Edge cases: zero invoices, zero costs, large volumes (10k+).
- Negative inputs should be rejected by server validation.
- Verify paybackMonths decreases as savings grow.

Deployment Notes
- SQLite is file-based; ensure writable disk for DATABASE_URL path.
- For serverless targets that don’t permit SQLite, switch to hosted PostgreSQL while keeping the same schema shape.

License
- MIT (or your choice)

Attribution
- Built with React, Vite, Tailwind CSS, Recharts, Express, and SQLite.


