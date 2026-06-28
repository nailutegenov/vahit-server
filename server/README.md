# VA AutoElektrik — Серверная часть

## Стек технологий
- **Node.js** + **Express** — REST API
- **PostgreSQL** — база данных
- **WebSocket (ws)** — real-time синхронизация
- **JWT** — авторизация
- **bcryptjs** — хэширование паролей

## Установка и запуск

### 1. Установить PostgreSQL
```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib

# macOS (Homebrew)
brew install postgresql
brew services start postgresql
```

### 2. Создать базу данных
```bash
sudo -u postgres psql
CREATE DATABASE vahit_auto;
CREATE USER vahit_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE vahit_auto TO vahit_user;
\q
```

### 3. Настроить переменные окружения
```bash
cp .env.example .env
# Отредактируй .env — укажи данные своей БД и секретный ключ JWT
```

### 4. Установить зависимости и запустить
```bash
npm install
npm start
# или для разработки:
npm run dev
```

### 5. Проверить работу
Открой в браузере: http://localhost:3000/health
Ответ: {"status":"ok","time":"..."}

## API Endpoints

### Авторизация
| Метод | URL | Описание |
|---|---|---|
| POST | /api/auth/register | Регистрация |
| POST | /api/auth/login | Вход |
| GET  | /api/auth/me | Текущий пользователь |

### Автомобили
| Метод | URL | Описание |
|---|---|---|
| GET    | /api/cars          | Список (поиск: ?q=..., ?status=...) |
| GET    | /api/cars/:id      | Одна запись |
| POST   | /api/cars          | Создать |
| PUT    | /api/cars/:id      | Обновить |
| DELETE | /api/cars/:id      | Удалить |

### Специалисты
| Метод | URL | Описание |
|---|---|---|
| GET    | /api/specialists      | Список |
| POST   | /api/specialists      | Создать (manager/admin) |
| PUT    | /api/specialists/:id  | Обновить (manager/admin) |
| DELETE | /api/specialists/:id  | Удалить (manager/admin) |

### Пользователи (только admin)
| Метод | URL | Описание |
|---|---|---|
| GET    | /api/users           | Список |
| PUT    | /api/users/:id/role  | Изменить роль |
| DELETE | /api/users/:id       | Удалить |

## Роли пользователей
- **admin** — полный доступ
- **manager** — управление специалистами + все операции с авто
- **worker** — добавление авто, редактирование только своих записей

## Деплой на сервер (VPS/Ubuntu)

```bash
# Установить Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Установить PM2 для автозапуска
npm install -g pm2
pm2 start src/index.js --name vahit-server
pm2 startup
pm2 save

# Nginx как обратный прокси
sudo apt install nginx
# Настрой /etc/nginx/sites-available/vahit
```

## Аккаунт по умолчанию
- Email: `admin@vahit.local`
- Пароль: `admin123`
- Роль: `admin`

⚠️ Смени пароль после первого входа!
