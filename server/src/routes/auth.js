const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Заполните все поля' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Пароль минимум 6 символов' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'worker') RETURNING id, name, email, role`,
      [name.trim(), email.toLowerCase().trim(), hash]
    );
    const user = rows[0];
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET, { expiresIn: '30d' }
    );
    res.json({ token, user });
  } catch (e) {
    if (e.code === '23505')
      return res.status(409).json({ error: 'Email уже зарегистрирован' });
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Введите email и пароль' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Неверный email или пароль' });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET, { expiresIn: '30d' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;

// ВРЕМЕННЫЙ МАРШРУТ ДЛЯ СБРОСА ПАРОЛЯ (после использования удалить!)
router.get('/reset-admin', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');

    const newPassword = 'admin123';
    const hash = await bcrypt.hash(newPassword, 10);

    const result = await pool.query(
      `UPDATE users
       SET password = $1, role = 'admin'
       WHERE email = 'admin@vahit.local'
       RETURNING id, email, role`,
      [hash]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Пользователь admin@vahit.local не найден'
      });
    }

    res.json({
      success: true,
      email: 'admin@vahit.local',
      password: newPassword,
      message: 'Пароль администратора успешно изменён'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});
