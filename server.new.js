import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here';

// Only allow these usernames to register
const ALLOWED_USERS = ['adi padi', 'rui pui'];

// SQLite database setup with auto-reconnect
async function getDB() {
  try {
    const db = await open({
      filename: '/tmp/envelopes.db',
      driver: sqlite3.Database
    });
    
    // Create tables if they don't exist
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
    
    return db;
  } catch (err) {
    console.error('Database error:', err);
    throw err;
  }
}

// Initialize DB connection
let db;
(async () => {
  db = await getDB();
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
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (!ALLOWED_USERS.includes(username)) return res.status(403).json({ error: 'Registration not allowed for this username' });
    
    // Ensure DB connection
    if (!db) db = await getDB();
    
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.run('INSERT INTO users (username, password) VALUES (?, ?)', username, hashedPassword);
    res.status(201).json({ message: 'User registered' });
  } catch (e) {
    console.error('Registration error:', e);
    res.status(400).json({ error: 'Username already exists' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Ensure DB connection
    if (!db) db = await getDB();
    
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

// Get all envelopes/messages (auth required)
app.get('/api/envelopes', authenticateToken, async (req, res) => {
  try {
    // Ensure DB connection
    if (!db) db = await getDB();
    
    const envelopes = await db.all('SELECT * FROM envelopes ORDER BY id DESC');
    res.json(envelopes);
  } catch (e) {
    console.error('Get envelopes error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a new envelope/message (auth required)
app.post('/api/envelopes', authenticateToken, async (req, res) => {
  try {
    const { sender, content } = req.body;
    if (!sender || !content) {
      return res.status(400).json({ error: 'Sender and content required' });
    }
    
    // Ensure DB connection
    if (!db) db = await getDB();
    
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start server if not running in Vercel
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

export default app;
