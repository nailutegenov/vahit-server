const router = require('express').Router();
const pool   = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

// Broadcast helper — прикрепляется к app в index.js
function broadcast(app, event, data) {
  const clients = app.get('wsClients');
  if (!clients) return;
  const msg = JSON.stringify({ event, data });
  clients.forEach(ws => { try { ws.send(msg); } catch {} });
}

// GET /api/cars  — список с поиском и фильтром
router.get('/', authMiddleware, async (req, res) => {
  const { q = '', status = '' } = req.query;
  try {
    const { rows } = await pool.query(`
      SELECT c.*,
             s.name  AS specialist_name,
             s.role  AS specialist_role,
             u.name  AS created_by_name
      FROM cars c
      LEFT JOIN specialists s ON s.id = c.specialist_id
      LEFT JOIN users       u ON u.id = c.created_by
      WHERE ($1 = '' OR (
        c.plate  ILIKE $1 OR c.brand ILIKE $1 OR
        c.model  ILIKE $1 OR c.owner ILIKE $1 OR
        c.reason ILIKE $1 OR s.name  ILIKE $1
      ))
      AND ($2 = '' OR c.status = $2)
      ORDER BY c.created_at DESC
    `, [`%${q}%`, status]);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// GET /api/cars/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, s.name AS specialist_name, s.role AS specialist_role
      FROM cars c LEFT JOIN specialists s ON s.id = c.specialist_id
      WHERE c.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Не найден' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

// POST /api/cars
router.post('/', authMiddleware, async (req, res) => {
  const { plate,brand,model,year,color,owner,status,reason,
          specialist_id,date_in,date_out,price_est,price_act,note } = req.body;
  if (!plate || !brand) return res.status(400).json({ error: 'Номер и марка обязательны' });

  try {
    const { rows } = await pool.query(`
      INSERT INTO cars
        (plate,brand,model,year,color,owner,status,reason,
         specialist_id,date_in,date_out,price_est,price_act,note,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *`,
      [plate.toUpperCase().trim(),brand,model||null,year||null,color||null,
       owner||null,status||'active',reason||null,
       specialist_id||null,date_in||null,date_out||null,
       price_est||null,price_act||null,note||null,req.user.id]
    );
    const car = rows[0];
    broadcast(req.app, 'car:created', car);
    res.status(201).json(car);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Номер уже существует' });
    console.error(e); res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /api/cars/:id
router.put('/:id', authMiddleware, async (req, res) => {
  const { plate,brand,model,year,color,owner,status,reason,
          specialist_id,date_in,date_out,price_est,price_act,note } = req.body;
  try {
    const { rows } = await pool.query(`
      UPDATE cars SET
        plate=$1,brand=$2,model=$3,year=$4,color=$5,owner=$6,
        status=$7,reason=$8,specialist_id=$9,
        date_in=$10,date_out=$11,price_est=$12,price_act=$13,note=$14
      WHERE id=$15 RETURNING *`,
      [plate?.toUpperCase().trim(),brand,model||null,year||null,color||null,
       owner||null,status||'active',reason||null,specialist_id||null,
       date_in||null,date_out||null,price_est||null,price_act||null,
       note||null,req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найден' });
    broadcast(req.app, 'car:updated', rows[0]);
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Номер уже существует' });
    console.error(e); res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/cars/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM cars WHERE id=$1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Не найден' });
    broadcast(req.app, 'car:deleted', { id: rows[0].id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

module.exports = router;
