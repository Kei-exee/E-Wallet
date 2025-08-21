
import express from 'express';   // Herramienta para crear el servidor
import cors from 'cors';         // Permisos para que una web diferente pueda llamar al servidor
import bcrypt from 'bcryptjs';   // Cifrar contraseñas de forma segura
import db from './db.js';        // Conexión con la base de datos

const app = express();

// Habilitamos permisos basicos y que el servidor entienda JSON
app.use(cors()); //en desarrollo
app.use(express.json());

// Pequeña ayuda para preparar consultas a la base de datos
const q = (sql) => db.prepare(sql);

/**
 * ENDPOINT: Revisar salud del servidor
 * Método: GET
 * Ruta: /health
 * Qué hace: responde con { ok: true } para indicar que el servidor está activo.
 */
app.get('/health', (req, res) => res.json({ ok: true }));

/**
 * ENDPOINT: Registro de usuario
 * Método: POST
 * Ruta: /api/register
 *
 * Qué espera recibir en el cuerpo (JSON):
 * {
 *   "name": "nombre",
 *   "email": "@.com",
 *   "password": "password"
 * }

 * Qué hace por dentro:
 * 1) Revisa que vengan nombre, correo y contraseña.
 * 2) Convierte el correo a minúsculas para evitar duplicados.
 * 3) Cifra la contraseña para guardarla segura.
 * 4) Crea el usuario en la base de datos.
 * 5) Crea una tarjeta por defecto llamada "Mi tarjeta".
 *
 * Respuesta exitosa:
 * { "id": <id del usuario>, "name": "...", "email": "..." }
 *
 * Posibles errores:
 * - 400 Faltan datos
 * - 409 Email ya registrado
 * - 500 Error al registrar
 */
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body || {};

  // Validación simple: si falta algo, avisamos
  if (!name || !email || !password) return res.status(400).json({ error: 'Faltan datos' });

  try {
    // Ciframos la contraseña. El 10 indica el nivel de seguridad del cifrado
    const hash = bcrypt.hashSync(password, 10);

    // Guardamos el usuario con el correo en minusculas
    const info = q('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(
      name,
      email.toLowerCase(),
      hash
    );

    // Después de crear el usuario, le creamos una tarjeta por defecto
    q('INSERT INTO cards (user_id, name) VALUES (?, ?)').run(info.lastInsertRowid, 'Mi tarjeta');

    // Devolvemos datos básicos. Nunca devolvemos la contraseña
    res.json({ id: info.lastInsertRowid, name, email: email.toLowerCase() });
  } catch (e) {
    // Si el correo ya existe, la base de datos lo indica como UNIQUE
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Email ya registrado' });
    // Cualquier otro error se informa como error interno
    res.status(500).json({ error: 'Error al registrar' });
  }
});

/**
 * ENDPOINT: Iniciar sesión
 * Método: POST
 * Ruta: /api/login
 *
 * Qué espera recibir:
 * {
 *  "email": "@.com",
 *   "password": "password"
 * }
 *
 * Qué hace por dentro:
 * 1) Revisa que vengan correo y contraseña.
 * 2) Busca al usuario por correo.
 * 3) Compara la contraseña que mandas con la cifrada que está guardada.
 *
 * Si todo va bien, responde con los datos básicos del usuario.
 * Errores posibles:
 * - 400 Faltan datos
 * - 401 Usuario no existe
 * - 401 Contraseña incorrecta
 */
app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};

  // Validación básica
  if (!email || !password) return res.status(400).json({ error: 'Faltan datos' });

  // Buscamos al usuario en la base de datos por su correo en minúsculas
  const user = q('SELECT id, name, email, password_hash FROM users WHERE email = ?').get(email.toLowerCase());

  // Si no lo encontramos, lo indicamos
  if (!user) return res.status(401).json({ error: 'Usuario no existe' });

  // Comparamos la contraseña que mandó el cliente con el cifrado guardado
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' });

  // Si coincide, devolvemos datos básicos. Esto permite que el front guarde la sesión
  res.json({ id: user.id, name: user.name, email: user.email });
});

