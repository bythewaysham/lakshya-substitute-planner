require('dotenv').config();

const express = require('express');
const path = require('node:path');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Set it to your Supabase PostgreSQL connection string in .env.');
}

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(express.json({ limit: '1mb' }));

app.get('/api/state', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT public.load_planner_state() AS state');
    res.json({ state: rows[0].state });
  } catch (error) {
    next(error);
  }
});

app.put('/api/state', async (req, res, next) => {
  const state = req.body?.state;
  if (
    !state ||
    typeof state !== 'object' ||
    Array.isArray(state) ||
    !Array.isArray(state.periods) ||
    !Array.isArray(state.teachers) ||
    !state.abs ||
    typeof state.abs !== 'object' ||
    Array.isArray(state.abs) ||
    !state.asg ||
    typeof state.asg !== 'object' ||
    Array.isArray(state.asg)
  ) {
    return res.status(400).json({ error: 'Invalid planner state.' });
  }

  try {
    await pool.query('SELECT public.save_planner_state($1::jsonb)', [JSON.stringify(state)]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
for (const filename of ['app.js', 'data.js', 'style.css']) {
  app.get(`/${filename}`, (req, res) => res.sendFile(path.join(__dirname, filename)));
}

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  const missingSchema = error.code === '42883' || error.code === '42P01';
  const message = error.status === 400
    ? 'Invalid planner data.'
    : missingSchema
      ? 'Database schema is missing. Run the latest schema.sql in Supabase SQL Editor.'
      : 'Database request failed. Check the server logs and DATABASE_URL.';
  res.status(error.status || 500).json({ error: message });
});

async function start() {
  await pool.query('SELECT 1');
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  const server = app.listen(port, host, () => {
    console.log(`Substitute Planner running on ${host}:${port}`);
  });

  const shutdown = () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch(error => {
  console.error('Could not start the planner server:', error);
  process.exitCode = 1;
});
