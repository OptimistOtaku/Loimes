import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here';
const ALLOWED_USERS = ['adi padi', 'rui pui'];

// SQLite database setup
async function getDB() {
  return await open({
    filename: '/tmp/envelopes.db',
    driver: sqlite3.Database
  });
}

// Initialize database tables
async function initDB() {
  const db = await getDB();
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
}

// Serverless function handler
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const db = await initDB();

    // Handle login
    if (req.method === 'POST' && req.url === '/api/login') {
      const { username, password } = req.body;
      
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

    // Handle registration
    if (req.method === 'POST' && req.url === '/api/register') {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      if (!ALLOWED_USERS.includes(username)) {
        return res.status(403).json({ error: 'Registration not allowed for this username' });
      }

      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.run('INSERT INTO users (username, password) VALUES (?, ?)', username, hashedPassword);
        return res.status(201).json({ message: 'User registered' });
      } catch (e) {
        console.error('Registration error:', e);
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    // If no route matches
    return res.status(404).json({ error: 'Not found' });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