/**
 * ENDPOINT: Crear una tarjeta adicional
 * Método: POST
 * Ruta: /api/cards
 *
 * Para qué sirve: crear otro "bolsillo" o "monedero" para el mismo usuario.
 *
 * Qué espera recibir:
 * {
 *   "user_id": <id del usuario>,
 *   "name": "Nombre de la tarjeta"
 * }
 *
 * Respuesta exitosa:
 * { "id": <id de la tarjeta> }
 *
 * Posibles errores:
 * - 400 Faltan datos
 * - 500 No se pudo crear la card
 */
app.post('/api/cards', (req, res) => {
  const { user_id, name } = req.body || {};

  // Validación: necesitamos el usuario dueño de la tarjeta y el nombre de la tarjeta
  if (!user_id || !name) return res.status(400).json({ error: 'Faltan datos' });

  try {
    const info = q('INSERT INTO cards (user_id, name) VALUES (?, ?)').run(user_id, name);
    res.json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo crear la card' });
  }
});

/**
 * ENDPOINT: Obtener una tarjeta con sus transacciones
 * Método: GET
 * Ruta: /api/cards/:id
 *
 * Cómo se usa: reemplaza :id con el número de la tarjeta, por ejemplo /api/cards/10
 *
 * Qué hace:
 * 1) Busca la tarjeta.
 * 2) Trae todas sus transacciones ordenadas de la más reciente a la más antigua.
 *
 * Respuesta exitosa:
 * {
 *   "card": { ...datos de la tarjeta... },
 *   "transactions": [ ...lista de movimientos... ]
 * }
 *
 * Posible error:
 * - 404 Card no existe
 */
app.get('/api/cards/:id', (req, res) => {
  const id = Number(req.params.id);

  // Buscamos la tarjeta
  const card = q('SELECT * FROM cards WHERE id = ?').get(id);
  if (!card) return res.status(404).json({ error: 'Card no existe' });

  // Traemos sus transacciones, primero las más nuevas
  const txs = q('SELECT * FROM transactions WHERE card_id = ? ORDER BY created_at DESC, id DESC').all(id);

  // Devolvemos la tarjeta y su historial
  res.json({ card, transactions: txs });
});

/**
 * ENDPOINT: Crear una transacción
 * Método: POST
 * Ruta: /api/transactions
 *
 * Para qué sirve: registrar un movimiento de dinero en una tarjeta.
 * Puede ser un ingreso o un gasto.
 *
 * Qué espera recibir:
 * {
 *   "card_id": <id de la tarjeta>,
 *   "type": "ingreso" o "gasto",
 *   "amount": 123.45
 * }
 *
 * Respuesta exitosa:
 * { "id": <id de la transacción> }
 *
 * Posibles errores:
 * - 400 Faltan datos
 * - 400 Saldo insuficiente (si las reglas internas lo detectan para un gasto)
 * - 500 No se pudo crear la transacción
 */
app.post('/api/transactions', (req, res) => {
  const { card_id, type, amount } = req.body || {};

  // Validación: necesitamos tarjeta, tipo y monto
  if (!card_id || !type || !amount) return res.status(400).json({ error: 'Faltan datos' });

  try {
    // Guardamos el movimiento. Convertimos amount a número por seguridad
    const info = q('INSERT INTO transactions (card_id, type, amount) VALUES (?, ?, ?)').run(
      card_id,
      type,
      Number(amount)
    );

    res.json({ id: info.lastInsertRowid });
  } catch (e) {
    // Si internamente alguna regla pone "Saldo insuficiente", lo comunicamos tal cual
    const msg = String(e.message || '');
    if (msg.includes('Saldo insuficiente')) return res.status(400).json({ error: 'Saldo insuficiente' });

    // Cualquier otra cosa es un error interno
    res.status(500).json({ error: 'No se pudo crear la transacción' });
  }
});

/**
 * ARRANQUE DEL SERVIDOR
 *
 * El servidor escucha en el puerto 3000 por defecto, o en el que indique
 * la variable de entorno PORT si está configurada.
 *
 * Ejemplo de mensaje al iniciar:
 * "Servidor escuchando en http://localhost:3000"
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en http://localhost:${PORT}`));




