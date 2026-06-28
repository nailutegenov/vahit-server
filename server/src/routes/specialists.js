const router = require('express').Router();
const pool   = require('../db/pool');
const { authMiddleware, managerOrAdmin } = require('../middleware/auth');

function broadcast(app, event, data) {
  const clients = app.get('wsClients');
  if (!clients) return;
  const msg = JSON.stringify({ event, data });
  clients.forEach(ws => { try { ws.send(msg); } catch {} });
}

// GET /api/specialists
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM specialists WHERE active=true ORDER BY name'
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

// POST /api/specialists
router.post('/', authMiddleware, managerOrAdmin, async (req, res) => {
  const { name, role, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'Имя обязательно' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO specialists (name,role,phone) VALUES ($1,$2,$3) RETURNING *',
      [name.trim(), role||null, phone||null]
    );
    broadcast(req.app, 'specialist:created', rows[0]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

// PUT /api/specialists/:id
router.put('/:id', authMiddleware, managerOrAdmin, async (req, res) => {
  const { name, role, phone } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE specialists SET name=$1,role=$2,phone=$3 WHERE id=$4 RETURNING *',
      [name.trim(), role||null, phone||null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найден' });
    broadcast(req.app, 'specialist:updated', rows[0]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

// DELETE /api/specialists/:id
router.delete('/:id', authMiddleware, managerOrAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE specialists SET active=false WHERE id=$1', [req.params.id]);
    broadcast(req.app, 'specialist:deleted', { id: parseInt(req.params.id) });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

module.exports = router;
