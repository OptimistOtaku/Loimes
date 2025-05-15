import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = 'your_secret_key_here'; // Change this in production

// Only allow these usernames to register
const ALLOWED_USERS = ['adi padi', 'rui pui']; // <-- Set your usernames here

// SQLite database setup
let db;
(async () => {
  db = await open({
    filename: './envelopes.db',
    driver: sqlite3.Database
  });
  await db.run(`CREATE TABLE IF NOT EXISTS envelopes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`);
  await db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);
})();

app.use(cors());
app.use(bodyParser.json());

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

// Register (only allowed usernames)
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (!ALLOWED_USERS.includes(username)) return res.status(403).json({ error: 'Registration not allowed for this username' });
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await db.run('INSERT INTO users (username, password) VALUES (?, ?)', username, hashedPassword);
    res.status(201).json({ message: 'User registered' });
  } catch (e) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db.get('SELECT * FROM users WHERE username = ?', username);
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ username: user.username, id: user.id }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token });
});

// Get all envelopes/messages (auth required)
app.get('/api/envelopes', authenticateToken, async (req, res) => {
  const envelopes = await db.all('SELECT * FROM envelopes ORDER BY id DESC');
  res.json(envelopes);
});

// Add a new envelope/message (auth required)
app.post('/api/envelopes', authenticateToken, async (req, res) => {
  const { sender, content } = req.body;
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
  const envelope = {
    id: result.lastID,
    sender,
    content,
    createdAt,
  };
  res.status(201).json(envelope);
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
