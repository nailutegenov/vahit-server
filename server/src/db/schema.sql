-- ============================================
--  Vahit AutoElektrik — схема базы данных
-- ============================================

-- Пользователи
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(20) NOT NULL DEFAULT 'worker',  -- admin | manager | worker
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Специалисты (персонал)
CREATE TABLE IF NOT EXISTS specialists (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  role        VARCHAR(100),
  phone       VARCHAR(30),
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Автомобили / заявки
CREATE TABLE IF NOT EXISTS cars (
  id              SERIAL PRIMARY KEY,
  plate           VARCHAR(20) NOT NULL UNIQUE,
  brand           VARCHAR(80) NOT NULL,
  model           VARCHAR(80),
  year            SMALLINT,
  color           VARCHAR(50),
  owner           VARCHAR(120),
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  -- active | inwork | service | inactive
  reason          TEXT,
  specialist_id   INTEGER REFERENCES specialists(id) ON DELETE SET NULL,
  date_in         DATE,
  date_out        DATE,
  price_est       NUMERIC(12,2),
  price_act       NUMERIC(12,2),
  note            TEXT,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_cars_plate   ON cars(plate);
CREATE INDEX IF NOT EXISTS idx_cars_status  ON cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_date_in ON cars(date_in);

-- Автообновление updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cars_updated_at ON cars;

CREATE TRIGGER cars_updated_at
BEFORE UPDATE ON cars
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- Администратор по умолчанию (пароль: admin123)
-- bcrypt hash сгенерирован для "admin123"
INSERT INTO users (name, email, password, role)
VALUES ('Администратор', 'admin@vahit.local',
  'admin1234','admin')
ON CONFLICT (email) DO NOTHING;
