require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const http    = require('http');
const { WebSocketServer } = require('ws');
const pool    = require('./db/pool');
const fs      = require('fs');
const path    = require('path');

const app    = express();
const server = http.createServer(app);

// ── WebSocket сервер (для real-time синхронизации) ──
const wss = new WebSocketServer({ server });
const wsClients = new Set();
app.set('wsClients', wsClients);

wss.on('connection', (ws, req) => {
  wsClients.add(ws);
  console.log(`WS подключён. Клиентов: ${wsClients.size}`);
  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`WS отключён. Клиентов: ${wsClients.size}`);
  });
  ws.on('error', () => wsClients.delete(ws));
  // Пинг каждые 30 сек чтобы не закрылось соединение
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

setInterval(() => {
  wsClients.forEach(ws => {
    if (!ws.isAlive) { wsClients.delete(ws); return ws.terminate(); }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// ── Middleware ──
app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование запросов
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ── Роуты ──
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/cars',        require('./routes/cars'));
app.use('/api/specialists', require('./routes/specialists'));
app.use('/api/users',       require('./routes/users'));

// Healthcheck
app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

// Обработка ошибок
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// ── Инициализация БД и запуск ──
async function init() {
  // Применяем схему при первом запуске
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('✅ Схема БД применена');
 catch (e) {
  console.error('❌ Ошибка схемы БД:', e.message);
}

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`\n🚀 Сервер запущен: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    console.log(`📋 API: http://localhost:${PORT}/api\n`);
  });
}

init();
