// backend/db.js
// Conexión a SQLite y bootstrap de tablas + triggers de negocio
import Database from 'better-sqlite3';

const db = new Database(`${process.cwd()}/backend/wallet.db`);
db.pragma('journal_mode = WAL');

// Tablas
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  starting_balance INTEGER NOT NULL DEFAULT 10000,
  current_balance INTEGER NOT NULL DEFAULT 10000,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME','EXPENSE')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES cards(id)
);
`);

// Regla: no permitir egresos que dejen saldo negativo
db.exec(`
CREATE TRIGGER IF NOT EXISTS prevent_overdraft
BEFORE INSERT ON transactions
FOR EACH ROW
WHEN NEW.type = 'EXPENSE'
BEGIN
  SELECT CASE
    WHEN (SELECT current_balance FROM cards WHERE id = NEW.card_id) < NEW.amount
    THEN RAISE(ABORT, 'Saldo insuficiente')
  END;
END;

CREATE TRIGGER IF NOT EXISTS apply_tx_after_insert
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
  UPDATE cards
  SET current_balance = CASE
    WHEN NEW.type = 'INCOME'  THEN current_balance + NEW.amount
    WHEN NEW.type = 'EXPENSE' THEN current_balance - NEW.amount
  END
  WHERE id = NEW.card_id;
END;

CREATE TRIGGER IF NOT EXISTS revert_tx_after_delete
AFTER DELETE ON transactions
FOR EACH ROW
BEGIN
  UPDATE cards
  SET current_balance = CASE
    WHEN OLD.type = 'INCOME'  THEN current_balance - OLD.amount
    WHEN OLD.type = 'EXPENSE' THEN current_balance + OLD.amount
  END
  WHERE id = OLD.card_id;
END;
`);

export default db;
