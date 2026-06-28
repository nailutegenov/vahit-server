const router = require('express').Router();
const pool   = require('../db/pool');
const bcrypt = require('bcryptjs');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/users  (только admin)
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

// PUT /api/users/:id/role  — смена роли
router.put('/:id/role', authMiddleware, adminOnly, async (req, res) => {
  const { role } = req.body;
  if (!['admin','manager','worker'].includes(role))
    return res.status(400).json({ error: 'Недопустимая роль' });
  try {
    const { rows } = await pool.query(
      'UPDATE users SET role=$1 WHERE id=$2 RETURNING id,name,email,role',
      [role, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найден' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

// DELETE /api/users/:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'Нельзя удалить себя' });
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

module.exports = router;
