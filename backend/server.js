// server.js
// Backend mínimo para Login.js y script.js:
// - Registro de usuario
// - Login que emite JWT
// - /api/me protegido con token para recuperar el perfil

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db.js';

const app = express();
app.use(cors());           // CORS en desarrollo
app.use(express.json());   // parseo de JSON

// helper para consultas
const q = (sql) => db.prepare(sql);

// secreto para firmar tokens
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// middleware de autenticación con Bearer token
const auth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  const raw = scheme === 'Bearer' ? token : header;
  if (!raw) return res.status(401).json({ error: 'No autorizado' });

  try {
    const payload = jwt.verify(raw, JWT_SECRET);
    req.uid = payload.uid;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// Registro
// body: { name, email, password }
// devuelve: { id, name, email }
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Faltan datos' });

  try {
    const hash = bcrypt.hashSync(password, 10);
    const info = q('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(
      name,
      email.toLowerCase(),
      hash
    );
    res.json({ id: info.lastInsertRowid, name, email: email.toLowerCase() });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Email ya registrado' });
    res.status(500).json({ error: 'Error al registrar' });
  }
});

// Login
// body: { email, password }
// devuelve ok: { token, user: { id, name, email } }
app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Faltan datos' });

  const user = q('SELECT id, name, email, password_hash FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Usuario no existe' });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' });

  const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

// Perfil autenticado
// header: Authorization: Bearer <token>
// devuelve: { user }
app.get('/api/me', auth, (req, res) => {
  const user = q('SELECT id, name, email FROM users WHERE id = ?').get(req.uid);
  if (!user) return res.status(404).json({ error: 'Usuario no existe' });
  res.json({ user });
});

// Arranque
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en http://localhost:${PORT}`));
