const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD,
  database: 'job_tracker'
});

db.connect((err) => {
  if (err) {
    console.log('❌ DB Connection Failed:', err.message);
  } else {
    console.log('✅ MySQL Connected Successfully!');
  }
});

// GET all applications
app.get('/api/applications', (req, res) => {
  const sql = `
    SELECT a.app_id, c.company_name, a.role,
           a.date_applied, a.status,
           a.salary_range, a.notes
    FROM applications a
    JOIN companies c ON a.company_id = c.company_id
    ORDER BY a.date_applied DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// GET dashboard counts
app.get('/api/dashboard', (req, res) => {
  const sql = `SELECT status, COUNT(*) as count
               FROM applications GROUP BY status`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// GET all companies
app.get('/api/companies', (req, res) => {
  db.query('SELECT * FROM companies', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST add new application
app.post('/api/applications', (req, res) => {
  const { company_id, role, date_applied, status, salary_range, notes } = req.body;
  const sql = `INSERT INTO applications 
               (company_id, role, date_applied, status, salary_range, notes)
               VALUES (?, ?, ?, ?, ?, ?)`;
  db.query(sql, [company_id, role, date_applied, status, salary_range, notes], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '✅ Application added!', app_id: result.insertId });
  });
});

// PUT update status
app.put('/api/applications/:id', (req, res) => {
  const { status, notes } = req.body;
  const sql = `UPDATE applications SET status = ?, notes = ? WHERE app_id = ?`;
  db.query(sql, [status, notes, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '✅ Status updated!' });
  });
});

// DELETE application
app.delete('/api/applications/:id', (req, res) => {
  db.query('DELETE FROM interviews WHERE app_id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.query('DELETE FROM applications WHERE app_id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: '✅ Application deleted!' });
    });
  });
});

// ---- INTERVIEW ROUTES ----

// GET interviews for an application
app.get('/api/interviews/:app_id', (req, res) => {
  const sql = `SELECT * FROM interviews WHERE app_id = ? ORDER BY round_number ASC`;
  db.query(sql, [req.params.app_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST add interview round
app.post('/api/interviews', (req, res) => {
  const { app_id, round_number, interview_date, outcome } = req.body;
  const sql = `INSERT INTO interviews (app_id, round_number, interview_date, outcome)
               VALUES (?, ?, ?, ?)`;
  const dateValue = interview_date || null;
  db.query(sql, [app_id, round_number, dateValue, outcome], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '✅ Interview round added!', interview_id: result.insertId });
  });
});

// DELETE interview round
app.delete('/api/interviews/:id', (req, res) => {
  db.query('DELETE FROM interviews WHERE interview_id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '✅ Interview round deleted!' });
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});