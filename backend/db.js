// backend/db.js
// Conexión a SQLite y creación de tablas + triggers de negocio
// Materia: Bases de Datos / Backend con Node
// Objetivo: tener un almacenamiento local simple para usuarios, tarjetas y transacciones,
//           con reglas automáticas que protegen el saldo.

// 1) Importo better-sqlite3 porque es sincrónico y muy simple de usar en Node
import Database from 'better-sqlite3';

// 2) Abro/creo la base de datos en backend/wallet.db
//    uso process.cwd() para que funcione sin importar desde dónde ejecuto node
const db = new Database(`${process.cwd()}/backend/wallet.db`);

// 3) Activo WAL (Write-Ahead Logging) para mejorar concurrencia y evitar bloqueos largos
db.pragma('journal_mode = WAL');

// TIP opcional: también conviene activar llaves foráneas a nivel motor
// db.pragma('foreign_keys = ON'); // si lo activo, SQLite valida FK automáticamente

// ===============================
// Esquema: users, cards, transactions
// ===============================
//
// users: info básica del usuario. password_hash guarda el hash, nunca el password plano.
// cards: tarjeta virtual del usuario. manejo el saldo en enteros (centavos) para evitar decimales.
// transactions: movimientos de la tarjeta. type define si es ingreso o gasto.
//
// Nota: starting_balance y current_balance están en enteros. 10000 equivale a 100.00 en dinero real.

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
  starting_balance INTEGER NOT NULL DEFAULT 10000, -- saldo inicial en centavos
  current_balance INTEGER NOT NULL DEFAULT 10000,  -- saldo actual en centavos
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME','EXPENSE')), -- ingreso o gasto
  amount INTEGER NOT NULL CHECK (amount > 0),               -- monto en centavos, siempre positivo
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES cards(id)
);
`);

// ===============================
// Triggers de negocio
// ===============================
//
// Meta: que las reglas se cumplan aunque el programador se equivoque en el código.
// - prevent_overdraft: no permite insertar un gasto si no hay saldo suficiente.
// - apply_tx_after_insert: actualiza el saldo de la tarjeta después de insertar una transacción.
// - revert_tx_after_delete: si borro una transacción, revierte su efecto en el saldo.
//
// Beneficio: la integridad del saldo queda garantizada en la base de datos, no solo en el backend.

db.exec(`
-- Regla: no permitir egresos que dejen saldo negativo
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

-- Al insertar una transacción, aplico su efecto al saldo de la tarjeta
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

-- Si borro una transacción, revierto su impacto en el saldo
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

// 4) Exporto la conexión para usarla en routers/servicios del backend
export default db;
