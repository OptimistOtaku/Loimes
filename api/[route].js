import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}
const ALLOWED_USERS = ['adi padi', 'rui pui'];

// SQLite database setup
async function getDB() {
  return await open({
    filename: '/tmp/envelopes.db',
    driver: sqlite3.Database
  }).then(async (db) => {
    await db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )`);
    await db.run(`CREATE TABLE IF NOT EXISTS envelopes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )`);
    return db;
  });
}

// Verify JWT token
async function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) reject(err);
      else resolve(user);
    });
  });
}

// Parse request body
async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const data = Buffer.concat(chunks).toString();
  return JSON.parse(data);
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Extract route from URL
  const route = req.url.replace(/^\/api\//, '');

  try {
    const db = await getDB();

    // Handle registration
    if (route === 'register' && req.method === 'POST') {
      const { username, password } = await parseBody(req);
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }
      if (!ALLOWED_USERS.includes(username)) {
        return res.status(403).json({ error: 'Registration not allowed for this username' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await db.run('INSERT INTO users (username, password) VALUES (?, ?)', username, hashedPassword);
      return res.status(201).json({ message: 'User registered' });
    }

    // Handle login
    if (route === 'login' && req.method === 'POST') {
      const { username, password } = await parseBody(req);
      const user = await db.get('SELECT * FROM users WHERE username = ?', username);
      if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ username: user.username, id: user.id }, JWT_SECRET, { expiresIn: '1d' });
      return res.status(200).json({ token });
    }

    // Handle protected routes
    if (route === 'envelopes') {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      try {
        await verifyToken(token);
      } catch (e) {
        return res.status(403).json({ error: 'Invalid token' });
      }

      // GET envelopes
      if (req.method === 'GET') {
        const envelopes = await db.all('SELECT * FROM envelopes ORDER BY id DESC');
        return res.status(200).json(envelopes);
      }

      // POST new envelope
      if (req.method === 'POST') {
        const { sender, content } = await parseBody(req);
        if (!sender || !content) {
          return res.status(400).json({ error: 'Sender and content required' });
        }

        const createdAt = new Date().toISOString();
        const result = await db.run(
          'INSERT INTO envelopes (sender, content, createdAt) VALUES (?, ?, ?)',
          sender,
          content,
          createdAt
        );

        return res.status(201).json({
          id: result.lastID,
          sender,
          content,
          createdAt
        });
      }
    }

    // If no route matches
    return res.status(404).json({ error: 'Not found' });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
