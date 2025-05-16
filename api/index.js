import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here';
const ALLOWED_USERS = ['adi padi', 'rui pui'];

// SQLite database setup
let db = null;
async function getDB() {
  if (!db) {
    db = await open({
      filename: '/tmp/envelopes.db',
      driver: sqlite3.Database
    });
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
  }
  return db;
}

const handler = express();
handler.use(cors());
handler.use(bodyParser.json());

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Register endpoint
handler.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (!ALLOWED_USERS.includes(username)) return res.status(403).json({ error: 'Registration not allowed for this username' });
    
    const db = await getDB();
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.run('INSERT INTO users (username, password) VALUES (?, ?)', username, hashedPassword);
    res.status(201).json({ message: 'User registered' });
  } catch (e) {
    console.error('Registration error:', e);
    res.status(400).json({ error: 'Username already exists' });
  }
});

// Login endpoint
handler.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = await getDB();
    const user = await db.get('SELECT * FROM users WHERE username = ?', username);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ username: user.username, id: user.id }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get envelopes endpoint
handler.get('/api/envelopes', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    const envelopes = await db.all('SELECT * FROM envelopes ORDER BY id DESC');
    res.json(envelopes);
  } catch (e) {
    console.error('Get envelopes error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add envelope endpoint
handler.post('/api/envelopes', authenticateToken, async (req, res) => {
  try {
    const { sender, content } = req.body;
    if (!sender || !content) {
      return res.status(400).json({ error: 'Sender and content required' });
    }
    
    const db = await getDB();
    const createdAt = new Date().toISOString();
    const result = await db.run(
      'INSERT INTO envelopes (sender, content, createdAt) VALUES (?, ?, ?)',
      sender,
      content,
      createdAt
    );
    
    const envelope = {
      id: result.lastID,
      sender,
      content,
      createdAt,
    };
    res.status(201).json(envelope);
  } catch (e) {
    console.error('Add envelope error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default handler;
